import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Block, Direction, Pos, Stage, TraceEvent } from '../game/types';
import { countBlocks, run, starsFor } from '../game/interpreter';
import { CODE_TEMPLATE } from '../game/stages';
import { runC, type IoCaseResult } from '../game/api';
import { sound } from '../game/sound';
import type { Skin } from '../game/skins';
import { loadRecords, saveRecords, type Records } from '../game/records';
import { Board } from './Board';
import { ArrayBoard } from './ArrayBoard';
import { BlockEditor, cloneWithFreshIds } from './BlockEditor';
import { CodeEditor } from './CodeEditor';
import { ProblemPanel } from './ProblemPanel';
import { IoResultPanel } from './IoResultPanel';
import { SolutionModal } from './SolutionModal';

type Status = 'editing' | 'compiling' | 'running' | 'crashed' | 'goal' | 'stepLimit' | 'unsolved';

const STATUS_MESSAGE: Record<Status, string> = {
  editing: '',
  compiling: 'コンパイルちゅう…',
  running: 'じっこうちゅう…',
  crashed: 'かべに ぶつかった! りせっとして やりなおそう',
  goal: 'ゴール! 🎉',
  stepLimit: 'うごきすぎ! プログラムを みなおそう',
  unsolved: 'プログラムが おわったけど、まだ 条件を みたしていないよ',
};

/** IO問題で不正解ケースがあったときのメッセージ(通常の unsolved とは文言を変える) */
const IO_UNSOLVED_MESSAGE = '不正解のケースがあるよ。下のテスト結果を見て見なおそう';

type SolutionStep = 'none' | 'confirm' | 'shown';

export interface ClearMeta {
  /** このステージに来てから最初の実行/ステップで(やり直しなしで)クリアした */
  firstTry: boolean;
  /** このステージに来てから一度もかべにぶつからずクリアした */
  noCrash: boolean;
}

interface Props {
  stage: Stage;
  onClear: (stageId: string, stars: 1 | 2 | 3, meta: ClearMeta) => void;
  onBack: () => void;
  onNext: (() => void) | null;
  skin?: Skin;
}

/** 編集中のブロック数と★のボーダーをライブ表示する */
function BlockCounter({ count, thresholds }: { count: number; thresholds: [number, number] }) {
  const [star3, star2] = thresholds;
  const pace = count === 0 ? 3 : count <= star3 ? 3 : count <= star2 ? 2 : 1;
  return (
    <p className={`block-counter block-counter-pace${pace}`}>
      つかったブロック: <b>{count}</b>こ（★3は{star3}こ・★2は{star2}こまで）
    </p>
  );
}

/** トレース中の move/turn の数(上級ナビの星評価に使う実行ステップ数) */
function traceSteps(trace: TraceEvent[]): number {
  return trace.filter((e) => e.type === 'move' || e.type === 'turn').length;
}

/** トレース中の swap の数(配列パズルの星評価) */
function traceSwaps(trace: TraceEvent[]): number {
  return trace.filter((e) => e.type === 'swap').length;
}

/** ゴール到達時に確定する星数とスコア(ブロック数/ステップ数/交換回数。じこベスト判定に使う) */
type GoalResult = { stars: 1 | 2 | 3; score: number };

