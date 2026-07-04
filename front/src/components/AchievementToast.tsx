import { useEffect } from 'react';
import type { Achievement } from '../game/achievements';

interface Props {
  achievement: Achievement;
  onDone: () => void;
}

export function AchievementToast({ achievement, onDone }: Props) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(t);
  }, [achievement, onDone]);

  return (
    <div className="achievement-toast" role="status">
      <span className="achievement-toast-emoji">{achievement.emoji}</span>
      <span className="achievement-toast-body">
        <span className="achievement-toast-label">じっせき かいほう!</span>
        <span className="achievement-toast-name">{achievement.name}</span>
      </span>
    </div>
  );
}
