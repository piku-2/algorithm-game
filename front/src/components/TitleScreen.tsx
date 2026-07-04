import type { Stage } from '../game/types';
import { SkinPicker } from './SkinPicker';
import { AchievementGallery } from './AchievementGallery';
import { DailyChallengeCard } from './DailyChallengeCard';

interface Props {
  onSelectMode: (mode: 'block' | 'code') => void;
  currentSkinId: string;
  totalStars: number;
  onSelectSkin: (id: string) => void;
  unlockedAchievementIds: Set<string>;
  dailyStage: Stage | null;
  dailyStreak: number;
  dailyClearedToday: boolean;
  onStartDaily: () => void;
}

export function TitleScreen({
  onSelectMode,
  currentSkinId,
  totalStars,
  onSelectSkin,
  unlockedAchievementIds,
  dailyStage,
  dailyStreak,
  dailyClearedToday,
  onStartDaily,
}: Props) {
  return (
    <div className="title-screen">
      <h1 className="game-title">
        アルゴリズム<span className="title-accent">クエスト</span>
      </h1>
      <p className="game-subtitle">プログラムをかいて キャラクターを ゴールへ みちびこう!</p>
      <div className="mode-cards">
        <button className="mode-card mode-block" onClick={() => onSelectMode('block')}>
          <span className="mode-emoji">🧩</span>
          <span className="mode-name">しょきゅう</span>
          <span className="mode-desc">ブロックを ならべて プログラミング</span>
        </button>
        <button className="mode-card mode-code" onClick={() => onSelectMode('code')}>
          <span className="mode-emoji">⌨️</span>
          <span className="mode-name">上級</span>
          <span className="mode-desc">C言語で 本格プログラミング</span>
        </button>
      </div>
      {dailyStage && (
        <DailyChallengeCard
          stage={dailyStage}
          streak={dailyStreak}
          clearedToday={dailyClearedToday}
          onStart={onStartDaily}
        />
      )}
      <SkinPicker currentSkinId={currentSkinId} totalStars={totalStars} onSelect={onSelectSkin} />
      <AchievementGallery unlockedIds={unlockedAchievementIds} />
    </div>
  );
}
