import { useState } from 'react';
import type { Block } from '../game/types';
import { BLOCK_LABEL } from './BlockEditor';

interface CodeProps {
  solution: string;
  solutionBlocks?: undefined;
  onPaste: () => void;
  onLoad?: undefined;
  onClose: () => void;
}

interface BlockProps {
  solution?: undefined;
  solutionBlocks: Block[];
  onPaste?: undefined;
  onLoad: () => void;
  onClose: () => void;
}

type Props = CodeProps | BlockProps;

/** 模範解答のブロック列をネスト表示する(初級) */
function BlockSolutionList({ blocks }: { blocks: Block[] }) {
  return (
    <ul className="solution-blocks">
      {blocks.map((b) => (
        <li key={b.id} className="solution-block-item">
          <span className={`solution-block-label block block-${b.kind}`}>
            {BLOCK_LABEL[b.kind]}
            {b.kind === 'repeat' && ` ×${b.times ?? 1}`}
          </span>
          {b.body && b.body.length > 0 && <BlockSolutionList blocks={b.body} />}
        </li>
      ))}
    </ul>
  );
}

/** 解答例を表示するモーダル。上級はCコード(コピー・エディタへの貼り付け)、
 *  初級はブロック列(ネスト表示・ワークスペースへならべる)を表示する */
export function SolutionModal(props: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!props.solution) return;
    try {
      await navigator.clipboard.writeText(props.solution);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  };

  return (
    <div className="clear-overlay" onClick={props.onClose}>
      <div className="clear-dialog solution-modal" onClick={(e) => e.stopPropagation()}>
        <h2>解答例</h2>
        {props.solutionBlocks ? (
          <BlockSolutionList blocks={props.solutionBlocks} />
        ) : (
          <pre className="solution-code">{props.solution}</pre>
        )}
        <div className="clear-actions">
          {props.solutionBlocks ? (
            <button className="run-btn" onClick={props.onLoad}>
              ワークスペースに ならべる
            </button>
          ) : (
            <>
              <button onClick={handleCopy}>{copied ? '✓ コピーしました' : '📋 コピー'}</button>
              <button className="run-btn" onClick={props.onPaste}>
                エディタに貼り付ける
              </button>
            </>
          )}
          <button onClick={props.onClose}>とじる</button>
        </div>
      </div>
    </div>
  );
}
