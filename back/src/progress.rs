use rusqlite::Connection;
use std::collections::HashMap;

/// 進捗(ステージごとのベスト星数)の SQLite 永続化。
/// モックはローカル1ユーザー想定なのでユーザー分離はまだしない。
pub fn open(path: &str) -> rusqlite::Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS progress (
            stage_id TEXT PRIMARY KEY,
            stars INTEGER NOT NULL
        );",
    )?;
    Ok(conn)
}

pub fn all(conn: &Connection) -> rusqlite::Result<HashMap<String, u8>> {
    let mut stmt = conn.prepare("SELECT stage_id, stars FROM progress")?;
    let rows = stmt.query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, u8>(1)?)))?;
    rows.collect()
}

/// ベスト更新のときだけ保存する
pub fn upsert(conn: &Connection, stage_id: &str, stars: u8) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO progress (stage_id, stars) VALUES (?1, ?2)
         ON CONFLICT(stage_id) DO UPDATE SET stars = excluded.stars
         WHERE excluded.stars > progress.stars",
        (stage_id, stars),
    )?;
    Ok(())
}
