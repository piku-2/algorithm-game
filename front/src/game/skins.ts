export interface Skin {
  id: string;
  emoji: string | null; // null = やじるし(方向グリフ)を使うデフォルトスキン
  name: string;
  unlockStars: number;
}

export const SKINS: Skin[] = [
  { id: 'arrow', emoji: null, name: 'やじるし', unlockStars: 0 },
  { id: 'cat', emoji: '🐱', name: 'ねこ', unlockStars: 10 },
  { id: 'robot', emoji: '🤖', name: 'ロボット', unlockStars: 30 },
  { id: 'frog', emoji: '🐸', name: 'かえる', unlockStars: 60 },
  { id: 'dragon', emoji: '🐲', name: 'ドラゴン', unlockStars: 100 },
  { id: 'rocket', emoji: '🚀', name: 'ロケット', unlockStars: 150 },
];

export function isSkinUnlocked(skin: Skin, totalStars: number): boolean {
  return totalStars >= skin.unlockStars;
}

export function totalStars(progress: Record<string, 1 | 2 | 3>): number {
  return Object.values(progress).reduce((sum, s) => sum + s, 0);
}

const SKIN_KEY = 'algorithm-game-skin';

export function loadSkinId(): string {
  return localStorage.getItem(SKIN_KEY) ?? 'arrow';
}

export function saveSkinId(id: string): void {
  localStorage.setItem(SKIN_KEY, id);
}

export function skinById(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
