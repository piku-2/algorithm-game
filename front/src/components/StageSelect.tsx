import { useMemo, useState } from 'react';
import type { Stage } from '../game/types';

export type Progress = Record<string, 1 | 2 | 3>;

const PAGE_SIZE = 20;

interface Props {
  mode: 'block' | 'code';
  stages: Stage[];
  progress: Progress;
  onSelect: (stageId: string) => void;
  onBack: () => void;
}

export function StageSelect({ mode, stages, progress, onSelect, onBack }: Props) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(stages.length / PAGE_SIZE));
  const clearedCount = useMemo(
    () => stages.filter((s) => progress[s.id]).length,
    [stages, progress],
  );
  const visible = stages.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="stage-select">
      <header className="play-header">
        <button onClick={onBack}>← もどる</button>
        <h2>{mode === 'block' ? 'しょきゅう: ステージをえらぼう' : '上級: ステージ選択'}</h2>
        <span className="hint">
          クリア {clearedCount} / {stages.length}
        </span>
      </header>
      <div className="pager">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          ← まえ
        </button>
        <span>
          {page + 1} / {pages} ページ
        </span>
        <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          つぎ →
        </button>
      </div>
      <div className="stage-cards">
        {visible.map((stage, i) => {
          const stars = progress[stage.id];
          const num = page * PAGE_SIZE + i + 1;
          return (
            <button key={stage.id} className="stage-card" onClick={() => onSelect(stage.id)}>
              <span className="stage-num">{num}</span>
              <span className="stage-name">{stage.name}</span>
              <span className="stage-stars">
                {stars ? (
                  <>
                    {'★'.repeat(stars)}
                    <span className="star-empty">{'★'.repeat(3 - stars)}</span>
                  </>
                ) : (
                  <span className="star-empty">★★★</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
