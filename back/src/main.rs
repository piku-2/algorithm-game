mod progress;
mod sandbox;
mod stages;
mod trace;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;

struct AppState {
    stages: Vec<stages::Stage>,
    by_id: HashMap<String, stages::Stage>,
    db: Mutex<rusqlite::Connection>,
}

#[tokio::main]
async fn main() {
    let stage_list = stages::load();
    let by_id = stages::index_by_id(&stage_list);
    let db_path = std::env::var("DATABASE_PATH").unwrap_or_else(|_| "progress.db".into());
    let conn = progress::open(&db_path).expect("failed to open sqlite db");
    let state = Arc::new(AppState {
        stages: stage_list,
        by_id,
        db: Mutex::new(conn),
    });

    let app = Router::new()
        .route("/api/stages", get(list_stages))
        .route("/api/stages/{id}", get(get_stage))
        .route("/api/progress", get(get_progress).post(post_progress))
        .route("/api/run/c", post(run_c))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into());
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("bind failed");
    println!("listening on {addr}");
    axum::serve(listener, app).await.expect("server error");
}

async fn list_stages(State(state): State<Arc<AppState>>) -> Json<Vec<stages::Stage>> {
    Json(state.stages.clone())
}

async fn get_stage(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Result<Json<stages::Stage>, StatusCode> {
    state
        .by_id
        .get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn get_progress(
    State(state): State<Arc<AppState>>,
) -> Result<Json<HashMap<String, u8>>, StatusCode> {
    let db = state.db.lock().await;
    progress::all(&db)
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProgressReq {
    stage_id: String,
    stars: u8,
}

async fn post_progress(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ProgressReq>,
) -> StatusCode {
    if !(1..=3).contains(&req.stars) || !state.by_id.contains_key(&req.stage_id) {
        return StatusCode::BAD_REQUEST;
    }
    let db = state.db.lock().await;
    match progress::upsert(&db, &req.stage_id, req.stars) {
        Ok(()) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR,
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RunCReq {
    stage_id: String,
    code: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RunCRes {
    ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    trace: Option<Vec<trace::TraceEvent>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    cleared: Option<bool>,
}

async fn run_c(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RunCReq>,
) -> Result<Json<RunCRes>, StatusCode> {
    let Some(stage) = state.by_id.get(&req.stage_id) else {
        return Err(StatusCode::NOT_FOUND);
    };
    match sandbox::run(stage, &req.code).await {
        Ok(out) => Ok(Json(RunCRes {
            ok: true,
            error: None,
            trace: Some(out.trace),
            cleared: Some(out.cleared),
        })),
        Err(msg) => Ok(Json(RunCRes {
            ok: false,
            error: Some(msg),
            trace: None,
            cleared: None,
        })),
    }
}
