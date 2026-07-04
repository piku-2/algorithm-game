import { useCallback, useEffect, useRef, useState } from 'react';
import type { Block, Direction, Pos, Stage, TraceEvent } from '../game/types';
import { countBlocks, run, starsFor } from '../game/interpreter';
import { CODE_TEMPLATE } from '../game/stages';
import { runC } from '../game/api';
import { sound } from '../game/sound';
import { Board } from './Board';
import { ArrayBoard } from './ArrayBoard';
import { BlockEditor } from './BlockEditor';
import { CodeEditor } from './CodeEditor';

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

interface Props {
  stage: Stage;
  onClear: (stageId: string, stars: 1 | 2 | 3) => void;
  onBack: () => void;
  onNext: (() => void) | null;
}

/** トレース中の move/turn の数(上級ナビの星評価に使う実行ステップ数) */
function traceSteps(trace: TraceEvent[]): number {
  return trace.filter((e) => e.type === 'move' || e.type === 'turn').length;
}

/** トレース中の swap の数(配列パズルの星評価) */
function traceSwaps(trace: TraceEvent[]): number {
  return trace.filter((e) => e.type === 'swap').length;
}

export function PlayScreen({ stage, onClear, onBack, onNext }: Props) {
  const initialCode = stage.template ?? CODE_TEMPLATE;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [code, setCode] = useState(initialCode);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('editing');
  const [pos, setPos] = useState<Pos>({ x: stage.start.x, y: stage.start.y });
  const [dir, setDir] = useState<Direction>(stage.start.dir);
  const [values, setValues] = useState<number[]>(stage.puzzle?.values ?? []);
  const [lastSwap, setLastSwap] = useState<[number, number] | null>(null);
  const [speed, setSpeed] = useState(300); // ms / step
  const [stars, setStars] = useState<1 | 2 | 3 | null>(null);
  const [lastScore, setLastScore] = useState(0); // クリア時のステップ/交換回数
  const [sfxOn, setSfxOn] = useState(sound.sfxEnabled);
  const [bgmOn, setBgmOn] = useState(sound.bgmEnabled);
  const timerRef = useRef<number | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const reset = useCallback(() => {
    stopTimer();
    setStatus('editing');
    setPos({ x: stage.start.x, y: stage.start.y });
    setDir(stage.start.dir);
    setValues(stage.puzzle?.values ?? []);
    setLastSwap(null);
    setStars(null);
    setCodeError(null);
  }, [stage]);

  useEffect(() => {
    reset();
    setBlocks([]);
    setSelectedContainerId(null);
    setCode(stage.template ?? CODE_TEMPLATE);
  }, [stage, reset]);

  useEffect(() => stopTimer, []);

  /**
   * トレースを再生する(初級・上級共通)。
   * starsOnGoal はゴール(達成)イベント到達時に星数を決めるために呼ぶ。
   */
  const playTrace = useCallback(
    (trace: TraceEvent[], starsOnGoal: () => 1 | 2 | 3) => {
      if (trace.length === 0) {
        setStatus('editing');
        return;
      }
      setStatus('running');
      let i = 0;
      timerRef.current = window.setInterval(() => {
        const ev = trace[i];
        switch (ev.type) {
          case 'move':
            setPos(ev.to);
            sound.move();
            break;
          case 'turn':
            setDir(ev.dir);
            sound.turn();
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
            setStatus('crashed');
            sound.crash();
            break;
          case 'goal':
          case 'solved': {
            setStatus('goal');
            sound.goal();
            const s = starsOnGoal();
            setStars(s);
            onClear(stage.id, s);
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
        i++;
        if (i >= trace.length) {
          stopTimer();
          // トレースを最後まで再生してもゴールしていなければ編集に戻す
          setStatus((st) => (st === 'running' ? 'editing' : st));
        }
      }, speed);
    },
    [speed, stage.id, onClear],
  );

  const handleRunBlocks = () => {
    reset();
    const result = run(stage, blocks);
    playTrace(result.trace, () => starsFor(stage, countBlocks(blocks)));
  };

  const handleRunCode = async () => {
    reset();
    setStatus('compiling');
    const result = await runC(stage.id, code);
    if (!result.ok || !result.trace) {
      setStatus('editing');
      setCodeError(result.error ?? 'じっこうに しっぱいしました');
      return;
    }
    setCodeError(null);
    const trace = result.trace;
    playTrace(trace, () => {
      const score = stage.puzzle ? traceSwaps(trace) : traceSteps(trace);
      setLastScore(score);
      return starsFor(stage, score);
    });
  };

  const busy = status === 'running' || status === 'compiling';

  return (
    <div className="play-screen">
      <header className="play-header">
        <button onClick={onBack}>← もどる</button>
        <h2>{stage.name}</h2>
        <span className="hint">💡 {stage.hint}</span>
      </header>
      <div className="play-main">
        <div className="board-pane">
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
            />
          )}
          <div className="controls">
            {stage.mode === 'block' ? (
              <button
                className="run-btn"
                onClick={handleRunBlocks}
                disabled={busy || blocks.length === 0}
              >
                ▶ じっこう
              </button>
            ) : (
              <button className="run-btn" onClick={handleRunCode} disabled={busy}>
                ▶ 実行
              </button>
            )}
            <button onClick={reset}>⟲ りせっと</button>
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
            <p className={`status status-${status}`}>{STATUS_MESSAGE[status]}</p>
          )}
        </div>
        <div className="editor-pane">
          {stage.mode === 'block' ? (
            <BlockEditor
              allowed={stage.allowedBlocks}
              blocks={blocks}
              onChange={setBlocks}
              disabled={busy}
              selectedContainerId={selectedContainerId}
              onSelectContainer={setSelectedContainerId}
            />
          ) : (
            <CodeEditor code={code} onChange={setCode} disabled={busy} error={codeError} />
          )}
        </div>
      </div>
      {status === 'goal' && stars !== null && (
        <div className="clear-overlay">
          <div className="clear-dialog">
            <h2>クリア!</h2>
            <p className="clear-stars">
              {'★'.repeat(stars)}
              <span className="star-empty">{'★'.repeat(3 - stars)}</span>
            </p>
            {stage.mode === 'block' ? (
              <p>つかったブロック: {countBlocks(blocks)}こ</p>
            ) : stage.puzzle ? (
              <p>交換(swap)回数: {lastScore}回</p>
            ) : (
              <p>実行ステップ数: {lastScore}</p>
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
