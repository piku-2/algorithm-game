export interface Skin {
  id: string;
  emoji: string | null; // null = やじるし(方向グリフ)を使うデフォルトスキン
  name: string;
  unlockStars: number;
  /** クラッシュ/ゴール時のセリフ(未指定ならBoard.tsxの共通セリフを使う) */
  crashQuips?: string[];
  goalQuips?: string[];
}

export const SKINS: Skin[] = [
  { id: 'arrow', emoji: null, name: 'やじるし', unlockStars: 0 },
  {
    id: 'cat',
    emoji: '🐱',
    name: 'ねこ',
    unlockStars: 10,
    crashQuips: ['にゃにゃっ!', 'ふにゃっ...'],
    goalQuips: ['にゃー! やったー!', 'ゴロゴロ~'],
  },
  {
    id: 'robot',
    emoji: '🤖',
    name: 'ロボット',
    unlockStars: 30,
    crashQuips: ['ビービー! エラー', 'ガガガッ'],
    goalQuips: ['ピピッ! せいこう!', 'ミッションかんりょう'],
  },
  {
    id: 'frog',
    emoji: '🐸',
    name: 'かえる',
    unlockStars: 60,
    crashQuips: ['ケロッ...いたい', 'げこっ'],
    goalQuips: ['ケロケロ~! やったー!', 'ぴょんぴょん!'],
  },
  {
    id: 'dragon',
    emoji: '🐲',
    name: 'ドラゴン',
    unlockStars: 100,
    crashQuips: ['ガオ! ぶつかった', 'グルル...'],
    goalQuips: ['ゴォォ! せいこう!', 'かえんほうしゃ!(いみは ない)'],
  },
  {
    id: 'rocket',
    emoji: '🚀',
    name: 'ロケット',
    unlockStars: 150,
    crashQuips: ['ゴツン! きけん', 'エンジンていし'],
    goalQuips: ['シュ~ッ! はっしゃせいこう!', 'ちきゅうにきかんちゅう'],
  },
  {
    id: 'unicorn',
    emoji: '🦄',
    name: 'ユニコーン',
    unlockStars: 200,
    crashQuips: ['ヒヒーン! いたい', 'つのが かべに...'],
    goalQuips: ['ヒヒーン! だいせいこう!', 'にじが かかった!'],
  },
  {
    id: 'alien',
    emoji: '👾',
    name: 'エイリアン',
    unlockStars: 250,
    crashQuips: ['ピロピロ...こうげき うけた', 'ワレワレハ ダメージヲ ウケタ'],
    goalQuips: ['ワレワレハ クリアシタ!', 'ピコーン! ミッションせいこう'],
  },
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
