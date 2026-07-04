import { useEffect, useRef } from 'react';
import { basicSetup, EditorView } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

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
