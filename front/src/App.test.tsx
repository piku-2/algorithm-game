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
    await user.click(screen.getByRole('button', { name: '▶ うごかす!' }));

    // 再生アニメーション(300ms/step × 3イベント + クリアダイアログの表示遅延)を待ってクリア表示
    await waitFor(() => expect(screen.getByText('クリア!')).toBeTruthy(), { timeout: 5000 });
    // 2ブロック(★3しきい値=2)なので星3(★は1つずつポップインするため個別のspanで描画される)
    expect(document.querySelector('.clear-stars')?.textContent).toBe('★★★');

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

// IO問題(標準入出力問題)のフロー: バックエンド API をモックし、
// 問題文表示 → 実行 → テスト結果表示 → クリアまでを通す。
describe('IO問題のフロー', () => {
  const ioStageJson = {
    id: 'c901',
    name: 'たしざん',
    mode: 'code',
    rows: [],
    start: { x: 0, y: 0, dir: 'right' },
    allowedBlocks: [],
    starThresholds: [1, 1],
    maxSteps: 100,
    hint: '標準入力から2つの整数を読もう',
    statement: '2つの整数 A と B が与えられます。A + B を出力してください。',
    solution: '#include <stdio.h>\nint main(void){int a,b;scanf("%d %d",&a,&b);printf("%d\\n",a+b);return 0;}\n',
    io: {
      inputFormat: 'A B',
      outputFormat: 'A + B を1行で出力',
      constraints: '1 ≦ A, B ≦ 100',
      samples: [{ input: '1 2', output: '3', note: '1 + 2 = 3 です。' }],
      hiddenTests: [{ input: '10 20', output: '30' }],
    },
  };

  const ioCases = [
    { name: '入力例 1', pass: true, input: '1 2', expected: '3', actual: '3' },
    { name: 'テスト 1', pass: true, input: '10 20', expected: '30', actual: '30' },
  ];

  const jsonResponse = (data: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/stages')) return jsonResponse([ioStageJson]);
        if (url.includes('/api/run/c')) {
          return jsonResponse({ ok: true, cleared: true, ioCases });
        }
        if (url.includes('/api/progress')) return jsonResponse({});
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }),
    );
  });

  it('問題文表示 → 実行 → テスト結果表示 → クリアできる', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /上級/ }));
    // API から取得したステージ一覧が反映されるのを待つ
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /たしざん/ })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: /たしざん/ }));

    // 問題文パネル: 問題文・入出力仕様・入出力例が表示される
    expect(screen.getByText(/A \+ B を出力してください/)).toBeTruthy();
    expect(screen.getByText('入力形式')).toBeTruthy();
    expect(screen.getByText('出力形式')).toBeTruthy();
    expect(screen.getByText('制約')).toBeTruthy();
    expect(screen.getByText('入力例 1')).toBeTruthy();
    expect(screen.getByText(/1 \+ 2 = 3 です/)).toBeTruthy();
    // io ステージではトレース再生用の UI(ステップ・はやさ)を出さない
    expect(screen.queryByRole('button', { name: /ステップ/ })).toBeNull();
    expect(screen.queryByText('はやさ')).toBeNull();

    // 実行 → 全ケース合格 → クリアダイアログ(★3)
    await user.click(screen.getByRole('button', { name: '▶ 実行' }));
    await waitFor(() => expect(screen.getByText('テスト結果')).toBeTruthy());
    const passItems = [...document.querySelectorAll('.io-case-pass')].map(
      (el) => el.textContent,
    );
    expect(passItems).toEqual(['✓ 入力例 1', '✓ テスト 1']);
    await waitFor(() => expect(screen.getByText('クリア!')).toBeTruthy(), { timeout: 5000 });
    expect(document.querySelector('.clear-stars')?.textContent).toBe('★★★');
    expect(screen.getByText('全てのテストケースに合格!')).toBeTruthy();

    // 進捗が localStorage に保存される
    const saved = JSON.parse(localStorage.getItem('algorithm-game-progress') ?? '{}');
    expect(saved.c901).toBe(3);
  });

  it('不合格ケースは入力・期待・実際の出力を表示する', async () => {
    const failCases = [
      { name: '入力例 1', pass: true, input: '1 2', expected: '3', actual: '3' },
      { name: 'テスト 1', pass: false, input: '10 20', expected: '30', actual: '31' },
    ];
    (fetch as ReturnType<typeof vi.fn>).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/stages')) return jsonResponse([ioStageJson]);
      if (url.includes('/api/run/c')) {
        return jsonResponse({ ok: true, cleared: false, ioCases: failCases });
      }
      if (url.includes('/api/progress')) return jsonResponse({});
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    });

    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /上級/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /たしざん/ })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: /たしざん/ }));
    await user.click(screen.getByRole('button', { name: '▶ 実行' }));

    await waitFor(() => expect(screen.getByText('テスト結果')).toBeTruthy());
    expect(document.querySelector('.io-case-fail')?.textContent).toBe('✗ テスト 1');
    // 失敗ケースの詳細(期待した出力と実際の出力)
    expect(screen.getByText('期待した出力')).toBeTruthy();
    expect(screen.getByText('実際の出力')).toBeTruthy();
    expect(screen.getByText('31')).toBeTruthy();
    // クリアにはならない
    expect(screen.queryByText('クリア!')).toBeNull();
    expect(screen.getByText(/不正解のケースがある/)).toBeTruthy();
  });

  it('解答例ボタン: 確認をはさんでモーダル表示 → エディタに貼り付けられる', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /上級/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /たしざん/ })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: /たしざん/ }));

    await user.click(screen.getByRole('button', { name: /解答例を見る/ }));
    // まず確認ダイアログ
    expect(screen.getByText('自分で考えてから見よう!')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '見る' }));
    // 模範解答コードのモーダル
    expect(screen.getByRole('heading', { name: '解答例' })).toBeTruthy();
    expect(document.querySelector('.solution-code')?.textContent).toContain('scanf');
    // エディタに貼り付け → モーダルが閉じてエディタへ反映
    await user.click(screen.getByRole('button', { name: 'エディタに貼り付ける' }));
    expect(screen.queryByRole('heading', { name: '解答例' })).toBeNull();
    expect(document.querySelector('.cm-content')?.textContent).toContain('scanf');
  });
});

