use serde::Serialize;

/// フロントの TraceEvent(front/src/game/types.ts)と同一の JSON 表現。
/// 初級(ブロック)・上級(Cコード)で再生コードを共有するための共通フォーマット。
#[derive(Serialize, Debug, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum TraceEvent {
    Move { from: Pos, to: Pos, dir: String },
    Turn { dir: String, at: Pos },
    Crash { at: Pos, dir: String },
    Goal { at: Pos, dir: String },
    StepLimit { at: Pos, dir: String },
    // 配列パズル用
    Swap { i: i32, j: i32 },
    Solved {},
    Unsolved {},
    // 注意: types.ts には "gem"(集める要素)がこの他に存在するが、しょきゅう
    // ブロックインタプリタのみが発行しCサンドボックスは発行しないためここには無い。
}

#[derive(Serialize, Debug, PartialEq)]
pub struct Pos {
    pub x: i32,
    pub y: i32,
}

fn dir_name(c: &str) -> Option<String> {
    match c {
        "U" => Some("up".into()),
        "R" => Some("right".into()),
        "D" => Some("down".into()),
        "L" => Some("left".into()),
        _ => None,
    }
}

/// gamelib.c が書き出すトレースファイル(1行1イベント)をパースする。
///   M fx fy tx ty d / T x y d / C x y d / G x y d / L x y d
pub fn parse(text: &str) -> Result<Vec<TraceEvent>, String> {
    let mut events = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        let bad = || format!("不正なトレース行: {line}");
        let num = |s: &str| s.parse::<i32>().map_err(|_| bad());
        match parts.as_slice() {
            ["M", fx, fy, tx, ty, d] => events.push(TraceEvent::Move {
                from: Pos { x: num(fx)?, y: num(fy)? },
                to: Pos { x: num(tx)?, y: num(ty)? },
                dir: dir_name(d).ok_or_else(bad)?,
            }),
            ["T", x, y, d] => events.push(TraceEvent::Turn {
                dir: dir_name(d).ok_or_else(bad)?,
                at: Pos { x: num(x)?, y: num(y)? },
            }),
            ["C", x, y, d] => events.push(TraceEvent::Crash {
                at: Pos { x: num(x)?, y: num(y)? },
                dir: dir_name(d).ok_or_else(bad)?,
            }),
            ["G", x, y, d] => events.push(TraceEvent::Goal {
                at: Pos { x: num(x)?, y: num(y)? },
                dir: dir_name(d).ok_or_else(bad)?,
            }),
            ["L", x, y, d] => events.push(TraceEvent::StepLimit {
                at: Pos { x: num(x)?, y: num(y)? },
                dir: dir_name(d).ok_or_else(bad)?,
            }),
            ["S", i, j] => events.push(TraceEvent::Swap { i: num(i)?, j: num(j)? }),
            ["E", "1"] => events.push(TraceEvent::Solved {}),
            ["E", "0"] => events.push(TraceEvent::Unsolved {}),
            [] => {}
            _ => return Err(bad()),
        }
    }
    Ok(events)
}

pub fn is_goal(events: &[TraceEvent]) -> bool {
    matches!(
        events.last(),
        Some(TraceEvent::Goal { .. }) | Some(TraceEvent::Solved {})
    )
}
