use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// ステージデータ。data/stages.json(front/scripts/gen-stages.ts が生成)と同スキーマ。
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Stage {
    pub id: String,
    pub name: String,
    pub mode: String,
    /// '#'=壁 '.'=床 'G'=ゴール
    pub rows: Vec<String>,
    pub start: Start,
    pub allowed_blocks: Vec<String>,
    pub star_thresholds: [u32; 2],
    pub max_steps: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hint: Option<String>,
    /// 配列パズル(ソート等)のみ
    #[serde(skip_serializing_if = "Option::is_none")]
    pub puzzle: Option<Puzzle>,
    /// ステージ固有のコードテンプレート
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    /// 問題文本文(上級のみ。IO問題では必須)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub statement: Option<String>,
    /// 標準入出力問題(paiza/AtCoder 風)。ある場合、盤面・トレース再生は使わない
    #[serde(skip_serializing_if = "Option::is_none")]
    pub io: Option<IoProblem>,
    /// 模範解答の C コード(上級のみ)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solution: Option<String>,
    /// 模範解答のブロック列(初級のみ。パススルー配信、実行はフロントのインタプリタ)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub solution_blocks: Option<Vec<SolutionBlock>>,
}

/// 初級の模範解答ブロック(id はフロントのロード時に付与される)
#[derive(Clone, Serialize, Deserialize)]
pub struct SolutionBlock {
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub times: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<Vec<SolutionBlock>>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Puzzle {
    pub kind: String, // sort | sortDesc | reverse | maxLast | minFirst
    pub values: Vec<i32>,
}

/// 標準入出力問題(paiza/AtCoder 風)。front/src/game/types.ts の IoProblem と同スキーマ。
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IoProblem {
    pub input_format: String,
    pub output_format: String,
    pub constraints: String,
    pub samples: Vec<IoSample>,
    pub hidden_tests: Vec<IoCaseSpec>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct IoSample {
    pub input: String,
    pub output: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct IoCaseSpec {
    pub input: String,
    pub output: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct Start {
    pub x: i32,
    pub y: i32,
    pub dir: String,
}

/// ビルド時に data/stages.json を同梱して読み込む
pub fn load() -> Vec<Stage> {
    let json = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../data/stages.json"));
    serde_json::from_str(json).expect("data/stages.json is invalid")
}

pub fn index_by_id(stages: &[Stage]) -> HashMap<String, Stage> {
    stages.iter().map(|s| (s.id.clone(), s.clone())).collect()
}
