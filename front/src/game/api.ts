import type { Stage, TraceEvent } from './types';
import { toStage, type StageJson } from './stages';

/**
 * バックエンド(Rust/axum) API クライアント。
 * 開発時は vite の proxy 経由で http://localhost:8080 につながる。
 */

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchStages(): Promise<Stage[]> {
  const list = await getJson<StageJson[]>('/api/stages');
  return list.map(toStage);
}

export type ProgressMap = Record<string, 1 | 2 | 3>;

export async function fetchProgress(): Promise<ProgressMap> {
  return getJson<ProgressMap>('/api/progress');
}

export async function postProgress(stageId: string, stars: 1 | 2 | 3): Promise<void> {
  await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageId, stars }),
  });
}

export interface RunCResult {
  ok: boolean;
  /** コンパイルエラー・実行時エラーの整形済みメッセージ */
  error?: string;
  trace?: TraceEvent[];
  cleared?: boolean;
}

export async function runC(stageId: string, code: string): Promise<RunCResult> {
  const res = await fetch('/api/run/c', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stageId, code }),
  });
  if (!res.ok) {
    return { ok: false, error: `サーバーエラー (${res.status})` };
  }
  return (await res.json()) as RunCResult;
}
