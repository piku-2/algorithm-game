import { useEffect, useState, type ReactNode } from 'react';
import type { Stage } from './game/types';
import { BUNDLED_STAGES } from './game/stages';
import { fetchProgress, fetchStages, postProgress } from './game/api';
import { loadSkinId, saveSkinId, skinById, totalStars } from './game/skins';
import {
  ACHIEVEMENTS,
  computeStats,
  loadBehaviorFlags,
  loadSeenAchievementIds,
  saveBehaviorFlags,
  saveSeenAchievementIds,
  unlockedAchievementIds,
  type Achievement,
  type BehaviorFlags,
} from './game/achievements';
import { currentStreak, hasClearedToday, pickDailyStage, recordDailyClear } from './game/dailyChallenge';
import { withGems } from './game/gems';
import { TitleScreen } from './components/TitleScreen';
import { StageSelect, type Progress } from './components/StageSelect';
import { PlayScreen, type ClearMeta } from './components/PlayScreen';
import { AchievementToast } from './components/AchievementToast';

type Screen =
  | { name: 'title' }
  | { name: 'select'; mode: 'block' | 'code' }
  | { name: 'play'; mode: 'block' | 'code'; stageId: string; from?: 'daily' };

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
  const [stages, setStages] = useState<Stage[]>(() => BUNDLED_STAGES.map(withGems));
  const [apiAvailable, setApiAvailable] = useState(false);
  const [progress, setProgress] = useState<Progress>(loadLocalProgress);
  const [skinId, setSkinId] = useState<string>(loadSkinId);
  const [seenAchievementIds, setSeenAchievementIds] = useState<Set<string>>(loadSeenAchievementIds);
  const [achievementToasts, setAchievementToasts] = useState<Achievement[]>([]);
  const [behaviorFlags, setBehaviorFlags] = useState<BehaviorFlags>(loadBehaviorFlags);
  // きょうのチャレンジ/ストリークはDate.now()に依存するため、タブを開きっぱなしで
  // 日付をまたいでも表示が更新されるよう1分ごとに再描画のきっかけを作る
  const [, forceDateTick] = useState(0);

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
        setStages(remoteStages.map(withGems));
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

  useEffect(() => {
    const id = window.setInterval(() => forceDateTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const dailyStage = pickDailyStage(stages);
  const dailyStreak = currentStreak();
  const stats = computeStats(stages, progress, dailyStreak, behaviorFlags);
  const unlockedIds = unlockedAchievementIds(stats);
  // ストリーク系バッジは dailyStreak (日をまたぐと下がりうる)に依存するため、
  // 一度でも解放したら二度とロック表示に戻らないよう「既読 = 生涯解放済み」の
  // 記録との和集合をギャラリー表示に使う
  const displayedAchievementIds = new Set([...unlockedIds, ...seenAchievementIds]);

  useEffect(() => {
    const newlyUnlocked = ACHIEVEMENTS.filter(
      (a) => unlockedIds.has(a.id) && !seenAchievementIds.has(a.id),
    );
    if (newlyUnlocked.length === 0) return;
    setAchievementToasts((q) => [...q, ...newlyUnlocked]);
    setSeenAchievementIds((prev) => {
      const next = new Set(prev);
      newlyUnlocked.forEach((a) => next.add(a.id));
      saveSeenAchievementIds(next);
      return next;
    });
  }, [progress, stages, behaviorFlags]);

  const handleClear = (stageId: string, stars: 1 | 2 | 3, meta: ClearMeta) => {
    setProgress((prev) => {
      const best = prev[stageId];
      if (best && best >= stars) return prev;
      return { ...prev, [stageId]: stars };
    });
    if (apiAvailable) {
      void postProgress(stageId, stars).catch(() => {});
    }
    if (dailyStage && stageId === dailyStage.id) {
      recordDailyClear();
    }
    if (meta.firstTry || meta.noCrash) {
      setBehaviorFlags((prev) => {
        const next: BehaviorFlags = {
          firstTryClear: prev.firstTryClear || meta.firstTry,
          noCrashClear: prev.noCrashClear || meta.noCrash,
        };
        if (next.firstTryClear !== prev.firstTryClear || next.noCrashClear !== prev.noCrashClear) {
          saveBehaviorFlags(next);
        }
        return next;
      });
    }
  };

  const handleSelectSkin = (id: string) => {
    setSkinId(id);
    saveSkinId(id);
  };

  const handleStartDaily = () => {
    if (!dailyStage) return;
    setScreen({ name: 'play', mode: dailyStage.mode, stageId: dailyStage.id, from: 'daily' });
  };

  let content: ReactNode;

  if (screen.name === 'title') {
    content = (
      <TitleScreen
        onSelectMode={(mode) => setScreen({ name: 'select', mode })}
        currentSkinId={skinId}
        totalStars={totalStars(progress)}
        onSelectSkin={handleSelectSkin}
        unlockedAchievementIds={displayedAchievementIds}
        dailyStage={dailyStage}
        dailyStreak={dailyStreak}
        dailyClearedToday={hasClearedToday()}
        onStartDaily={handleStartDaily}
      />
    );
  } else {
    const modeStages = stages.filter((s) => s.mode === screen.mode);

    if (screen.name === 'select') {
      content = (
        <StageSelect
          mode={screen.mode}
          stages={modeStages}
          progress={progress}
          onSelect={(stageId) => setScreen({ name: 'play', mode: screen.mode, stageId })}
          onBack={() => setScreen({ name: 'title' })}
        />
      );
    } else {
      const index = modeStages.findIndex((s) => s.id === screen.stageId);
      const stage = modeStages[index];
      const next = modeStages[index + 1];

      if (!stage) {
        setScreen({ name: 'select', mode: screen.mode });
        content = null;
      } else {
        const fromDaily = screen.from === 'daily';
        content = (
          <PlayScreen
            key={stage.id}
            stage={stage}
            onClear={handleClear}
            onBack={() =>
              setScreen(fromDaily ? { name: 'title' } : { name: 'select', mode: screen.mode })
            }
            onNext={
              next ? () => setScreen({ name: 'play', mode: screen.mode, stageId: next.id }) : null
            }
            skin={skinById(skinId)}
          />
        );
      }
    }
  }

  return (
    <>
      {content}
      {achievementToasts[0] && (
        <AchievementToast
          key={achievementToasts[0].id}
          achievement={achievementToasts[0]}
          onDone={() => setAchievementToasts((q) => q.slice(1))}
        />
      )}
    </>
  );
}
