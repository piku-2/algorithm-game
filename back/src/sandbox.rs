//! ユーザーの C コードをコンパイル・実行するサンドボックス。
//!
//! 方式: gcc でネイティブコンパイルし、setrlimit(CPU/メモリ/ファイルサイズ)と
//! 実行タイムアウトで隔離する開発用サンドボックス。
//! WASM(clang --target=wasm32 + wasmtime)方式はこの環境にツールチェーンが
//! 無いため見送り、本番強化パスとして DESIGN.md に記録している。

use crate::stages::Stage;
use crate::trace::{self, TraceEvent};
use serde::Serialize;
use std::fs;
use std::os::unix::process::CommandExt;
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::timeout;

const GAME_H: &str = include_str!("../runtime/game.h");
const GAMELIB_C: &str = include_str!("../runtime/gamelib.c");
const MAX_CODE_BYTES: usize = 64 * 1024;
const COMPILE_TIMEOUT: Duration = Duration::from_secs(10);
const RUN_TIMEOUT: Duration = Duration::from_secs(3);
/// stdout をキャプチャする上限(これを超えたら打ち切る)
const MAX_STDOUT_BYTES: usize = 1024 * 1024;

pub struct RunOutput {
    pub trace: Vec<TraceEvent>,
    pub cleared: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IoCase {
    pub name: String,
    pub pass: bool,
    pub input: String,
    pub expected: String,
    pub actual: String,
}

pub struct IoRunOutput {
    pub cases: Vec<IoCase>,
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

/// 標準入出力問題(IO問題)を実行・判定する。gamelib は使わずユーザーコード単体をコンパイルし、
/// samples → hiddenTests の順に stdin/stdout でケース判定する。
pub async fn run_io(stage: &Stage, code: &str) -> Result<IoRunOutput, String> {
    let io = stage
        .io
        .as_ref()
        .ok_or_else(|| "このステージはIO問題ではありません".to_string())?;
    if code.len() > MAX_CODE_BYTES {
        return Err("コードが大きすぎます(64KBまで)".into());
    }
    let dir = tempfile::tempdir().map_err(|e| format!("作業ディレクトリ作成失敗: {e}"))?;
    let path = dir.path();
    let user_c = path.join("user.c");
    fs::write(&user_c, code).map_err(|e| e.to_string())?;

    // コンパイル(gamelib/game.h/stage.txt は不要)
    let mut compile = tokio::process::Command::new("gcc");
    compile
        .args(["user.c", "-o", "prog", "-std=c11", "-O1", "-lm"])
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

    let prog = path.join("prog");
    let mut cases = Vec::new();
    let mut all_pass = true;

    for (i, sample) in io.samples.iter().enumerate() {
        let actual = exec_io_case(&prog, &sample.input).await;
        let pass = normalize_output(&actual) == normalize_output(&sample.output);
        all_pass &= pass;
        cases.push(IoCase {
            name: format!("入力例 {}", i + 1),
            pass,
            input: sample.input.clone(),
            expected: sample.output.clone(),
            actual,
        });
    }
    for (i, t) in io.hidden_tests.iter().enumerate() {
        let actual = exec_io_case(&prog, &t.input).await;
        let pass = normalize_output(&actual) == normalize_output(&t.output);
        all_pass &= pass;
        cases.push(IoCase {
            name: format!("テスト {}", i + 1),
            pass,
            input: t.input.clone(),
            expected: t.output.clone(),
            actual,
        });
    }

    Ok(IoRunOutput {
        cleared: all_pass,
        cases,
    })
}

/// 各行の末尾空白を除去し、末尾の空行を除去して比較用に正規化する。
fn normalize_output(s: &str) -> String {
    let mut lines: Vec<&str> = s.lines().map(|l| l.trim_end()).collect();
    while lines.last().is_some_and(|l| l.is_empty()) {
        lines.pop();
    }
    lines.join("\n")
}

/// 1ケース分の実行。stdin に input を書き込み、stdout をキャプチャして返す。
/// 実行時エラー/タイムアウト/シグナル終了の場合は、そのままエラー説明文字列を返す
/// (呼び出し側で期待値と比較すれば自然に不合格になる)。
async fn exec_io_case(prog: &Path, input: &str) -> String {
    let mut cmd = tokio::process::Command::new(prog);
    cmd.env_clear()
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    {
        let std_cmd = cmd.as_std_mut();
        apply_rlimits(std_cmd);
    }
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => return format!("(実行の起動に失敗しました: {e})"),
    };
    let mut stdin = match child.stdin.take() {
        Some(s) => s,
        None => return "(実行に失敗しました: stdin を取得できません)".to_string(),
    };
    let mut stdout = match child.stdout.take() {
        Some(s) => s,
        None => return "(実行に失敗しました: stdout を取得できません)".to_string(),
    };
    let input_owned = input.to_string();
    let write_task = tokio::spawn(async move {
        let _ = stdin.write_all(input_owned.as_bytes()).await;
        // stdin はここでドロップされ EOF が伝わる
    });

