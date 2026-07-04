import type { IoCaseResult } from '../game/api';

interface Props {
  cases: IoCaseResult[];
}

/** IO問題の実行結果(ケースごとの合否 + 失敗ケースの入力/期待値/実際の出力) */
export function IoResultPanel({ cases }: Props) {
  const failed = cases.filter((c) => !c.pass);
  return (
    <div className="io-result-panel">
      <h4>テスト結果</h4>
      <ul className="io-case-list">
        {cases.map((c, i) => (
          <li key={`${c.name}-${i}`} className={c.pass ? 'io-case-pass' : 'io-case-fail'}>
            <span className="io-case-mark">{c.pass ? '✓' : '✗'}</span> {c.name}
          </li>
        ))}
      </ul>
      {failed.map((c, i) => (
        <div key={`${c.name}-detail-${i}`} className="io-case-detail">
          <p className="io-case-detail-title">✗ {c.name}</p>
          <div className="io-case-detail-grid">
            <div>
              <p className="io-label">入力</p>
              <pre className="io-code">{c.input}</pre>
            </div>
            <div>
              <p className="io-label">期待した出力</p>
              <pre className="io-code">{c.expected}</pre>
            </div>
            <div>
              <p className="io-label">実際の出力</p>
              <pre className="io-code">{c.actual}</pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
