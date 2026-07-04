/** ステージごとの自己ベスト記録(値が小さいほど良い: ブロック数/ステップ数/交換回数) */
export type Records = Record<string, number>;

const RECORDS_KEY = 'algorithm-game-records';

export function loadRecords(): Records {
  try {
    return JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '{}') as Records;
  } catch {
    return {};
  }
}

export function saveRecords(records: Records): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