// ステージ選択から「もどる」/「つぎのステージへ」で戻ったとき、直前に
// プレイしていたステージのページが開いた状態で表示されることを確認する。
describe('ステージ選択のページ復帰', () => {
  // 1ページ目(20問)と2ページ目(5問)にまたがる、合計25問のブロックステージ
  const pagedStages = Array.from({ length: 25 }, (_, i) => ({
    id: `p${String(i + 1).padStart(3, '0')}`,
    name: `ページテスト${i + 1}`,
    mode: 'block',
    rows: ['.G'],
    start: { x: 0, y: 0, dir: 'right' },
    allowedBlocks: ['move'],
    starThresholds: [1, 1],
    maxSteps: 10,
  }));

  const jsonResponse = (data: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

  // ステージ番号が接頭辞被り(1 と 10-19 等)するため、stage-name の完全一致で
  // カードを特定してクリックする(getByRole の name はアクセシブル名 = 番号込みの
  // 全文になり曖昧マッチしてしまうため)
  const clickStageCard = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
    const card = screen.getByText(name, { selector: '.stage-name' }).closest('button');
    if (!card) throw new Error(`stage card not found: ${name}`);
    await user.click(card);
  };

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/stages')) return jsonResponse(pagedStages);
        if (url.includes('/api/progress')) return jsonResponse({});
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }),
    );
  });

  it('2ページ目のステージから「もどる」で戻ると2ページ目が開く', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /しょきゅう/ }));

    await waitFor(() => expect(screen.getByText('ページテスト1')).toBeTruthy());
    // 21問目(index 20)は2ページ目の先頭 → 先に2ページ目へ移動してから選ぶ
    await user.click(screen.getByRole('button', { name: 'つぎ →' }));
    expect(screen.getByText(/2 \/ 2/)).toBeTruthy();
    await clickStageCard(user, 'ページテスト21');

    expect(screen.getByRole('heading', { name: 'ページテスト21' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '← もどる' }));

    // ステージ選択に戻ったとき、1ページ目ではなく2ページ目が開いている
    expect(screen.getByText(/2 \/ 2/)).toBeTruthy();
    expect(screen.getByText('ページテスト21')).toBeTruthy();
    expect(screen.queryByText('ページテスト1')).toBeNull();
  });

  it('「つぎのステージへ」で2ページ目に進んだ後「もどる」でも2ページ目に戻る', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /しょきゅう/ }));

    await waitFor(() => expect(screen.getByText('ページテスト20')).toBeTruthy());
    // 1ページ目の最後(20問目)を選び、実行してクリアしてから「つぎのステージへ」
    await clickStageCard(user, 'ページテスト20');
    await user.click(screen.getByRole('button', { name: '+ まえにすすむ' }));
    await user.click(screen.getByRole('button', { name: '▶ うごかす!' }));
    await waitFor(() => expect(screen.getByText('クリア!')).toBeTruthy(), { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: 'つぎのステージ →' }));

    // 21問目(2ページ目の先頭)に進んでいる
    expect(screen.getByRole('heading', { name: 'ページテスト21' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '← もどる' }));

    expect(screen.getByText(/2 \/ 2/)).toBeTruthy();
    expect(screen.getByText('ページテスト21')).toBeTruthy();
  });
});

