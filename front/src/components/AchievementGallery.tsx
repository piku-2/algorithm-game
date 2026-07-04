import { ACHIEVEMENTS } from '../game/achievements';

interface Props {
  unlockedIds: Set<string>;
}

export function AchievementGallery({ unlockedIds }: Props) {
  return (
    <div className="achievement-gallery">
      <span className="achievement-gallery-label">
        じっせき（{unlockedIds.size} / {ACHIEVEMENTS.length}）
      </span>
      <div className="achievement-list">
        {ACHIEVEMENTS.map((a) => {
          const unlocked = unlockedIds.has(a.id);
          return (
            <span
              key={a.id}
              className={`achievement-badge ${unlocked ? '' : 'achievement-locked'}`}
              title={unlocked ? `${a.name}: ${a.desc}` : `？？？: ${a.desc}`}
            >
              <span className="achievement-emoji">{unlocked ? a.emoji : '🔒'}</span>
              <span className="achievement-name">{unlocked ? a.name : '？？？'}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