export function PlayScreen({ stage, onClear, onBack, onNext, skin }: Props) {
  const initialCode = stage.template ?? CODE_TEMPLATE;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [code, setCode] = useState(initialCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('editing');
  const [pos, setPos] = useState<Pos>({ x: stage.start.x, y: stage.start.y });
  const [dir, setDir] = useState<Direction>(stage.start.dir);
  const [trail, setTrail] = useState<Pos[]>([]);
  const [collectedGems, setCollectedGems] = useState<Pos[]>([]);
  const [values, setValues] = useState<number[]>(stage.puzzle?.values ?? []);
  const [lastSwap, setLastSwap] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState(300); // ms / step
  const [stars, setStars] = useState<1 | 2 | 3 | null>(null);
  const [lastScore, setLastScore] = useState(0); // クリア時のステップ/交換回数
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [stepping, setStepping] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [ioCases, setIoCases] = useState<IoCaseResult[] | null>(null);
  const [solutionStep, setSolutionStep] = useState<SolutionStep>('none');
  const recordsRef = useRef<Records>(loadRecords());
  const [sfxOn, setSfxOn] = useState(sound.sfxEnabled);
  const [bgmOn, setBgmOn] = useState(sound.bgmEnabled);
  const timerRef = useRef<number | null>(null);
  const clearTimeoutsRef = useRef<number[]>([]);
  const stepRef = useRef<{
    trace: TraceEvent[];
    blockIds?: (string | null)[];
    i: number;
    starsOnGoal: () => GoalResult;
  } | null>(null);
  const stepStartingRef = useRef(false);
  // このステージに来てからの実行回数・クラッシュ回数(こうどうバッジ判定用。reset()では減らさない)
  const runCountRef = useRef(0);
  const crashCountRef = useRef(0);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const clearPendingTimeouts = () => {
    clearTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    clearTimeoutsRef.current = [];
  };

  const reset = useCallback(() => {
    stopTimer();
    clearPendingTimeouts();
    stepRef.current = null;
    setStepping(false);
    setShowClearDialog(false);
    setStatus('editing');
    setPos({ x: stage.start.x, y: stage.start.y });
    setDir(stage.start.dir);
    setTrail([]);
    setCollectedGems([]);
    setValues(stage.puzzle?.values ?? []);
    setLastSwap(null);
    setStars(null);
    setCodeError(null);
    setActiveBlockId(null);
    setIsNewRecord(false);
    setBestScore(null);
    setIoCases(null);
  }, [stage]);

  useEffect(() => clearPendingTimeouts, []);

  // ★の出現にあわせて1つずつ「ぽろん」音を鳴らす
  useEffect(() => {
    if (!showClearDialog || stars === null) return;
    const ids: number[] = [];
    for (let i = 0; i < stars; i++) {
      ids.push(window.setTimeout(() => sound.star(i), i * 150));
    }
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [showClearDialog, stars]);

  useEffect(() => {
    reset();
    setBlocks([]);
    setSelectedContainerId(null);
    setCode(stage.template ?? CODE_TEMPLATE);
    runCountRef.current = 0;
    crashCountRef.current = 0;
    setSolutionStep('none');
  }, [stage, reset]);

  useEffect(() => stopTimer, []);

  /** 1件のトレースイベントを盤面/状態に反映する(自動再生・ステップ実行の共通処理) */
  const applyEvent = useCallback(
    (ev: TraceEvent, starsOnGoal: () => GoalResult) => {
      switch (ev.type) {
        case 'move':
          setTrail((t) => [...t, ev.from]);
          setPos(ev.to);
          sound.move();
          break;
        case 'turn':
          setDir(ev.dir);
          sound.turn();
          break;
        case 'gem':
          setCollectedGems((g) => [...g, ev.at]);
          sound.gem();
          break;
        case 'swap':
          setValues((vs) => {
            const next = [...vs];
            [next[ev.i], next[ev.j]] = [next[ev.j], next[ev.i]];
            return next;
          });
          setLastSwap([ev.i, ev.j]);
          sound.move();
          break;
        case 'crash':
          crashCountRef.current++;
          setStatus('crashed');
          sound.crash();
          break;
        case 'goal':
        case 'solved': {
          setStatus('goal');
          sound.goal();
          const { stars: s, score } = starsOnGoal();
          setStars(s);
          const prevBest = recordsRef.current[stage.id];
          const isNew = prevBest === undefined || score < prevBest;
          if (isNew) {
            recordsRef.current = { ...recordsRef.current, [stage.id]: score };
            saveRecords(recordsRef.current);
          }
          setIsNewRecord(isNew);
          setBestScore(isNew ? score : prevBest);
          onClear(stage.id, s, {
            firstTry: runCountRef.current === 1,
            noCrash: crashCountRef.current === 0,
          });
          // 紙吹雪・ふきだしの演出を見せてからクリアダイアログを出す
          clearTimeoutsRef.current.push(
            window.setTimeout(() => setShowClearDialog(true), 700),
          );
          break;
        }
        case 'unsolved':
          setStatus('unsolved');
          sound.crash();
          break;
        case 'stepLimit':
          setStatus('stepLimit');
          sound.crash();
          break;
      }
    },
    [stage.id, onClear],
  );

  /**
   * トレースを再生する(初級・上級共通)。
   * starsOnGoal はゴール(達成)イベント到達時に星数を決めるために呼ぶ。
   */
  const playTrace = useCallback(
    (trace: TraceEvent[], starsOnGoal: () => GoalResult, blockIds?: (string | null)[]) => {
      if (trace.length === 0) {
        setStatus('editing');
        return;
      }
      setStatus('running');
      let i = 0;
      timerRef.current = window.setInterval(() => {
        setActiveBlockId(blockIds?.[i] ?? null);
        applyEvent(trace[i], starsOnGoal);
        i++;
        if (i >= trace.length) {
          stopTimer();
          setActiveBlockId(null);
          // トレースを最後まで再生してもゴールしていなければ編集に戻す
          setStatus((st) => (st === 'running' ? 'editing' : st));
        }
      }, speed);
    },
    [speed, applyEvent],
  );

  const computeBlocksTrace = () => {
    const result = run(stage, blocks);
    return {
      trace: result.trace,
      blockIds: result.blockIds,
      starsOnGoal: (): GoalResult => {
        const score = countBlocks(blocks);
        return { stars: starsFor(stage, score), score };
      },
    };
  };

  const computeCodeTrace = async () => {
    setStatus('compiling');
    const result = await runC(stage.id, code);
    if (!result.ok || !result.trace) {
      setStatus('editing');
      setCodeError(result.error ?? 'じっこうに しっぱいしました');
      return null;
    }
    setCodeError(null);
    const trace = result.trace;
    return {
      trace,
      blockIds: undefined as (string | null)[] | undefined,
      starsOnGoal: (): GoalResult => {
        const score = stage.puzzle ? traceSwaps(trace) : traceSteps(trace);
        setLastScore(score);
        return { stars: starsFor(stage, score), score };
      },
    };
  };

  const handleRunBlocks = () => {
    reset();
    runCountRef.current++;
    const { trace, blockIds, starsOnGoal } = computeBlocksTrace();
    playTrace(trace, starsOnGoal, blockIds);
  };

  const handleRunCode = async () => {
    reset();
    runCountRef.current++;
    const result = await computeCodeTrace();
    if (result) playTrace(result.trace, result.starsOnGoal, result.blockIds);
  };

  /** IO問題(標準入出力)の実行: トレース再生の代わりにケースごとの合否を表示する */
  const handleRunIo = async () => {
    reset();
    runCountRef.current++;
    setStatus('compiling');
    const result = await runC(stage.id, code);
    if (!result.ok) {
      setStatus('editing');
      setCodeError(result.error ?? 'じっこうに しっぱいしました');
      return;
    }
    setCodeError(null);
    setIoCases(result.ioCases ?? []);
    if (result.cleared) {
      setStatus('goal');
      sound.goal();
      setStars(3);
      onClear(stage.id, 3, {
        firstTry: runCountRef.current === 1,
        noCrash: crashCountRef.current === 0,
      });
      clearTimeoutsRef.current.push(window.setTimeout(() => setShowClearDialog(true), 700));
    } else {
      setStatus('unsolved');
    }
  };

  /** ステップ実行: 1クリックで1トレースイベントだけ進める */
  const handleStep = async () => {
    if (!stepRef.current) {
      // Cコードのコンパイル待ち中に連打しても2重にセッションを開始しない
      if (stepStartingRef.current) return;
      stepStartingRef.current = true;
      try {
        reset();
        runCountRef.current++;
        const prepared = stage.mode === 'block' ? computeBlocksTrace() : await computeCodeTrace();
        if (!prepared || prepared.trace.length === 0) {
          setStatus('editing');
          return;
        }
        stepRef.current = { ...prepared, i: 0 };
        setStepping(true);
        setStatus('running');
      } finally {
        stepStartingRef.current = false;
      }
    }
    const s = stepRef.current;
    if (!s || s.i >= s.trace.length) return;
    setActiveBlockId(s.blockIds?.[s.i] ?? null);
    applyEvent(s.trace[s.i], s.starsOnGoal);
    s.i++;
    if (s.i >= s.trace.length) {
      stepRef.current = null;
      setStepping(false);
      setActiveBlockId(null);
      setStatus((st) => (st === 'running' ? 'editing' : st));
    }
  };

  const busy = status === 'running' || status === 'compiling';
  const stepDisabled =
    status === 'compiling' ||
    (!stepping && status === 'running') ||
    (!stepping && stage.mode === 'block' && blocks.length === 0);
  const statusMessage =
    stage.io && status === 'unsolved' ? IO_UNSOLVED_MESSAGE : STATUS_MESSAGE[status];

  return (
    <div className="play-screen">
      <header className="play-header">
        <button onClick={onBack}>← もどる</button>
        <h2>{stage.name}</h2>
        <span className="hint">💡 {stage.hint}</span>
      </header>
      <div className="play-main">
        <div className="board-pane">
          {stage.io ? (
            <div className="io-pane">
              <ProblemPanel statement={stage.statement} io={stage.io} />
              {ioCases && <IoResultPanel cases={ioCases} />}
            </div>
          ) : (
            <>
              {stage.statement && <ProblemPanel statement={stage.statement} collapsible />}
              {stage.puzzle ? (
                <ArrayBoard
                  puzzle={stage.puzzle}
                  values={values}
                  lastSwap={lastSwap}
                  solved={status === 'goal'}
                />
              ) : (
                <Board
                  stage={stage}
                  pos={pos}
                  dir={dir}
                  crashed={status === 'crashed'}
                  goaled={status === 'goal'}
                  skin={skin}
                  trail={trail}
                  collectedGems={collectedGems}
                />
              )}
              {stage.gems && stage.gems.length > 0 && (
                <p className="gem-counter">
                  💎 {collectedGems.length} / {stage.gems.length}
                </p>
              )}
            </>
          )}
          <div className="controls">
            {stage.mode === 'block' ? (
              <button
                className="run-btn"
                onClick={handleRunBlocks}
                disabled={busy || blocks.length === 0}
              >
                ▶ うごかす!
              </button>
            ) : (
              <button
                className="run-btn"
                onClick={stage.io ? handleRunIo : handleRunCode}
                disabled={busy}
              >
                ▶ 実行
              </button>
            )}
            {!stage.io && (
              <button onClick={handleStep} disabled={stepDisabled} title="1コマだけ すすめる">
                {stepping ? '⏭ つぎへ' : '⏭ ステップ'}
              </button>
            )}
            <button onClick={reset}>⟲ りせっと</button>
            {!stage.io && (
              <label className="speed">
                はやさ
                <input
                  type="range"
                  min={80}
                  max={600}
                  step={20}
                  value={680 - speed}
                  disabled={busy}
                  onChange={(e) => setSpeed(680 - Number(e.target.value))}
                />
              </label>
            )}
            <button
              className="sound-btn"
              onClick={() => setSfxOn(sound.toggleSfx())}
              title="こうかおん"
            >
              {sfxOn ? '🔊' : '🔇'}
            </button>
            <button
              className="sound-btn"
              onClick={() => setBgmOn(sound.toggleBgm())}
              title="BGM"
            >
              {bgmOn ? '🎵' : '🎵✕'}
            </button>
          </div>
          {status !== 'editing' && (
            <p className={`status status-${status}`}>{statusMessage}</p>
          )}
        </div>
        <div className="editor-pane">
          {stage.mode === 'block' ? (
            <>
              <BlockCounter count={countBlocks(blocks)} thresholds={stage.starThresholds} />
              {stage.solutionBlocks && stage.solutionBlocks.length > 0 && (
                <div className="solution-bar">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setSolutionStep('confirm')}
                  >
                    💡 解答例を見る
                  </button>
                </div>
              )}
              <BlockEditor
                allowed={stage.allowedBlocks}
                blocks={blocks}
                onChange={setBlocks}
                disabled={busy}
                selectedContainerId={selectedContainerId}
                onSelectContainer={setSelectedContainerId}
                activeBlockId={activeBlockId}
              />
            </>
          ) : (
            <>
              {stage.solution && (
                <div className="solution-bar">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setSolutionStep('confirm')}
                  >
                    💡 解答例を見る
                  </button>
                </div>
              )}
              <CodeEditor code={code} onChange={setCode} disabled={busy} error={codeError} />
            </>
          )}
        </div>
      </div>
      {solutionStep === 'confirm' && (
        <div className="clear-overlay" onClick={() => setSolutionStep('none')}>
          <div className="clear-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>解答例を見る?</h2>
            <p>自分で考えてから見よう!</p>
            <div className="clear-actions">
              <button onClick={() => setSolutionStep('none')}>やめる</button>
              <button className="run-btn" onClick={() => setSolutionStep('shown')}>
                見る
              </button>
            </div>
          </div>
        </div>
      )}
      {solutionStep === 'shown' && stage.mode === 'block' && stage.solutionBlocks && (
        <SolutionModal
          solutionBlocks={stage.solutionBlocks}
          onLoad={() => {
            setBlocks(cloneWithFreshIds(stage.solutionBlocks ?? []));
            setSolutionStep('none');
          }}
          onClose={() => setSolutionStep('none')}
        />
      )}
      {solutionStep === 'shown' && stage.mode === 'code' && stage.solution && (
        <SolutionModal
          solution={stage.solution}
          onPaste={() => {
            setCode(stage.solution as string);
            setSolutionStep('none');
          }}
          onClose={() => setSolutionStep('none')}
        />
      )}
      {status === 'goal' && stars !== null && showClearDialog && (
        <div className="clear-overlay">
          <div className="clear-dialog">
            <h2>クリア!</h2>
            <p className="clear-stars">
              {Array.from({ length: 3 }, (_, i) =>
                i < stars ? (
                  <span
                    key={i}
                    className="star-pop"
                    style={{ animationDelay: `${i * 0.15}s` } as CSSProperties}
                  >
                    ★
                  </span>
                ) : (
                  <span key={i} className="star-empty">
                    ★
                  </span>
                ),
              )}
            </p>
            {stage.io ? (
              <p>全てのテストケースに合格!</p>
            ) : stage.mode === 'block' ? (
              <p>つかったブロック: {countBlocks(blocks)}こ</p>
            ) : stage.puzzle ? (
              <p>交換(swap)回数: {lastScore}回</p>
            ) : (
              <p>実行ステップ数: {lastScore}</p>
            )}
            {bestScore !== null && (
              <p className={isNewRecord ? 'new-record' : 'best-record'}>
                {isNewRecord ? '🏅 じこベストこうしん!' : `じこベスト: ${bestScore}`}
              </p>
            )}
            <div className="clear-actions">
              <button onClick={reset}>もういちど</button>
              <button onClick={onBack}>ステージいちらん</button>
              {onNext && (
                <button className="run-btn" onClick={onNext}>
                  つぎのステージ →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