// 初級(ブロックモード)の解答例ボタン: 確認をはさんでネスト表示のモーダルを
// 表示し、「ワークスペースに ならべる」でブロック列を読み込めることを確認する。
describe('初級の解答例(ブロック)', () => {
  const blockSolutionStage = {
    id: 's001',
    name: 'かいとうれい',
    mode: 'block',
    rows: ['....G'],
    start: { x: 0, y: 0, dir: 'right' },
    allowedBlocks: ['move', 'repeat'],
    starThresholds: [1, 2],
    maxSteps: 20,
    solutionBlocks: [
      { kind: 'move' },
      { kind: 'repeat', times: 2, body: [{ kind: 'move' }] },
    ],
  };

  const jsonResponse = (data: unknown) =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/stages')) return jsonResponse([blockSolutionStage]);
        if (url.includes('/api/progress')) return jsonResponse({});
        return Promise.reject(new Error(`unexpected fetch: ${url}`));
      }),
    );
  });

  it('確認ダイアログ→モーダル表示→ワークスペースに読み込める', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /しょきゅう/ }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /かいとうれい/ })).toBeTruthy(),
    );
    await user.click(screen.getByRole('button', { name: /かいとうれい/ }));

    await user.click(screen.getByRole('button', { name: /解答例を見る/ }));
    expect(screen.getByText('自分で考えてから見よう!')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '見る' }));

    // 模範解答のブロック列がネスト表示される
    expect(screen.getByRole('heading', { name: '解答例' })).toBeTruthy();
    expect(document.querySelector('.solution-blocks')?.textContent).toContain('くりかえす ×2');

    // ワークスペースに読み込む
    await user.click(screen.getByRole('button', { name: 'ワークスペースに ならべる' }));
    expect(screen.queryByRole('heading', { name: '解答例' })).toBeNull();
    const workspace = document.querySelector('.workspace');
    expect(workspace?.textContent).toContain('まえにすすむ');
    expect(workspace?.textContent).toContain('くりかえす');
  });
});
