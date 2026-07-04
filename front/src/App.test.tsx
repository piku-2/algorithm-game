import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// バックエンドなし(フォールバック)の状態で、タイトル → ステージ選択 →
// ブロックを組んで実行 → クリアまでの一連の画面フローを通す E2E 相当テスト。
describe('画面フロー', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('backend down'))),
    );
  });

  it('タイトル → ステージ選択 → ブロックでクリアできる', async () => {
    const user = userEvent.setup();
    render(<App />);

    // タイトル
    await user.click(screen.getByRole('button', { name: /しょきゅう/ }));

    // ステージ選択(1ページ目の最初のステージ)
    expect(screen.getByText(/ステージをえらぼう/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /はじめのいっぽ/ }));

    // プレイ画面: 「まえにすすむ」を2回追加して実行
    expect(screen.getByRole('heading', { name: 'はじめのいっぽ' })).toBeTruthy();
    const addMove = screen.getByRole('button', { name: '+ まえにすすむ' });
    await user.click(addMove);
    await user.click(addMove);
    await user.click(screen.getByRole('button', { name: '▶ じっこう' }));

    // 再生アニメーション(300ms/step × 3イベント)を待ってクリア表示
    await waitFor(() => expect(screen.getByText('クリア!')).toBeTruthy(), { timeout: 5000 });
    // 2ブロック(★3しきい値=2)なので星3
    expect(screen.getByText('★★★')).toBeTruthy();

    // 進捗が localStorage に保存される
    const saved = JSON.parse(localStorage.getItem('algorithm-game-progress') ?? '{}');
    expect(saved.b001).toBe(3);
  });

  it('上級モードにコードエディタが表示される', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /上級/ }));
    await user.click(screen.getByRole('button', { name: /まっすぐすすめ/ }));
    expect(screen.getByText('main.c')).toBeTruthy();
    expect(screen.getByRole('button', { name: '▶ 実行' })).toBeTruthy();
  });
});
