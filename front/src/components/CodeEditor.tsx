import { useEffect, useRef } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { cpp, cppLanguage } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { indentOnInput, indentService, indentUnit } from '@codemirror/language';

/** 1つ分のインデント幅(4スペース) */
const INDENT_UNIT = '    ';

/**
 * コメント・文字列リテラルの中身を空白に置き換える(中の `{` `}` を
 * インデント計算に数えないようにするための簡易マスク。C言語の範囲では十分)
 */
function maskStrings(text: string): string {
  return text.replace(/\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
}

/**
 * `{` `}` の対応にもとづいて行のインデント段数を決める(C言語用の簡易実装)。
 * lang-cpp の lezer 文法はインデント情報(indentNodeProp)を持たないため、
 * CodeMirror 標準の言語インデントだけでは Enter や `}` 入力時に
 * インデントが揃わない。そのため中括弧の深さを数える独自ロジックで補う。
 */
function cIndentDepth(state: EditorState, pos: number): number {
  const doc = state.doc;
  const line = doc.lineAt(pos);
  const before = maskStrings(doc.sliceString(0, line.from));
  let depth = 0;
  for (const ch of before) {
    if (ch === '{') depth++;
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  const restOfLine = maskStrings(doc.sliceString(pos, line.to)).trimStart();
  if (restOfLine.startsWith('}')) depth = Math.max(0, depth - 1);
  return depth;
}

const cIndentService = indentService.of((context, pos) => context.unit * cIndentDepth(context.state, pos));

/** `}` を行頭に入力した瞬間にその行を再インデントする */
const reindentClosingBrace = cppLanguage.data.of({ indentOnInput: /^\s*\}$/ });

interface Props {
  code: string;
  onChange: (code: string) => void;
  disabled: boolean;
  error: string | null;
}

/** 上級モードの C 言語エディタ(CodeMirror + C シンタックスハイライト) */
export function CodeEditor({ code, onChange, disabled, error }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readonlyRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: code,
        extensions: [
          basicSetup,
          cpp(),
          indentUnit.of(INDENT_UNIT),
          cIndentService,
          indentOnInput(),
          reindentClosingBrace,
          oneDark,
          readonlyRef.current.of(EditorState.readOnly.of(false)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // 初期表示時のみ生成(以後の code 変更は下の effect で同期)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (view.state.doc.toString() !== code) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    }
  }, [code]);

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readonlyRef.current.reconfigure(EditorState.readOnly.of(disabled)),
    });
  }, [disabled]);

  return (
    <div className="code-editor">
      <h3>main.c</h3>
      <div ref={containerRef} className="cm-container" />
      {error && <pre className="code-error">{error}</pre>}
    </div>
  );
}
