import type { Stage } from './types';

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 日付から決定的にステージを1つ選ぶ(全300ステージから) */
export function pickDailyStage(stages: Stage[], date: Date = new Date()): Stage | null {
  if (stages.length === 0) return null;
  const seed = hashString(dateKey(date));
  return stages[seed % stages.length];
}

const STREAK_KEY = 'algorithm-game-daily-streak';

interface StreakState {
  lastDate: string;
  streak: number;
}

function loadStreak(): StreakState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null');
    if (parsed && typeof parsed.lastDate === 'string' && typeof parsed.streak === 'number') {
      return parsed as StreakState;
    }
  } catch {
    // 壊れたデータは無視して初期化
  }
  return { lastDate: '', streak: 0 };
}

function saveStreak(state: StreakState): void {
  localStorage.setItem(STREAK_KEY, JSON.stringify(state));
}

/** 今日クリアしたことを記録し、更新後のストリーク日数を返す(同日2回目以降は変化しない) */
export function recordDailyClear(date: Date = new Date()): number {
  const today = dateKey(date);
  const state = loadStreak();
  if (state.lastDate === today) return state.streak;
  const yesterday = dateKey(new Date(date.getTime() - 86400000));
  const streak = state.lastDate === yesterday ? state.streak + 1 : 1;
  saveStreak({ lastDate: today, streak });
  return streak;
}

/** きょう時点でのストリーク日数(1日でも欠けていたら0) */
export function currentStreak(date: Date = new Date()): number {
  const state = loadStreak();
  const today = dateKey(date);
  const yesterday = dateKey(new Date(date.getTime() - 86400000));
  return state.lastDate === today || state.lastDate === yesterday ? state.streak : 0;
}

export function hasClearedToday(date: Date = new Date()): boolean {
  return loadStreak().lastDate === dateKey(date);
}
