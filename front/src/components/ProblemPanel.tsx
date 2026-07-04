import { useState } from 'react';
import type { IoProblem } from '../game/types';

interface Props {
  /** 問題文本文(上級ステージ共通) */
  statement?: string;
  /** IO問題の入出力仕様。ある場合は入力/出力形式・制約・入出力例も表示する */
  io?: IoProblem;
  /** 折りたたみ可能にする(ナビ・配列ステージでの表示用。IO問題では常に展開) */
  collapsible?: boolean;
}

/** 上級ステージの問題文パネル。IO問題では入出力仕様・例も併せて表示する */
export function ProblemPanel({ statement, io, collapsible }: Props) {
  const [open, setOpen] = useState(!collapsible);
  if (!statement && !io) return null;
  return (
    <div className="problem-panel">
      {collapsible && (
        <button
          type="button"
          className="problem-toggle"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? '▾ 問題文を とじる' : '▸ 問題文を みる'}
        </button>
      )}
      {open && (
        <div className="problem-body">
          {statement && <p className="problem-statement">{statement}</p>}
          {io && (
            <div className="io-spec">
              <h4>入力形式</h4>
              <p>{io.inputFormat}</p>
              <h4>出力形式</h4>
              <p>{io.outputFormat}</p>
              <h4>制約</h4>
              <p>{io.constraints}</p>
              <h4>入出力例</h4>
              {io.samples.map((s, i) => (
                <div key={i} className="io-sample">
                  <div className="io-sample-grid">
                    <div>
                      <p className="io-label">入力例 {i + 1}</p>
                      <pre className="io-code">{s.input}</pre>
                    </div>
                    <div>
                      <p className="io-label">出力例 {i + 1}</p>
                      <pre className="io-code">{s.output}</pre>
                    </div>
                  </div>
                  {s.note && <p className="io-sample-note">{s.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
