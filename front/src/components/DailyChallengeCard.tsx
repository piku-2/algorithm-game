import type { Stage } from '../game/types';

interface Props {
  stage: Stage;
  streak: number;
  clearedToday: boolean;
  onStart: () => void;
}

export function DailyChallengeCard({ stage, streak, clearedToday, onStart }: Props) {
  return (
    <button className="daily-card" onClick={onStart}>
      <span className="daily-emoji">📅</span>
      <span className="daily-body">
        <span className="daily-title">きょうのチャレンジ</span>
        <span className="daily-stage-name">
          {stage.mode === 'block' ? '🧩' : '⌨️'} {stage.name}
        </span>
        <span className="daily-streak">
          {clearedToday ? '✅ きょうはクリアずみ!' : '🔥 れんぞく ' + streak + '日'}
        </span>
      </span>
    </button>
  );
}
