import { useEffect, useState } from 'react';
import type { Stage } from './game/types';
import { BUNDLED_STAGES } from './game/stages';
import { fetchProgress, fetchStages, postProgress } from './game/api';
import { TitleScreen } from './components/TitleScreen';
import { StageSelect, type Progress } from './components/StageSelect';
import { PlayScreen } from './components/PlayScreen';

type Screen =
  | { name: 'title' }
  | { name: 'select'; mode: 'block' | 'code' }
  | { name: 'play'; mode: 'block' | 'code'; stageId: string };

const PROGRESS_KEY = 'algorithm-game-progress';

function loadLocalProgress(): Progress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Progress;
  } catch {
    return {};
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'title' });
  const [stages, setStages] = useState<Stage[]>(BUNDLED_STAGES);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [progress, setProgress] = useState<Progress>(loadLocalProgress);

  // ステージと進捗はバックエンド API から取得し、落ちていれば同梱データにフォールバック
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [remoteStages, remoteProgress] = await Promise.all([
          fetchStages(),
          fetchProgress().catch(() => ({}) as Progress),
        ]);
        if (cancelled) return;
        setStages(remoteStages);
        setApiAvailable(true);
        // サーバー側の進捗とローカルの進捗は良い方を採用してマージ
        setProgress((local) => {
          const merged: Progress = { ...remoteProgress };
          for (const [id, s] of Object.entries(local)) {
            if (!merged[id] || merged[id] < s) merged[id] = s;
          }
          return merged;
        });
      } catch {
        // バックエンドなしでも同梱ステージで遊べる
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  const handleClear = (stageId: string, stars: 1 | 2 | 3) => {
    setProgress((prev) => {
      const best = prev[stageId];
      if (best && best >= stars) return prev;
      return { ...prev, [stageId]: stars };
    });
    if (apiAvailable) {
      void postProgress(stageId, stars).catch(() => {});
    }
  };

  if (screen.name === 'title') {
    return <TitleScreen onSelectMode={(mode) => setScreen({ name: 'select', mode })} />;
  }

  const modeStages = stages.filter((s) => s.mode === screen.mode);

  if (screen.name === 'select') {
    return (
      <StageSelect
        mode={screen.mode}
        stages={modeStages}
        progress={progress}
        onSelect={(stageId) => setScreen({ name: 'play', mode: screen.mode, stageId })}
        onBack={() => setScreen({ name: 'title' })}
      />
    );
  }

  const index = modeStages.findIndex((s) => s.id === screen.stageId);
  const stage = modeStages[index];
  const next = modeStages[index + 1];

  if (!stage) {
    setScreen({ name: 'select', mode: screen.mode });
    return null;
  }

  return (
    <PlayScreen
      key={stage.id}
      stage={stage}
      onClear={handleClear}
      onBack={() => setScreen({ name: 'select', mode: screen.mode })}
      onNext={next ? () => setScreen({ name: 'play', mode: screen.mode, stageId: next.id }) : null}
    />
  );
}