    let result = timeout(RUN_TIMEOUT, async {
        let mut buf = Vec::new();
        let mut chunk = [0u8; 8192];
        loop {
            match stdout.read(&mut chunk).await {
                Ok(0) => break,
                Ok(n) => {
                    buf.extend_from_slice(&chunk[..n]);
                    if buf.len() > MAX_STDOUT_BYTES {
                        buf.truncate(MAX_STDOUT_BYTES);
                        break;
                    }
                }
                Err(_) => break,
            }
        }
        let status = child.wait().await;
        (buf, status)
    })
    .await;
    let _ = write_task.await;

    match result {
        Ok((buf, Ok(status))) => {
            if status.success() {
                String::from_utf8_lossy(&buf).to_string()
            } else {
                match status.code() {
                    // シグナル終了(SIGXCPU 等)はほぼ CPU 時間上限超過
                    None => "(実行がタイムアウトしました)".to_string(),
                    Some(c) => format!("(実行時エラーで終了しました (exit: {c}))"),
                }
            }
        }
        Ok((_, Err(e))) => format!("(実行に失敗しました: {e})"),
        Err(_) => "(実行がタイムアウトしました)".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::stages::{IoCaseSpec, IoProblem, IoSample, Start, Stage};

    /// 「2 つの整数 A, B を読み、A+B を出力する」という単純な IO ステージ。
    /// 古いデータ(io フィールドを持たない)がロードできることは stages 側で
    /// 全フィールド Optional として保証されているので、ここでは io ステージ自体の
    /// 実行パスを検証する。
    fn sum_stage() -> Stage {
        Stage {
            id: "io-sum".into(),
            name: "AとBの和".into(),
            mode: "code".into(),
            rows: vec![],
            start: Start {
                x: 0,
                y: 0,
                dir: "right".into(),
            },
            allowed_blocks: vec![],
            star_thresholds: [0, 0],
            max_steps: 0,
            hint: None,
            puzzle: None,
            template: None,
            statement: Some("2つの整数 A, B を読み込み、A+B を出力してください。".into()),
            io: Some(IoProblem {
                input_format: "A B".into(),
                output_format: "A+B".into(),
                constraints: "-1000 <= A, B <= 1000".into(),
                samples: vec![
                    IoSample {
                        input: "1 2\n".into(),
                        output: "3\n".into(),
                        note: None,
                    },
                    IoSample {
                        input: "10 20\n".into(),
                        output: "30\n".into(),
                        note: None,
                    },
                ],
                hidden_tests: vec![IoCaseSpec {
                    input: "-5 5\n".into(),
                    output: "0\n".into(),
                }],
            }),
            solution: None,
            solution_blocks: None,
        }
    }

    const CORRECT_SUM_C: &str = r#"
#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a + b);
    return 0;
}
"#;

    const WRONG_SUM_C: &str = r#"
#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\n", a - b);
    return 0;
}
"#;

    const INFINITE_LOOP_C: &str = r#"
#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    while (1) {
        a = a + 1;
    }
    printf("%d\n", a + b);
    return 0;
}
"#;

    #[tokio::test]
    async fn correct_solution_passes_all_cases() {
        let stage = sum_stage();
        let out = run_io(&stage, CORRECT_SUM_C)
            .await
            .expect("run_io should succeed");
        assert!(out.cleared, "全ケース正解のはずが cleared=false");
        assert_eq!(out.cases.len(), 3);
        assert!(out.cases.iter().all(|c| c.pass), "全ケースが pass のはず");
        assert_eq!(out.cases[0].name, "入力例 1");
        assert_eq!(out.cases[1].name, "入力例 2");
        assert_eq!(out.cases[2].name, "テスト 1");
    }

    #[tokio::test]
    async fn wrong_solution_fails_cases() {
        let stage = sum_stage();
        let out = run_io(&stage, WRONG_SUM_C)
            .await
            .expect("run_io should succeed (compiles fine)");
        assert!(!out.cleared, "誤答なのに cleared=true になっている");
        // A - B は A + B と一致しない(A=B のケースを除く。ここでは全ケースで不一致)
        assert!(out.cases.iter().any(|c| !c.pass), "不合格ケースがあるはず");
    }

    #[tokio::test]
    async fn infinite_loop_times_out_and_fails() {
        let stage = sum_stage();
        let out = run_io(&stage, INFINITE_LOOP_C)
            .await
            .expect("run_io should succeed (compiles fine)");
        assert!(!out.cleared, "無限ループなのに cleared=true になっている");
        let first = &out.cases[0];
        assert!(!first.pass);
        assert!(
            first.actual.contains("タイムアウト"),
            "actual にタイムアウトの説明が入っているはず: {}",
            first.actual
        );
    }
}
