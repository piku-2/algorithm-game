import { SKINS, isSkinUnlocked } from '../game/skins';

interface Props {
  currentSkinId: string;
  totalStars: number;
  onSelect: (id: string) => void;
}

export function SkinPicker({ currentSkinId, totalStars, onSelect }: Props) {
  return (
    <div className="skin-picker">
      <span className="skin-picker-label">きせかえ</span>
      <div className="skin-list">
        {SKINS.map((skin) => {
          const unlocked = isSkinUnlocked(skin, totalStars);
          const selected = skin.id === currentSkinId;
          return (
            <button
              key={skin.id}
              className={`skin-item ${selected ? 'skin-selected' : ''} ${unlocked ? '' : 'skin-locked'}`}
              disabled={!unlocked}
              title={unlocked ? skin.name : `★${skin.unlockStars}こで かいほう`}
              onClick={() => onSelect(skin.id)}
            >
              <span className="skin-emoji">{skin.emoji ?? '▶'}</span>
              <span className="skin-name">{unlocked ? skin.name : `🔒${skin.unlockStars}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
