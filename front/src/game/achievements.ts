import type { Stage } from './types';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  emoji: string;
}

export interface AchievementStats {
  clearedCount: number;
  star3Count: number;
  clearedBlockCount: number;
  totalBlockCount: number;
  clearedCodeCount: number;
  totalCodeCount: number;
  totalCount: number;
  dailyStreak: number;
  firstTryClear: boolean;
  noCrashClear: boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-clear',
    name: 'はじめの いっぽ',
    desc: 'はじめて ステージを クリアした',
    emoji: '🥇',
  },
  { id: 'ten-clear', name: '10ステージクリア', desc: '10このステージをクリアした', emoji: '🎖️' },
  { id: 'fifty-clear', name: '50ステージクリア', desc: '50このステージをクリアした', emoji: '🏅' },
  { id: 'hundred-clear', name: '100ステージクリア', desc: '100このステージをクリアした', emoji: '💯' },
  {
    id: 'star3-ten',
    name: '★3が10こ',
    desc: '★3を10こ とった',
    emoji: '🌟',
  },
  {
    id: 'star3-fifty',
    name: '★3が50こ',
    desc: '★3を50こ とった',
    emoji: '✨',
  },
  {
    id: 'all-block-clear',
    name: 'しょきゅうマスター',
    desc: 'しょきゅうを ぜんもん クリアした',
    emoji: '👑',
  },
  {
    id: 'all-code-clear',
    name: '上級マスター',
    desc: '上級を ぜんもん クリアした',
    emoji: '💎',
  },
  {
    id: 'perfect',
    name: 'パーフェクト',
    desc: 'すべてのステージを ★3で クリアした',
    emoji: '🏆',
  },
  {
    id: 'streak-3',
    name: '3日れんぞく',
    desc: 'きょうのチャレンジを3日れんぞくでクリアした',
    emoji: '🔥',
  },
  {
    id: 'streak-7',
    name: '7日れんぞく',
    desc: 'きょうのチャレンジを7日れんぞくでクリアした',
    emoji: '🔥',
  },
  {
    id: 'first-try-clear',
    name: 'いちはつクリア',
    desc: 'やりなおしなしで1かいめの じっこうで クリアした',
    emoji: '🎯',
  },
  {
    id: 'no-crash-clear',
    name: 'ノーミスクリア',
    desc: 'いちども かべに ぶつからずに クリアした',
    emoji: '🛡️',
  },
];

export interface BehaviorFlags {
  firstTryClear: boolean;
  noCrashClear: boolean;
}

export function computeStats(
  stages: Stage[],
  progress: Record<string, 1 | 2 | 3>,
  dailyStreak = 0,
  behaviorFlags: BehaviorFlags = { firstTryClear: false, noCrashClear: false },
): AchievementStats {
  let clearedCount = 0;
  let star3Count = 0;
  let clearedBlockCount = 0;
  let clearedCodeCount = 0;
  let totalBlockCount = 0;
  let totalCodeCount = 0;

  for (const stage of stages) {
    if (stage.mode === 'block') totalBlockCount++;
    else totalCodeCount++;
    const stars = progress[stage.id];
    if (!stars) continue;
    clearedCount++;
    if (stars === 3) star3Count++;
    if (stage.mode === 'block') clearedBlockCount++;
    else clearedCodeCount++;
  }

  return {
    clearedCount,
    star3Count,
    clearedBlockCount,
    totalBlockCount,
    clearedCodeCount,
    totalCodeCount,
    totalCount: stages.length,
    dailyStreak,
    firstTryClear: behaviorFlags.firstTryClear,
    noCrashClear: behaviorFlags.noCrashClear,
  };
}

const PREDICATES: Record<string, (s: AchievementStats) => boolean> = {
  'first-clear': (s) => s.clearedCount >= 1,
  'ten-clear': (s) => s.clearedCount >= 10,
  'fifty-clear': (s) => s.clearedCount >= 50,
  'hundred-clear': (s) => s.clearedCount >= 100,
  'star3-ten': (s) => s.star3Count >= 10,
  'star3-fifty': (s) => s.star3Count >= 50,
  'all-block-clear': (s) => s.totalBlockCount > 0 && s.clearedBlockCount >= s.totalBlockCount,
  'all-code-clear': (s) => s.totalCodeCount > 0 && s.clearedCodeCount >= s.totalCodeCount,
  perfect: (s) => s.totalCount > 0 && s.star3Count >= s.totalCount,
  'streak-3': (s) => s.dailyStreak >= 3,
  'streak-7': (s) => s.dailyStreak >= 7,
  'first-try-clear': (s) => s.firstTryClear,
  'no-crash-clear': (s) => s.noCrashClear,
};

export function unlockedAchievementIds(stats: AchievementStats): Set<string> {
  const ids = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (PREDICATES[a.id]?.(stats)) ids.add(a.id);
  }
  return ids;
}

const SEEN_KEY = 'algorithm-game-achievements-seen';

export function loadSeenAchievementIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

export function saveSeenAchievementIds(ids: Set<string>): void {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
}

const BEHAVIOR_KEY = 'algorithm-game-behavior-flags';

export function loadBehaviorFlags(): BehaviorFlags {
  try {
    const parsed = JSON.parse(localStorage.getItem(BEHAVIOR_KEY) ?? 'null');
    return {
      firstTryClear: Boolean(parsed?.firstTryClear),
      noCrashClear: Boolean(parsed?.noCrashClear),
    };
  } catch {
    return { firstTryClear: false, noCrashClear: false };
  }
}

export function saveBehaviorFlags(flags: BehaviorFlags): void {
  localStorage.setItem(BEHAVIOR_KEY, JSON.stringify(flags));
}
