import type { Stage } from '../game/types';

interface Props {
  stage: Stage;
  streak: number;
  clearedToday: boolean;
  onStart: () => void;
}

export function DailyChallengeCard({ stage, streak, clearedToday, onStart }: Props) {
  const onFire = streak >= 3;
  return (
    <button className={`daily-card ${onFire ? 'daily-card-on-fire' : ''}`} onClick={onStart}>
      <span className="daily-emoji">📅</span>
      <span className="daily-body">
        <span className="daily-title">きょうのチャレンジ</span>
        <span className="daily-stage-name">
          {stage.mode === 'block' ? '🧩' : '⌨️'} {stage.name}
        </span>
        <span className={`daily-streak ${onFire ? 'daily-streak-on-fire' : ''}`}>
          {clearedToday ? '✅ きょうはクリアずみ!' : `🔥 れんぞく ${streak}日`}
        </span>
      </span>
    </button>
  );
}
