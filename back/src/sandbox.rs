//! ユーザーの C コードをコンパイル・実行するサンドボックス。
//!
//! 方式: gcc でネイティブコンパイルし、setrlimit(CPU/メモリ/ファイルサイズ)と
//! 実行タイムアウトで隔離する開発用サンドボックス。
//! WASM(clang --target=wasm32 + wasmtime)方式はこの環境にツールチェーンが
//! 無いため見送り、本番強化パスとして DESIGN.md に記録している。

use crate::stages::Stage;
use crate::trace::{self, TraceEvent};
use std::fs;
use std::os::unix::process::CommandExt;
use std::process::{Command, Stdio};
use std::time::Duration;
use tokio::time::timeout;

const GAME_H: &str = include_str!("../runtime/game.h");
const GAMELIB_C: &str = include_str!("../runtime/gamelib.c");
const MAX_CODE_BYTES: usize = 64 * 1024;
const COMPILE_TIMEOUT: Duration = Duration::from_secs(10);
const RUN_TIMEOUT: Duration = Duration::from_secs(3);

pub struct RunOutput {
    pub trace: Vec<TraceEvent>,
    pub cleared: bool,
}

/// ステージをランタイム(gamelib.c)が読むテキスト形式に変換する。
/// 迷路: "N W H startX startY dir(U/R/D/L) maxSteps" + 盤面行
/// 配列: "A n kind(S/D/R/M/m) maxSteps" + 値の行
fn stage_file(stage: &Stage) -> String {
    if let Some(puzzle) = &stage.puzzle {
        let kind = match puzzle.kind.as_str() {
            "sortDesc" => 'D',
            "reverse" => 'R',
            "maxLast" => 'M',
            "minFirst" => 'm',
            _ => 'S', // sort
        };
        let values: Vec<String> = puzzle.values.iter().map(|v| v.to_string()).collect();
        return format!(
            "A {} {} {}\n{}\n",
            puzzle.values.len(),
            kind,
            stage.max_steps,
            values.join(" ")
        );
    }
    let dir = match stage.start.dir.as_str() {
        "up" => 'U',
        "down" => 'D',
        "left" => 'L',
        _ => 'R',
    };
    let w = stage.rows.first().map(|r| r.len()).unwrap_or(0);
    let mut s = format!(
        "N {} {} {} {} {} {}\n",
        w,
        stage.rows.len(),
        stage.start.x,
        stage.start.y,
        dir,
        stage.max_steps
    );
    for row in &stage.rows {
        s.push_str(row);
        s.push('\n');
    }
    s
}

/// 子プロセスにリソース制限をかける(CPU 2秒 / メモリ 256MB / 書き込み 8MB)
fn apply_rlimits(cmd: &mut Command) {
    unsafe {
        cmd.pre_exec(|| {
            let set = |resource, limit: u64| {
                let rl = libc::rlimit {
                    rlim_cur: limit,
                    rlim_max: limit,
                };
                libc::setrlimit(resource, &rl);
            };
            set(libc::RLIMIT_CPU, 2);
            set(libc::RLIMIT_AS, 256 * 1024 * 1024);
            set(libc::RLIMIT_FSIZE, 8 * 1024 * 1024);
            set(libc::RLIMIT_NPROC, 16);
            Ok(())
        });
    }
}

pub async fn run(stage: &Stage, code: &str) -> Result<RunOutput, String> {
    if code.len() > MAX_CODE_BYTES {
        return Err("コードが大きすぎます(64KBまで)".into());
    }
    let dir = tempfile::tempdir().map_err(|e| format!("作業ディレクトリ作成失敗: {e}"))?;
    let path = dir.path();
    let user_c = path.join("user.c");
    fs::write(&user_c, code).map_err(|e| e.to_string())?;
    fs::write(path.join("game.h"), GAME_H).map_err(|e| e.to_string())?;
    fs::write(path.join("gamelib.c"), GAMELIB_C).map_err(|e| e.to_string())?;
    fs::write(path.join("stage.txt"), stage_file(stage)).map_err(|e| e.to_string())?;

    // コンパイル
    let mut compile = tokio::process::Command::new("gcc");
    compile
        .args(["user.c", "gamelib.c", "-o", "prog", "-std=c11", "-O1"])
        .current_dir(path)
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    let output = timeout(COMPILE_TIMEOUT, compile.output())
        .await
        .map_err(|_| "コンパイルがタイムアウトしました".to_string())?
        .map_err(|e| format!("gcc の起動に失敗: {e}"))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // 一時ディレクトリのパスを隠して読みやすくする
        let cleaned = stderr.replace(&format!("{}/", path.display()), "");
        let cleaned: String = cleaned.chars().take(4000).collect();
        return Err(format!("コンパイルエラー:\n{cleaned}"));
    }

    // 実行(トレースはファイル経由。ユーザーの printf は無視する)
    let trace_path = path.join("trace.txt");
    let mut cmd = tokio::process::Command::new(path.join("prog"));
    cmd.current_dir(path)
        .env_clear()
        .env("GAME_STAGE", path.join("stage.txt"))
        .env("GAME_TRACE", &trace_path)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    {
        // tokio::process::Command から std の Command を得て rlimit を設定
        let std_cmd = cmd.as_std_mut();
        apply_rlimits(std_cmd);
    }
    let run_out = timeout(RUN_TIMEOUT, cmd.output())
        .await
        .map_err(|_| "実行がタイムアウトしました(無限ループしていませんか?)".to_string())?
        .map_err(|e| format!("実行に失敗: {e}"))?;
    let status = run_out.status;

    let trace_text = fs::read_to_string(&trace_path).unwrap_or_default();
    let events = trace::parse(&trace_text)?;
    // 正常な終わり方(ゴール/達成/失敗判定/上限)で終わっていない異常終了はエラーとして返す
    let terminal = matches!(
        events.last(),
        Some(
            trace::TraceEvent::Goal { .. }
                | trace::TraceEvent::Solved {}
                | trace::TraceEvent::Unsolved {}
                | trace::TraceEvent::Crash { .. }
                | trace::TraceEvent::StepLimit { .. }
        )
    );
    if !terminal && !status.success() {
        // gamelib の die() は stderr に理由を書く(範囲外アクセス等)
        let stderr = String::from_utf8_lossy(&run_out.stderr);
        let reason: String = stderr.trim().chars().take(500).collect();
        return Err(match status.code() {
            // シグナル終了(SIGXCPU 等)は CPU 時間制限にかかったケースがほとんど
            None => "CPU時間の上限を超えました(無限ループしていませんか?)".to_string(),
            Some(_) if !reason.is_empty() => format!("実行時エラー: {reason}"),
            Some(c) => format!("実行時エラーで終了しました (exit: {c})"),
        });
    }
    let cleared = trace::is_goal(&events);
    Ok(RunOutput {
        trace: events,
        cleared,
    })
}
