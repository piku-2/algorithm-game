/**
 * 標準入出力問題(IO問題)45問のデータ。
 * paiza/AtCoder ABC-A,B 風のオリジナル問題(著作権上、文章・データは完全新規に書き下ろす)。
 * gen-stages.ts から import され、solution を gcc でコンパイルして
 * samples + hiddenTests の全ケースを実行検証したうえでステージ化される。
 *
 * rank は 1(易)〜10(難)のおおまかな難易度。ナビ/配列問題と混ぜて出題順を決めるのに使う。
 */

export interface IoSampleSpec {
  input: string;
  output: string;
  note?: string;
}

export interface IoProblemSpec {
  /** ステージ id の一部に使うスラッグ(英数字) */
  slug: string;
  name: string;
  rank: number;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  samples: IoSampleSpec[];
  hiddenTests: { input: string; output: string }[];
  solution: string;
  template: string;
}

export const IO_PROBLEMS: IoProblemSpec[] = [
  // ============== A. 入力を読んで計算 (rank 1-2) ==============
  {
    slug: 'change',
    name: 'おつりの計算',
    rank: 1,
    statement:
      '駄菓子屋さんのレジ係になった。品物の値段と払われた金額が与えられるので、おつりの金額を求めよう。',
    inputFormat: '1行目に 品物の値段 price と 支払われた金額 pay が空白区切りで与えられる。',
    outputFormat: 'おつり(pay - price)を1行に出力する。',
    constraints: '1 ≦ price ≦ pay ≦ 1000000',
    samples: [
      { input: '300 500', output: '200', note: '500円払って300円の品物を買うと、おつりは200円。' },
      { input: '1200 1200', output: '0' },
    ],
    hiddenTests: [
      { input: '1 1000000', output: '999999' },
      { input: '100000 100000', output: '0' },
      { input: '99999 100000', output: '1' },
      { input: '1 1', output: '0' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int price, pay;
    scanf("%d %d", &price, &pay);
    printf("%d\\n", pay - price);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 品物の値段 price と支払われた金額 pay から、おつりを求めて出力しよう。

int main(void) {
    int price, pay;
    scanf("%d %d", &price, &pay);

    // ここにおつりを計算する処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'rect-area',
    name: '長方形の花だんの面積',
    rank: 1,
    statement:
      '学校の花だんは長方形をしている。たての長さと横の長さが与えられるので、面積を求めよう。',
    inputFormat: '1行目に 横の長さ W と たての長さ H が空白区切りで与えられる。',
    outputFormat: '面積(W×H)を1行に出力する。',
    constraints: '1 ≦ W, H ≦ 1000',
    samples: [
      { input: '3 4', output: '12', note: '横3・たて4の長方形なので面積は3×4=12。' },
      { input: '1 1', output: '1' },
    ],
    hiddenTests: [
      { input: '1000 1000', output: '1000000' },
      { input: '7 13', output: '91' },
      { input: '1 1000', output: '1000' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);
    printf("%d\\n", w * h);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 横の長さ W とたての長さ H から、長方形の面積を求めて出力しよう。

int main(void) {
    int w, h;
    scanf("%d %d", &w, &h);

    // ここに面積を計算する処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'arrival-time',
    name: '駅までの到着時間',
    rank: 1,
    statement:
      '家から駅までの道のり(メートル)と、1分間に歩ける距離(メートル)が与えられる。' +
      '駅に着くまでに何分かかるかを求めよう。ぴったり割り切れないときは、その分の終わりまで歩き続けるので切り上げになる。',
    inputFormat: '1行目に 道のり distance と 分速 speed が空白区切りで与えられる。',
    outputFormat: '到着までにかかる分数(切り上げ)を1行に出力する。',
    constraints: '1 ≦ distance ≦ 100000、1 ≦ speed ≦ 1000',
    samples: [
      { input: '1000 300', output: '4', note: '1000÷300=3.33…なので、4分目で駅に着く。' },
      { input: '900 300', output: '3' },
    ],
    hiddenTests: [
      { input: '1 1', output: '1' },
      { input: '100000 1', output: '100000' },
      { input: '7 2', output: '4' },
      { input: '300 300', output: '1' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int distance, speed;
    scanf("%d %d", &distance, &speed);
    // 切り上げ割り算: (a + b - 1) / b
    printf("%d\\n", (distance + speed - 1) / speed);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 道のり distance を分速 speed で歩くとき、到着まで何分かかるか(切り上げ)を出力しよう。

int main(void) {
    int distance, speed;
    scanf("%d %d", &distance, &speed);

    // ここに切り上げ割り算の処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'apple-box',
    name: 'りんごの箱づめ',
    rank: 2,
    statement:
      '収穫したりんごを箱につめる。りんごの個数と、箱1つに入る個数が与えられるので、' +
      '全部つめるのに箱がいくつ必要かを求めよう。最後の箱が満タンでなくても1箱と数える。',
    inputFormat: '1行目に りんごの個数 n と 箱1つに入る個数 c が空白区切りで与えられる。',
    outputFormat: '必要な箱の数を1行に出力する。',
    constraints: '1 ≦ n, c ≦ 100000',
    samples: [
      { input: '10 3', output: '4', note: '3個ずつ3箱(9個)につめても1個余るので、箱は4つ必要。' },
      { input: '9 3', output: '3' },
    ],
    hiddenTests: [
      { input: '1 1', output: '1' },
      { input: '100000 1', output: '100000' },
      { input: '1 100000', output: '1' },
      { input: '7 5', output: '2' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n, c;
    scanf("%d %d", &n, &c);
    printf("%d\\n", (n + c - 1) / c);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: りんご n 個を、1箱 c 個入る箱につめるとき、必要な箱の数(切り上げ)を出力しよう。

int main(void) {
    int n, c;
    scanf("%d %d", &n, &c);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'triangle-perimeter',
    name: '三角形のまわりの長さ',
    rank: 2,
    statement: '三角形の3辺の長さが与えられるので、まわりの長さ(周囲の合計)を求めよう。',
    inputFormat: '1行目に3辺の長さ a b c が空白区切りで与えられる。',
    outputFormat: 'まわりの長さ(a+b+c)を1行に出力する。',
    constraints: '1 ≦ a, b, c ≦ 1000',
    samples: [
      { input: '3 4 5', output: '12', note: '3+4+5=12。' },
      { input: '1 1 1', output: '3' },
    ],
    hiddenTests: [
      { input: '1000 1000 1000', output: '3000' },
      { input: '2 3 4', output: '9' },
      { input: '1 2 2', output: '5' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    printf("%d\\n", a + b + c);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 三角形の3辺 a, b, c からまわりの長さを求めて出力しよう。

int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'temp-diff',
    name: '2つの気温の差',
    rank: 2,
    statement:
      '朝と昼の気温(℃、マイナスもありうる)が与えられる。2つの気温の差(絶対値)を求めよう。',
    inputFormat: '1行目に 朝の気温 t1 と 昼の気温 t2 が空白区切りで与えられる(整数、負の数もある)。',
    outputFormat: '気温の差(|t1 - t2|)を1行に出力する。',
    constraints: '-50 ≦ t1, t2 ≦ 50',
    samples: [
      { input: '30 25', output: '5', note: '朝30℃・昼25℃なら差は5℃。' },
      { input: '-3 5', output: '8', note: '-3℃と5℃の差は8℃。' },
    ],
    hiddenTests: [
      { input: '-50 50', output: '100' },
      { input: '0 0', output: '0' },
      { input: '10 -10', output: '20' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int t1, t2;
    scanf("%d %d", &t1, &t2);
    int diff = t1 - t2;
    if (diff < 0) diff = -diff;
    printf("%d\\n", diff);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 2つの気温 t1, t2 の差(絶対値)を出力しよう。

int main(void) {
    int t1, t2;
    scanf("%d %d", &t1, &t2);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'library-books',
    name: '学級文庫のさっすう',
    rank: 2,
    statement:
      'クラスの学級文庫には、もともとの冊数があり、そこに寄付された本が加わり、' +
      '貸し出し中でまだ戻っていない本がある。いま本だなに並んでいる冊数を求めよう。',
    inputFormat: '1行目に もとの冊数 a、寄付された冊数 b、貸し出し中の冊数 c が空白区切りで与えられる。',
    outputFormat: '今ある冊数(a + b - c)を1行に出力する。',
    constraints: '0 ≦ a, b, c ≦ 100000、c ≦ a + b',
    samples: [
      { input: '50 10 5', output: '55', note: 'もとの50冊+寄付10冊-貸し出し中5冊=55冊。' },
      { input: '100 0 100', output: '0' },
    ],
    hiddenTests: [
      { input: '0 0 0', output: '0' },
      { input: '100000 100000 200000', output: '0' },
      { input: '1 1 0', output: '2' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    printf("%d\\n", a + b - c);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: もとの冊数 a、寄付 b、貸し出し中 c から、今ある冊数を求めて出力しよう。

int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== B. 条件分岐 (rank 2-3) ==============
  {
    slug: 'signal-color',
    name: '信号機の色',
    rank: 2,
    statement: '信号機の状態が数字で与えられる。0なら赤、1なら黄、2なら青を表す。色を日本語で出力しよう。',
    inputFormat: '1行目に信号の状態を表す整数 s(0, 1, 2 のいずれか)が与えられる。',
    outputFormat: 's が 0 なら「赤」、1 なら「黄」、2 なら「青」を1行に出力する。',
    constraints: 's は 0, 1, 2 のいずれか',
    samples: [
      { input: '0', output: '赤', note: '0は赤信号を表す。' },
      { input: '2', output: '青' },
    ],
    hiddenTests: [
      { input: '1', output: '黄' },
      { input: '0', output: '赤' },
      { input: '2', output: '青' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int s;
    scanf("%d", &s);
    if (s == 0) {
        printf("赤\\n");
    } else if (s == 1) {
        printf("黄\\n");
    } else {
        printf("青\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 信号の状態 s(0=赤 1=黄 2=青)に応じて色の名前を出力しよう。

int main(void) {
    int s;
    scanf("%d", &s);

    // ここに if / else の処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'tax-total',
    name: '消費税込みの合計金額',
    rank: 2,
    statement:
      'コンビニのレジで、商品の値段と「食品かどうか」が与えられる。食品(1)なら消費税8%、' +
      'それ以外(0)なら消費税10%を加えた合計金額(端数切り捨て)を求めよう。',
    inputFormat: '1行目に 値段 price と 食品なら1・食品でなければ0 の flag が空白区切りで与えられる。',
    outputFormat: '税込み合計金額(端数切り捨て)を1行に出力する。',
    constraints: '1 ≦ price ≦ 100000、flag は 0 か 1',
    samples: [
      { input: '100 1', output: '108', note: '食品なので8%の消費税がかかり、100+8=108円。' },
      { input: '100 0', output: '110' },
    ],
    hiddenTests: [
      { input: '1 1', output: '1' },
      { input: '1 0', output: '1' },
      { input: '100000 1', output: '108000' },
      { input: '99999 0', output: '109998' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int price, flag;
    scanf("%d %d", &price, &flag);
    int rate = flag == 1 ? 8 : 10;
    int total = price + price * rate / 100;
    printf("%d\\n", total);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 値段 price と食品フラグ flag(1=食品/税率8%, 0=それ以外/税率10%)から
//       税込み合計金額(端数切り捨て)を出力しよう。

int main(void) {
    int price, flag;
    scanf("%d %d", &price, &flag);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'leap-year',
    name: 'うるう年かどうかの判定',
    rank: 3,
    statement:
      '西暦の年が与えられるので、うるう年かどうかを判定しよう。' +
      '4で割り切れる年はうるう年だが、100で割り切れる年はうるう年ではない。ただし400で割り切れる年はうるう年である。',
    inputFormat: '1行目に西暦年 year が与えられる。',
    outputFormat: 'うるう年なら「うるう年」、そうでなければ「へいねん」を1行に出力する。',
    constraints: '1 ≦ year ≦ 9999',
    samples: [
      { input: '2024', output: 'うるう年', note: '2024は4で割り切れて100では割り切れないので、うるう年。' },
      { input: '2023', output: 'へいねん' },
    ],
    hiddenTests: [
      { input: '2000', output: 'うるう年' },
      { input: '1900', output: 'へいねん' },
      { input: '2400', output: 'うるう年' },
      { input: '1', output: 'へいねん' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int year;
    scanf("%d", &year);
    int leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    if (leap) {
        printf("うるう年\\n");
    } else {
        printf("へいねん\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 西暦 year がうるう年かどうか判定して出力しよう。
//       (4で割り切れる。ただし100で割り切れる年は除く。ただし400で割り切れる年はうるう年)

int main(void) {
    int year;
    scanf("%d", &year);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'janken',
    name: 'じゃんけんの勝敗',
    rank: 3,
    statement:
      'AさんとBさんがじゃんけんをした。手は 0=グー, 1=チョキ, 2=パー で表される。' +
      '勝敗を判定しよう。',
    inputFormat: '1行目に Aさんの手 a と Bさんの手 b が空白区切りで与えられる。',
    outputFormat: 'Aの勝ちなら「Aのかち」、Bの勝ちなら「Bのかち」、引き分けなら「あいこ」を1行に出力する。',
    constraints: 'a, b は 0, 1, 2 のいずれか',
    samples: [
      { input: '0 1', output: 'Aのかち', note: 'グー(0)はチョキ(1)に勝つので、Aの勝ち。' },
      { input: '1 1', output: 'あいこ' },
    ],
    hiddenTests: [
      { input: '0 0', output: 'あいこ' },
      { input: '2 0', output: 'Aのかち' },
      { input: '0 2', output: 'Bのかち' },
      { input: '1 2', output: 'Aのかち' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    if (a == b) {
        printf("あいこ\\n");
    } else if ((a + 1) % 3 == b) {
        printf("Aのかち\\n");
    } else {
        printf("Bのかち\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 手 a, b (0=グー 1=チョキ 2=パー)から、じゃんけんの勝敗を判定して出力しよう。

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'lottery',
    name: '席替えの当たりくじ',
    rank: 3,
    statement:
      '席替えで、自分の出席番号 n と、当たりの範囲(lo から hi まで)が与えられる。' +
      '自分の番号が当たりの範囲に入っているか判定しよう。',
    inputFormat: '1行目に 出席番号 n、当たりの範囲の下限 lo、上限 hi が空白区切りで与えられる。',
    outputFormat: '範囲内(lo ≦ n ≦ hi)なら「あたり」、そうでなければ「はずれ」を1行に出力する。',
    constraints: '1 ≦ lo ≦ hi ≦ 1000、1 ≦ n ≦ 1000',
    samples: [
      { input: '15 10 20', output: 'あたり', note: '15は10以上20以下なので当たり。' },
      { input: '5 10 20', output: 'はずれ' },
    ],
    hiddenTests: [
      { input: '10 10 20', output: 'あたり' },
      { input: '20 10 20', output: 'あたり' },
      { input: '21 10 20', output: 'はずれ' },
      { input: '1 1 1', output: 'あたり' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n, lo, hi;
    scanf("%d %d %d", &n, &lo, &hi);
    if (n >= lo && n <= hi) {
        printf("あたり\\n");
    } else {
        printf("はずれ\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 番号 n が範囲 [lo, hi] に入っているか判定して出力しよう。

int main(void) {
    int n, lo, hi;
    scanf("%d %d %d", &n, &lo, &hi);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'coupon',
    name: '割引クーポンの適用',
    rank: 3,
    statement:
      '買い物の合計金額が与えられる。1000円以上の買い物のときだけ、200円引きのクーポンが使える。' +
      '最終的な支払い金額を求めよう。',
    inputFormat: '1行目に 買い物の合計金額 price が与えられる。',
    outputFormat: '1000円以上なら price - 200、そうでなければ price をそのまま1行に出力する。',
    constraints: '1 ≦ price ≦ 100000',
    samples: [
      { input: '1500', output: '1300', note: '1500円は1000円以上なので200円引きで1300円。' },
      { input: '800', output: '800' },
    ],
    hiddenTests: [
      { input: '1000', output: '800' },
      { input: '999', output: '999' },
      { input: '100000', output: '99800' },
      { input: '1', output: '1' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int price;
    scanf("%d", &price);
    if (price >= 1000) {
        printf("%d\\n", price - 200);
    } else {
        printf("%d\\n", price);
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 合計金額 price が1000円以上なら200円引きにして出力しよう。

int main(void) {
    int price;
    scanf("%d", &price);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'sprint-grade',
    name: '50メートル走の記録判定',
    rank: 3,
    statement:
      '体育の授業で50メートル走のタイムを計測した。タイムは0.1秒単位の整数(例: 82は8.2秒)で与えられる。' +
      '記録に応じて評価を出そう。',
    inputFormat: '1行目にタイム t(0.1秒単位の整数)が与えられる。',
    outputFormat: 't ≦ 70 なら「A」、70 < t ≦ 90 なら「B」、それ以外なら「C」を1行に出力する。',
    constraints: '1 ≦ t ≦ 300',
    samples: [
      { input: '65', output: 'A', note: '65は6.5秒のこと。70(=7.0秒)以下なのでAランク。' },
      { input: '85', output: 'B' },
    ],
    hiddenTests: [
      { input: '70', output: 'A' },
      { input: '71', output: 'B' },
      { input: '90', output: 'B' },
      { input: '91', output: 'C' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int t;
    scanf("%d", &t);
    if (t <= 70) {
        printf("A\\n");
    } else if (t <= 90) {
        printf("B\\n");
    } else {
        printf("C\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: タイム t (0.1秒単位)からランク(A/B/C)を判定して出力しよう。

int main(void) {
    int t;
    scanf("%d", &t);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== C. ループ・集計 (rank 3-5) ==============
  {
    slug: 'quiz-total',
    name: '小テストの合計点',
    rank: 3,
    statement: '小テストを n 回受けた。それぞれの得点が与えられるので、合計点を求めよう。',
    inputFormat: '1行目にテストの回数 n。2行目に n 個の得点が空白区切りで与えられる。',
    outputFormat: '合計点を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ 得点 ≦ 100',
    samples: [
      { input: '3\n10 20 30', output: '60', note: '3回分の得点10+20+30=60点。' },
      { input: '1\n50', output: '50' },
    ],
    hiddenTests: [
      { input: '5\n100 100 100 100 100', output: '500' },
      { input: '1\n0', output: '0' },
      { input: '4\n0 100 50 25', output: '175' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int sum = 0;
    for (int i = 0; i < n; i++) {
        int score;
        scanf("%d", &score);
        sum += score;
    }
    printf("%d\\n", sum);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 回分の得点を読み込み、合計点を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここでループしながら得点を読み込み、合計を計算しよう

    return 0;
}
`,
  },
  {
    slug: 'club-attendance',
    name: '部活の出席記録',
    rank: 3,
    statement:
      '部活動の n 回分の出欠記録が与えられる。出席なら1、欠席なら0で表される。出席した回数を求めよう。',
    inputFormat: '1行目に回数 n。2行目に n 個の 0 か 1 が空白区切りで与えられる。',
    outputFormat: '出席した回数を1行に出力する。',
    constraints: '1 ≦ n ≦ 100',
    samples: [
      { input: '5\n1 0 1 1 0', output: '3', note: '5回のうち1(出席)は3つある。' },
      { input: '1\n0', output: '0' },
    ],
    hiddenTests: [
      { input: '10\n1 1 1 1 1 1 1 1 1 1', output: '10' },
      { input: '1\n1', output: '1' },
      { input: '6\n0 0 0 0 0 0', output: '0' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int count = 0;
    for (int i = 0; i < n; i++) {
        int a;
        scanf("%d", &a);
        if (a == 1) count++;
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 回分の出欠(1=出席, 0=欠席)を読み込み、出席回数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'library-lending',
    name: '図書室の貸出冊数',
    rank: 4,
    statement:
      '図書室では n 日間、毎日の貸出冊数を記録している。合計の貸出冊数と、' +
      '1日で10冊以上貸し出した日が何日あったかを求めよう。',
    inputFormat: '1行目に日数 n。2行目に n 個の貸出冊数が空白区切りで与えられる。',
    outputFormat: '1行目に合計冊数、2行目に10冊以上の日数を出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ 貸出冊数 ≦ 1000',
    samples: [
      { input: '3\n5 12 8', output: '25\n1', note: '合計は5+12+8=25冊。10冊以上の日は12冊の日の1日だけ。' },
      { input: '2\n3 4', output: '7\n0' },
    ],
    hiddenTests: [
      { input: '1\n0', output: '0\n0' },
      { input: '4\n10 10 9 20', output: '49\n3' },
      { input: '3\n1000 1000 1000', output: '3000\n3' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int total = 0, busyDays = 0;
    for (int i = 0; i < n; i++) {
        int c;
        scanf("%d", &c);
        total += c;
        if (c >= 10) busyDays++;
    }
    printf("%d\\n%d\\n", total, busyDays);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 日分の貸出冊数を読み込み、合計冊数と10冊以上の日数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'temperature-log',
    name: '気温の記録',
    rank: 4,
    statement:
      '1週間の毎日の気温(℃、マイナスもありうる)が与えられる。最高気温と最低気温を求めよう。',
    inputFormat: '1行目に記録した日数 n。2行目に n 個の気温が空白区切りで与えられる。',
    outputFormat: '最高気温と最低気温を空白区切りで1行に出力する(最高が先)。',
    constraints: '1 ≦ n ≦ 100、-50 ≦ 気温 ≦ 50',
    samples: [
      { input: '5\n23 19 25 17 21', output: '25 17', note: '5日間で一番高いのは25℃、一番低いのは17℃。' },
      { input: '1\n10', output: '10 10' },
    ],
    hiddenTests: [
      { input: '3\n-5 -2 -8', output: '-2 -8' },
      { input: '4\n0 0 0 0', output: '0 0' },
      { input: '2\n-50 50', output: '50 -50' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int maxT, minT;
    scanf("%d", &maxT);
    minT = maxT;
    for (int i = 1; i < n; i++) {
        int t;
        scanf("%d", &t);
        if (t > maxT) maxT = t;
        if (t < minT) minT = t;
    }
    printf("%d %d\\n", maxT, minT);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 日分の気温を読み込み、最高気温と最低気温を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'festival-sales',
    name: '文化祭の模擬店売上',
    rank: 4,
    statement:
      '文化祭の模擬店で、n 回のお会計それぞれの金額が記録されている。' +
      '売上の合計と、1回の会計が1000円以上だった回数を求めよう。',
    inputFormat: '1行目に会計の回数 n。2行目に n 個の金額が空白区切りで与えられる。',
    outputFormat: '1行目に売上合計、2行目に1000円以上だった回数を出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ 金額 ≦ 100000',
    samples: [
      { input: '3\n1200 500 900', output: '2600\n1', note: '合計は1200+500+900=2600円。1000円以上の会計は1200円の1回。' },
      { input: '2\n100 200', output: '300\n0' },
    ],
    hiddenTests: [
      { input: '1\n1000', output: '1000\n1' },
      { input: '1\n999', output: '999\n0' },
      { input: '4\n1000 1000 1000 1000', output: '4000\n4' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int total = 0, big = 0;
    for (int i = 0; i < n; i++) {
        int m;
        scanf("%d", &m);
        total += m;
        if (m >= 1000) big++;
    }
    printf("%d\\n%d\\n", total, big);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 回分の売上金額を読み込み、合計と1000円以上の回数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'bus-passengers',
    name: 'バスの乗客数シミュレーション',
    rank: 5,
    statement:
      'バスが n 個のバス停に停まる。それぞれの停留所で乗った人数と降りた人数が与えられる。' +
      '最終的な乗客数と、運行中の最大乗客数を求めよう(乗客数はマイナスにならない)。',
    inputFormat: '1行目に停留所の数 n。続く n 行に、各停留所での乗車人数と降車人数が空白区切りで与えられる。',
    outputFormat: '1行目に最終的な乗客数、2行目に最大乗客数を出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ 乗車人数, 降車人数 ≦ 100',
    samples: [
      {
        input: '5\n3 0\n0 1\n2 0\n0 5\n1 0',
        output: '1\n4',
        note: '乗客数は0→3→2→4→0(マイナスにはならない)→1と変わる。最大は4人、最終は1人。',
      },
      { input: '1\n5 0', output: '5\n5' },
    ],
    hiddenTests: [
      { input: '1\n0 0', output: '0\n0' },
      { input: '3\n0 0\n0 0\n0 0', output: '0\n0' },
      { input: '2\n10 0\n0 10', output: '0\n10' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int passengers = 0, best = 0;
    for (int i = 0; i < n; i++) {
        int on, off;
        scanf("%d %d", &on, &off);
        passengers += on - off;
        if (passengers < 0) passengers = 0;
        if (passengers > best) best = passengers;
    }
    printf("%d\\n%d\\n", passengers, best);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の停留所での乗車・降車人数を読み込み、
//       最終的な乗客数と最大乗客数を出力しよう(乗客数は0未満にならない)。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'game-score-avg',
    name: 'ゲームのハイスコア集計',
    rank: 4,
    statement:
      'ゲームを n 回プレイしたときのスコアが与えられる。平均点(小数点以下切り捨て)と最高得点を求めよう。',
    inputFormat: '1行目にプレイ回数 n。2行目に n 個のスコアが空白区切りで与えられる。',
    outputFormat: '1行目に平均点(切り捨て)、2行目に最高得点を出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ スコア ≦ 1000000',
    samples: [
      { input: '3\n10 20 30', output: '20\n30', note: '平均は(10+20+30)÷3=20点、最高は30点。' },
      { input: '2\n7 8', output: '7\n8' },
    ],
    hiddenTests: [
      { input: '1\n0', output: '0\n0' },
      { input: '4\n1 2 3 100', output: '26\n100' },
      { input: '5\n1000000 0 0 0 0', output: '200000\n1000000' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    long sum = 0;
    int best = 0;
    for (int i = 0; i < n; i++) {
        int s;
        scanf("%d", &s);
        sum += s;
        if (s > best) best = s;
    }
    printf("%ld\\n%d\\n", sum / n, best);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 回分のスコアを読み込み、平均点(切り捨て)と最高得点を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'train-transfer',
    name: '電車の乗り換え回数',
    rank: 4,
    statement:
      '目的地までに n 個の区間を乗り継ぐ。各区間で乗った路線の番号が与えられるので、' +
      '前の区間と路線が変わった回数(乗り換え回数)を求めよう。',
    inputFormat: '1行目に区間数 n。2行目に n 個の路線番号が空白区切りで与えられる。',
    outputFormat: '乗り換え回数を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、1 ≦ 路線番号 ≦ 100',
    samples: [
      { input: '5\n1 1 2 2 3', output: '2', note: '1→1(変化なし)→2(乗り換え)→2(変化なし)→3(乗り換え)で合計2回。' },
      { input: '1\n5', output: '0' },
    ],
    hiddenTests: [
      { input: '4\n1 1 1 1', output: '0' },
      { input: '4\n1 2 3 4', output: '3' },
      { input: '3\n7 7 8', output: '1' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int prev, cur;
    scanf("%d", &prev);
    int count = 0;
    for (int i = 1; i < n; i++) {
        scanf("%d", &cur);
        if (cur != prev) count++;
        prev = cur;
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の区間の路線番号を読み込み、前の区間から路線が変わった回数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'stamp-card',
    name: 'スタンプカードのポイント集計',
    rank: 5,
    statement:
      'パン屋のスタンプカードには、来店するたびにもらえるポイント数が記録されている。' +
      '合計ポイントを求め、30ポイント以上たまっていればプレゼントがもらえる。',
    inputFormat: '1行目に来店回数 n。2行目に n 個のポイント数が空白区切りで与えられる。',
    outputFormat: '1行目に合計ポイント、2行目に30以上なら「プレゼントもらえる」、' +
      'そうでなければ「もうすこし」を出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ ポイント ≦ 100',
    samples: [
      { input: '4\n5 10 8 3', output: '26\nもうすこし', note: '合計26ポイント。30に足りないので「もうすこし」。' },
      { input: '3\n10 10 10', output: '30\nプレゼントもらえる' },
    ],
    hiddenTests: [
      { input: '1\n0', output: '0\nもうすこし' },
      { input: '1\n100', output: '100\nプレゼントもらえる' },
      { input: '2\n15 14', output: '29\nもうすこし' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int total = 0;
    for (int i = 0; i < n; i++) {
        int p;
        scanf("%d", &p);
        total += p;
    }
    printf("%d\\n", total);
    if (total >= 30) {
        printf("プレゼントもらえる\\n");
    } else {
        printf("もうすこし\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 回分のポイントを読み込み、合計ポイントと
//       30ポイント以上かどうかの判定を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== D. 文字列 (rank 4-6) ==============
  {
    slug: 'vowel-count',
    name: '母音の数をかぞえよう',
    rank: 4,
    statement: '英小文字だけからなる文字列が与えられる。母音(a, e, i, o, u)の数を数えよう。',
    inputFormat: '1行目に英小文字の文字列 s(1文字以上100文字以下)が与えられる。',
    outputFormat: '母音の個数を1行に出力する。',
    constraints: '1 ≦ s の長さ ≦ 100、s は英小文字のみ',
    samples: [
      { input: 'algorithm', output: '3', note: '「algorithm」に含まれる母音は a, o, i の3個。' },
      { input: 'sky', output: '0' },
    ],
    hiddenTests: [
      { input: 'aeiou', output: '5' },
      { input: 'a', output: '1' },
      { input: 'xyz', output: '0' },
      { input: 'programming', output: '3' },
    ],
    solution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[105];
    scanf("%s", s);
    int len = (int)strlen(s);
    int count = 0;
    for (int i = 0; i < len; i++) {
        char c = s[i];
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') count++;
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>
#include <string.h>

// 課題: 英小文字の文字列 s に含まれる母音(a,e,i,o,u)の数を数えて出力しよう。

int main(void) {
    char s[105];
    scanf("%s", s);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'reverse-string',
    name: '文字列を逆から読もう',
    rank: 4,
    statement: '英小文字の文字列が与えられる。この文字列を逆順にした文字列を出力しよう。',
    inputFormat: '1行目に英小文字の文字列 s(1文字以上100文字以下)が与えられる。',
    outputFormat: 's を逆順にした文字列を1行に出力する。',
    constraints: '1 ≦ s の長さ ≦ 100、s は英小文字のみ',
    samples: [
      { input: 'abc', output: 'cba', note: '「abc」を後ろから読むと「cba」。' },
      { input: 'a', output: 'a' },
    ],
    hiddenTests: [
      { input: 'hello', output: 'olleh' },
      { input: 'ab', output: 'ba' },
      { input: 'level', output: 'level' },
    ],
    solution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[105];
    scanf("%s", s);
    int len = (int)strlen(s);
    for (int i = len - 1; i >= 0; i--) {
        putchar(s[i]);
    }
    putchar('\\n');
    return 0;
}
`,
    template: `#include <stdio.h>
#include <string.h>

// 課題: 文字列 s を逆順にして出力しよう。

int main(void) {
    char s[105];
    scanf("%s", s);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'password-strength',
    name: 'パスワードの強さチェック',
    rank: 5,
    statement:
      '会員登録のパスワードが与えられる。長さが8文字以上で、かつ数字を1文字以上含んでいれば' +
      '「つよい」パスワード、そうでなければ「よわい」パスワードと判定しよう。',
    inputFormat: '1行目にパスワード文字列 s(英数字、1文字以上50文字以下)が与えられる。',
    outputFormat: '条件を満たせば「つよい」、満たさなければ「よわい」を1行に出力する。',
    constraints: '1 ≦ s の長さ ≦ 50、s は英数字のみ',
    samples: [
      { input: 'abc12345', output: 'つよい', note: '長さ8以上かつ数字を含むので「つよい」。' },
      { input: 'abcdefg', output: 'よわい' },
    ],
    hiddenTests: [
      { input: 'abcdefgh', output: 'よわい' },
      { input: 'abc1234', output: 'よわい' },
      { input: 'password123456789012', output: 'つよい' },
      { input: '12345678', output: 'つよい' },
    ],
    solution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[55];
    scanf("%s", s);
    int len = (int)strlen(s);
    int hasDigit = 0;
    for (int i = 0; i < len; i++) {
        if (s[i] >= '0' && s[i] <= '9') hasDigit = 1;
    }
    if (len >= 8 && hasDigit) {
        printf("つよい\\n");
    } else {
        printf("よわい\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>
#include <string.h>

// 課題: パスワード s が「長さ8文字以上かつ数字を含む」なら「つよい」、
//       そうでなければ「よわい」と出力しよう。

int main(void) {
    char s[55];
    scanf("%s", s);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'initials',
    name: '名前のイニシャルをつくろう',
    rank: 5,
    statement:
      '姓と名がそれぞれ英字(先頭は大文字)で与えられる。それぞれの頭文字を使ったイニシャル' +
      '「X.Y.」の形式で出力しよう。',
    inputFormat: '1行目に 姓 sei と 名 mei が空白区切りで与えられる(それぞれ先頭が大文字の英字)。',
    outputFormat: '「姓の頭文字.名の頭文字.」の形式(例: T.Y.)で1行に出力する。',
    constraints: '1 ≦ sei, mei の長さ ≦ 20',
    samples: [
      { input: 'Yamada Taro', output: 'Y.T.', note: 'Yamada の Y と Taro の T をつないで Y.T.。' },
      { input: 'Ken Sato', output: 'K.S.' },
    ],
    hiddenTests: [
      { input: 'A B', output: 'A.B.' },
      { input: 'Watanabe Ichiro', output: 'W.I.' },
      { input: 'Suzuki Hanako', output: 'S.H.' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    char sei[25], mei[25];
    scanf("%s %s", sei, mei);
    printf("%c.%c.\\n", sei[0], mei[0]);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 姓 sei と名 mei の頭文字から「X.Y.」形式のイニシャルを出力しよう。

int main(void) {
    char sei[25], mei[25];
    scanf("%s %s", sei, mei);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'char-count',
    name: '特定の文字の出現回数',
    rank: 5,
    statement: '文字列 s と、1文字の文字 c が与えられる。s の中に c が何回出てくるかを数えよう。',
    inputFormat: '1行目に文字列 s(英小文字、1文字以上100文字以下)。2行目に文字 c(英小文字1文字)。',
    outputFormat: 's に含まれる c の個数を1行に出力する。',
    constraints: '1 ≦ s の長さ ≦ 100、s, c は英小文字',
    samples: [
      { input: 'banana\na', output: '3', note: '「banana」の中に a は3回出てくる。' },
      { input: 'hello\nl', output: '2' },
    ],
    hiddenTests: [
      { input: 'hello\nz', output: '0' },
      { input: 'aaaa\na', output: '4' },
      { input: 'a\na', output: '1' },
    ],
    solution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[105], c[5];
    scanf("%s %s", s, c);
    int len = (int)strlen(s);
    int count = 0;
    for (int i = 0; i < len; i++) {
        if (s[i] == c[0]) count++;
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>
#include <string.h>

// 課題: 文字列 s の中に文字 c が何回出てくるかを数えて出力しよう。

int main(void) {
    char s[105], c[5];
    scanf("%s %s", s, c);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'palindrome',
    name: '回文かどうかを調べよう',
    rank: 6,
    statement: '英小文字の文字列が与えられる。前から読んでも後ろから読んでも同じ「回文」かどうかを判定しよう。',
    inputFormat: '1行目に英小文字の文字列 s(1文字以上100文字以下)が与えられる。',
    outputFormat: '回文なら「かいぶん」、そうでなければ「ちがう」を1行に出力する。',
    constraints: '1 ≦ s の長さ ≦ 100、s は英小文字のみ',
    samples: [
      { input: 'level', output: 'かいぶん', note: '「level」は後ろから読んでも level なので回文。' },
      { input: 'hello', output: 'ちがう' },
    ],
    hiddenTests: [
      { input: 'a', output: 'かいぶん' },
      { input: 'abba', output: 'かいぶん' },
      { input: 'abcda', output: 'ちがう' },
      { input: 'racecar', output: 'かいぶん' },
    ],
    solution: `#include <stdio.h>
#include <string.h>

int main(void) {
    char s[105];
    scanf("%s", s);
    int len = (int)strlen(s);
    int ok = 1;
    for (int i = 0; i < len / 2; i++) {
        if (s[i] != s[len - 1 - i]) {
            ok = 0;
            break;
        }
    }
    if (ok) {
        printf("かいぶん\\n");
    } else {
        printf("ちがう\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>
#include <string.h>

// 課題: 文字列 s が回文かどうかを判定して出力しよう。

int main(void) {
    char s[105];
    scanf("%s", s);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'reverse-words',
    name: '単語をぎゃくじゅんにならべよう',
    rank: 6,
    statement:
      'n 個の単語が与えられる。単語の並びを逆順にして、空白区切りで1行に出力しよう。',
    inputFormat: '1行目に単語の個数 n。続けて n 個の単語が空白/改行区切りで与えられる。',
    outputFormat: '単語を逆順に並べ、空白区切りで1行に出力する。',
    constraints: '1 ≦ n ≦ 20、各単語は英小文字1〜20文字',
    samples: [
      {
        input: '3\napple banana cherry',
        output: 'cherry banana apple',
        note: '3つの単語の並びを逆にする。',
      },
      { input: '1\nhello', output: 'hello' },
    ],
    hiddenTests: [
      { input: '2\naaa bbb', output: 'bbb aaa' },
      { input: '5\na b c d e', output: 'e d c b a' },
      { input: '4\nsora umi yama kawa', output: 'kawa yama umi sora' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    char words[20][25];
    for (int i = 0; i < n; i++) {
        scanf("%s", words[i]);
    }
    for (int i = n - 1; i >= 0; i--) {
        printf("%s", words[i]);
        if (i > 0) printf(" ");
    }
    printf("\\n");
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の単語を読み込み、逆順に並べて空白区切りで出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== E. 配列 (rank 5-7) ==============
  {
    slug: 'second-largest',
    name: '2番目に大きい数をさがそう',
    rank: 5,
    statement: '互いに異なる n 個の整数が与えられる。その中で2番目に大きい値を求めよう。',
    inputFormat: '1行目に個数 n。2行目に n 個の整数(すべて異なる)が空白区切りで与えられる。',
    outputFormat: '2番目に大きい値を1行に出力する。',
    constraints: '2 ≦ n ≦ 100、値はすべて異なる、-1000 ≦ 値 ≦ 1000',
    samples: [
      { input: '5\n3 7 2 9 5', output: '7', note: '一番大きいのは9で、その次に大きいのは7。' },
      { input: '2\n1 2', output: '1' },
    ],
    hiddenTests: [
      { input: '2\n-5 5', output: '-5' },
      { input: '4\n-1 -2 -3 -4', output: '-2' },
      { input: '6\n10 20 30 40 50 60', output: '50' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int best = a[0], second;
    for (int i = 1; i < n; i++) if (a[i] > best) best = a[i];
    int found = 0;
    second = -2000000000;
    for (int i = 0; i < n; i++) {
        if (a[i] != best && (!found || a[i] > second)) {
            second = a[i];
            found = 1;
        }
    }
    printf("%d\\n", second);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の異なる整数を読み込み、2番目に大きい値を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'distinct-count',
    name: 'ちがう値の種類をかぞえよう',
    rank: 5,
    statement: 'n 個の整数が与えられる(同じ値が繰り返し出てくることがある)。何種類の値があるかを求めよう。',
    inputFormat: '1行目に個数 n。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '異なる値の種類数を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ 値 ≦ 1000',
    samples: [
      { input: '5\n1 2 2 3 1', output: '3', note: '出てくる値は1, 2, 3の3種類。' },
      { input: '1\n5', output: '1' },
    ],
    hiddenTests: [
      { input: '4\n7 7 7 7', output: '1' },
      { input: '5\n1 2 3 4 5', output: '5' },
      { input: '6\n0 0 1 1 2 2', output: '3' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int count = 0;
    for (int i = 0; i < n; i++) {
        int seenBefore = 0;
        for (int j = 0; j < i; j++) {
            if (a[j] == a[i]) { seenBefore = 1; break; }
        }
        if (!seenBefore) count++;
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数を読み込み、異なる値の種類数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'array-rotate',
    name: '配列を右にシフトしよう',
    rank: 6,
    statement:
      'n 個の整数の並びを、右に k 個分だけ回転(シフト)させよう。右にはみ出した分は先頭に戻ってくる。',
    inputFormat: '1行目に個数 n と回転数 k。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '右に k 回転させた後の並びを空白区切りで1行に出力する。',
    constraints: '1 ≦ n ≦ 100、0 ≦ k < n',
    samples: [
      { input: '5 2\n1 2 3 4 5', output: '4 5 1 2 3', note: '右に2つずらすと末尾の4,5が先頭に来る。' },
      { input: '3 0\n1 2 3', output: '1 2 3' },
    ],
    hiddenTests: [
      { input: '1 0\n9', output: '9' },
      { input: '4 3\n1 2 3 4', output: '2 3 4 1' },
      { input: '5 4\n10 20 30 40 50', output: '20 30 40 50 10' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) {
        int srcIndex = (i - k % n + n) % n;
        printf("%d", a[srcIndex]);
        if (i < n - 1) printf(" ");
    }
    printf("\\n");
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数を右に k だけ回転させて出力しよう。

int main(void) {
    int n, k;
    scanf("%d %d", &n, &k);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'mountain-shape',
    name: '山型かどうかを判定しよう',
    rank: 6,
    statement:
      'n 個の整数の並びが与えられる。先頭から頂上まで狭義に増加し続け、頂上から末尾まで狭義に減少し' +
      '続けているとき「山型」と呼ぶ(頂上が先頭や末尾でもよい)。山型かどうかを判定しよう。',
    inputFormat: '1行目に個数 n。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '山型なら「山型」、そうでなければ「ちがう」を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、-1000 ≦ 値 ≦ 1000',
    samples: [
      { input: '5\n1 3 5 4 2', output: '山型', note: '1→3→5と増えたあと5→4→2と減るので山型。' },
      { input: '4\n1 2 2 3', output: 'ちがう', note: '2から2は増加していない(同じ値)ので山型ではない。' },
    ],
    hiddenTests: [
      { input: '3\n1 2 3', output: '山型' },
      { input: '3\n3 2 1', output: '山型' },
      { input: '1\n5', output: '山型' },
      { input: '2\n2 2', output: 'ちがう' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int i = 0;
    while (i + 1 < n && a[i] < a[i + 1]) i++;
    while (i + 1 < n && a[i] > a[i + 1]) i++;
    if (i == n - 1) {
        printf("山型\\n");
    } else {
        printf("ちがう\\n");
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数が「山型」(狭義増加してから狭義減少)かどうかを判定して出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'two-sum',
    name: '2つの合計問題',
    rank: 7,
    statement:
      'n 個の整数と、目標の合計値 x が与えられる。配列の中から2つの要素(添字が異なる)を選んで' +
      '合計が x になる組を探そう。i が最小、その中で j が最小となる組(i<j)を1組見つけて出力する。',
    inputFormat: '1行目に個数 n と目標値 x。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '見つかった場合は、その2つの値を(先に見つかった方から順に)空白区切りで出力する。' +
      '見つからない場合は「なし」と出力する。',
    constraints: '2 ≦ n ≦ 100、-1000 ≦ 値, x ≦ 1000',
    samples: [
      {
        input: '5 9\n1 2 3 6 7',
        output: '2 7',
        note: 'i=1(値2)とj=4(値7)の組が2+7=9で条件を満たし、iが最小のペアとして選ばれる。',
      },
      { input: '4 100\n1 2 3 4', output: 'なし' },
    ],
    hiddenTests: [
      { input: '2 3\n1 2', output: '1 2' },
      { input: '2 5\n1 2', output: 'なし' },
      { input: '2 10\n5 5', output: '5 5' },
      { input: '6 7\n3 1 4 1 5 9', output: '3 4' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n, x;
    scanf("%d %d", &n, &x);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (a[i] + a[j] == x) {
                printf("%d %d\\n", a[i], a[j]);
                return 0;
            }
        }
    }
    printf("なし\\n");
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数から合計が x になる2つを探し、見つかればその値を、
//       見つからなければ「なし」を出力しよう。

int main(void) {
    int n, x;
    scanf("%d %d", &n, &x);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'prefix-sum-query',
    name: 'くばりものの累積合計クエリ',
    rank: 7,
    statement:
      '倉庫に n 個の箱が並んでいて、それぞれの箱に入っている個数が与えられる。' +
      'その後 q 回、範囲 l 番目から r 番目まで(1始まり、両端含む)の合計個数を答えるクエリが与えられる。',
    inputFormat:
      '1行目に箱の数 n。2行目に n 個の整数。3行目にクエリ数 q。続く q 行に各クエリ「l r」が与えられる。',
    outputFormat: '各クエリについて、範囲の合計を1行ずつ出力する。',
    constraints: '1 ≦ n ≦ 100、1 ≦ q ≦ 100、1 ≦ l ≦ r ≦ n、0 ≦ 個数 ≦ 1000',
    samples: [
      {
        input: '5\n1 2 3 4 5\n2\n1 3\n2 5',
        output: '6\n14',
        note: '1〜3番目の合計は1+2+3=6、2〜5番目の合計は2+3+4+5=14。',
      },
      { input: '3\n10 20 30\n1\n1 1', output: '10' },
    ],
    hiddenTests: [
      { input: '1\n7\n1\n1 1', output: '7' },
      { input: '4\n1 1 1 1\n2\n1 4\n2 2', output: '4\n1' },
      { input: '5\n5 4 3 2 1\n3\n1 5\n2 4\n3 3', output: '15\n9\n3' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 1; i <= n; i++) scanf("%d", &a[i]);
    int q;
    scanf("%d", &q);
    for (int k = 0; k < q; k++) {
        int l, r;
        scanf("%d %d", &l, &r);
        int sum = 0;
        for (int i = l; i <= r; i++) sum += a[i];
        printf("%d\\n", sum);
    }
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の箱の個数を読み込み、q 回の範囲和クエリ(l番目からr番目まで)に答えよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[105];
    for (int i = 1; i <= n; i++) scanf("%d", &a[i]);
    int q;
    scanf("%d", &q);

    // ここに各クエリの処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'median',
    name: '配列のまんなかの値',
    rank: 6,
    statement:
      '奇数個(n個)の整数が与えられる。値を小さい順に並べたときのちょうど真ん中の値(中央値)を求めよう。',
    inputFormat: '1行目に個数 n(奇数)。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '中央値を1行に出力する。',
    constraints: '1 ≦ n ≦ 99、n は奇数、-1000 ≦ 値 ≦ 1000',
    samples: [
      { input: '5\n5 3 1 4 2', output: '3', note: '小さい順に並べると1,2,3,4,5。真ん中は3。' },
      { input: '1\n7', output: '7' },
    ],
    hiddenTests: [
      { input: '3\n-5 0 5', output: '0' },
      { input: '7\n7 7 7 1 1 1 1', output: '1' },
      { input: '5\n-1 -2 -3 -4 -5', output: '-3' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    // 単純な選択ソート
    for (int i = 0; i < n; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++) if (a[j] < a[minIdx]) minIdx = j;
        int tmp = a[i]; a[i] = a[minIdx]; a[minIdx] = tmp;
    }
    printf("%d\\n", a[n / 2]);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: 奇数個の整数を読み込み、並べ替えたときの中央値を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう(並べ替えて真ん中を出力)

    return 0;
}
`,
  },
  {
    slug: 'max-subarray',
    name: '連続する区間の最大の合計',
    rank: 7,
    statement:
      'n 個の整数(マイナスを含むことがある)が与えられる。連続する1個以上の区間を選んだときの' +
      '合計の最大値を求めよう。',
    inputFormat: '1行目に個数 n。2行目に n 個の整数が空白区切りで与えられる。',
    outputFormat: '連続する区間の合計の最大値を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、-1000 ≦ 値 ≦ 1000',
    samples: [
      { input: '5\n-2 1 -3 4 -1', output: '4', note: '「4」だけの区間の合計4が最大。' },
      { input: '3\n1 2 3', output: '6' },
    ],
    hiddenTests: [
      { input: '3\n-5 -2 -8', output: '-2' },
      { input: '1\n-1', output: '-1' },
      { input: '6\n-2 1 -3 4 -1 2', output: '5' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int best = a[0];
    int cur = a[0];
    for (int i = 1; i < n; i++) {
        if (cur < 0) {
            cur = a[i];
        } else {
            cur += a[i];
        }
        if (cur > best) best = cur;
    }
    printf("%d\\n", best);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数から、連続する区間(1個以上)の合計の最大値を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== F. 2次元・シミュレーション (rank 7-8) ==============
  {
    slug: 'seat-vacancy',
    name: '座席表のあき数をかぞえよう',
    rank: 7,
    statement:
      '映画館の座席表が H 行 W 列の文字列として与えられる。「0」はあき席、「1」は埋まっている席を表す。' +
      'あき席の数を数えよう。',
    inputFormat: '1行目に行数 H と列数 W。続く H 行に、長さ W の「0」「1」からなる文字列が与えられる。',
    outputFormat: 'あき席(「0」)の総数を1行に出力する。',
    constraints: '1 ≦ H, W ≦ 30',
    samples: [
      { input: '2 3\n010\n101', output: '3', note: '1行目に0が2つ、2行目に0が1つで、合計3席。' },
      { input: '1 1\n0', output: '1' },
    ],
    hiddenTests: [
      { input: '2 2\n00\n00', output: '4' },
      { input: '2 2\n11\n11', output: '0' },
      { input: '3 3\n010\n101\n010', output: '5' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int h, w;
    scanf("%d %d", &h, &w);
    int count = 0;
    for (int y = 0; y < h; y++) {
        char row[35];
        scanf("%s", row);
        for (int x = 0; x < w; x++) {
            if (row[x] == '0') count++;
        }
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: H行W列の座席表(0=あき, 1=うまり)から、あき席の数を数えて出力しよう。

int main(void) {
    int h, w;
    scanf("%d %d", &h, &w);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'team-scores',
    name: '班ごとの合計得点',
    rank: 7,
    statement:
      '運動会で H 個の班があり、それぞれ W 人のメンバーの得点が与えられる。' +
      '班ごとの合計得点と、最も得点が高い班の番号(1始まり、同点なら番号が小さい方)を求めよう。',
    inputFormat: '1行目に班の数 H と1班あたりの人数 W。続く H 行に、各班の W 人分の得点が空白区切りで与えられる。',
    outputFormat: '各班の合計得点を1行ずつ出力したあと、最後に最高得点の班の番号を出力する。',
    constraints: '1 ≦ H ≦ 20、1 ≦ W ≦ 20、0 ≦ 得点 ≦ 100',
    samples: [
      { input: '2 3\n1 2 3\n4 4 4', output: '6\n12\n2', note: '1班の合計は6, 2班の合計は12で、最高は2班。' },
      { input: '1 2\n5 5', output: '10\n1' },
    ],
    hiddenTests: [
      { input: '2 2\n3 3\n3 3', output: '6\n6\n1' },
      { input: '3 1\n10\n20\n5', output: '10\n20\n5\n2' },
      { input: '1 1\n0', output: '0\n1' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int h, w;
    scanf("%d %d", &h, &w);
    int sums[20];
    for (int i = 0; i < h; i++) {
        int sum = 0;
        for (int j = 0; j < w; j++) {
            int v;
            scanf("%d", &v);
            sum += v;
        }
        sums[i] = sum;
        printf("%d\\n", sum);
    }
    int best = 0;
    for (int i = 1; i < h; i++) if (sums[i] > sums[best]) best = i;
    printf("%d\\n", best + 1);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: H班・W人分の得点を読み込み、班ごとの合計を出力したあと、
//       最高得点の班の番号(1始まり)を出力しよう。

int main(void) {
    int h, w;
    scanf("%d %d", &h, &w);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'register-queue',
    name: 'レジの行列シミュレーション',
    rank: 8,
    statement:
      'スーパーのレジ前に並ぶ人数が、1分ごとに増減する。増減の記録が与えられるので、' +
      '最終的な行列の人数と、これまでの最大人数を求めよう。行列の人数は0未満にはならない。',
    inputFormat: '1行目に記録の分数 n。2行目に n 個の増減値(マイナスもある)が空白区切りで与えられる。',
    outputFormat: '1行目に最終的な人数、2行目に最大人数を出力する。',
    constraints: '1 ≦ n ≦ 100、-100 ≦ 増減値 ≦ 100',
    samples: [
      {
        input: '5\n3 -1 2 -5 1',
        output: '1\n4',
        note: '0→3→2→4→(-1なので0でとまる)→1と推移し、最大は4、最終は1。',
      },
      { input: '1\n5', output: '5\n5' },
    ],
    hiddenTests: [
      { input: '3\n-5 -3 -1', output: '0\n0' },
      { input: '4\n10 10 10 10', output: '40\n40' },
      { input: '1\n-100', output: '0\n0' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int q = 0, best = 0;
    for (int i = 0; i < n; i++) {
        int d;
        scanf("%d", &d);
        q += d;
        if (q < 0) q = 0;
        if (q > best) best = q;
    }
    printf("%d\\n%d\\n", q, best);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の増減値から、最終的な行列人数と最大人数を出力しよう(0未満にはならない)。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'fireworks-visitors',
    name: '花火大会の来場者数シミュレーション',
    rank: 8,
    statement:
      '花火大会の会場で、n 個の時間帯ごとの来場者数の増減が記録されている。' +
      '各時間帯終了時点での来場者の累計人数を時系列で出力し、最後に最大人数を出力しよう。',
    inputFormat: '1行目に時間帯の数 n。2行目に n 個の増減値(マイナスもある)が空白区切りで与えられる。',
    outputFormat: '各時間帯終了時点の累計人数を1行ずつ出力したあと、最後に最大人数を出力する。',
    constraints: '1 ≦ n ≦ 100、-1000 ≦ 増減値 ≦ 1000、途中経過の累計は0以上になることが保証される',
    samples: [
      {
        input: '4\n100 50 -30 20',
        output: '100\n150\n120\n140\n150',
        note: '累計は100→150→120→140と変わり、最大は150。',
      },
      { input: '1\n10', output: '10\n10' },
    ],
    hiddenTests: [
      { input: '3\n5 -2 -1', output: '5\n3\n2\n5' },
      { input: '2\n0 0', output: '0\n0\n0' },
      { input: '5\n10 10 10 10 10', output: '10\n20\n30\n40\n50\n50' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int total = 0, best = 0;
    for (int i = 0; i < n; i++) {
        int d;
        scanf("%d", &d);
        total += d;
        if (total > best) best = total;
        printf("%d\\n", total);
    }
    printf("%d\\n", best);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の増減値から、各時点での累計人数を出力し、最後に最大人数を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);

    // ここに処理を書こう

    return 0;
}
`,
  },

  // ============== G. 応用(ソート利用・数え上げ等) (rank 9-10) ==============
  {
    slug: 'test-rank',
    name: 'テストの順位をもとめよう',
    rank: 9,
    statement:
      'クラス n 人分のテストの得点が与えられる。ある生徒(k番目、1始まり)の順位を求めよう。' +
      '順位は「自分より高い得点を取った人数+1」で決める(同点の人がいても同じ順位になる)。',
    inputFormat: '1行目に人数 n。2行目に n 人分の得点。3行目に順位を知りたい生徒の番号 k(1始まり)。',
    outputFormat: 'k番目の生徒の順位を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、1 ≦ k ≦ n、0 ≦ 得点 ≦ 100',
    samples: [
      {
        input: '5\n70 90 80 90 60\n1',
        output: '4',
        note: '1番目の得点は70。70より高い得点は90,80,90の3人いるので、順位は3+1=4位。',
      },
      { input: '3\n50 50 50\n2', output: '1' },
    ],
    hiddenTests: [
      { input: '1\n100\n1', output: '1' },
      { input: '4\n100 100 50 0\n1', output: '1' },
      { input: '4\n100 100 50 0\n3', output: '3' },
      { input: '4\n100 100 50 0\n4', output: '4' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int k;
    scanf("%d", &k);
    int target = a[k - 1];
    int higher = 0;
    for (int i = 0; i < n; i++) if (a[i] > target) higher++;
    printf("%d\\n", higher + 1);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 人分の得点と対象の番号 k から、k番目の生徒の順位(同点は同順位)を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int k;
    scanf("%d", &k);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'seat-swap-count',
    name: '席替えの入れ替え回数',
    rank: 9,
    statement:
      '席替え前の出席番号の並びが n 個与えられる(値はすべて異なる)。並びの中で、前にある番号の方が' +
      '後ろにある番号より大きい組(i<jだが a[i]>a[j])の総数(転倒数)を求めよう。',
    inputFormat: '1行目に人数 n。2行目に n 個の整数(すべて異なる)が空白区切りで与えられる。',
    outputFormat: '転倒数(i<jかつa[i]>a[j]となる組の総数)を1行に出力する。',
    constraints: '1 ≦ n ≦ 100、値はすべて異なる、1 ≦ 値 ≦ 1000',
    samples: [
      { input: '4\n4 3 2 1', output: '6', note: '全ての組(i<j)で前の方が大きいので、6通り全てが転倒。' },
      { input: '3\n1 2 3', output: '0' },
    ],
    hiddenTests: [
      { input: '1\n5', output: '0' },
      { input: '5\n1 2 3 4 5', output: '0' },
      { input: '5\n2 4 1 3 5', output: '3' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int count = 0;
    for (int i = 0; i < n; i++) {
        for (int j = i + 1; j < n; j++) {
            if (a[i] > a[j]) count++;
        }
    }
    printf("%d\\n", count);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の整数の並びについて、転倒数(i<jかつa[i]>a[j]となる組の数)を出力しよう。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
  {
    slug: 'stock-mode',
    name: '在庫でいちばん多い商品番号',
    rank: 10,
    statement:
      '倉庫の棚卸しで、商品コードが n 個記録されている。もっとも多く出現する商品コードを求めよう' +
      '(同じ回数のものが複数あるときは、コードの値が小さい方を選ぶ)。',
    inputFormat: '1行目に記録数 n。2行目に n 個の商品コード(整数)が空白区切りで与えられる。',
    outputFormat: 'もっとも多く出現する商品コードを1行に出力する。',
    constraints: '1 ≦ n ≦ 100、1 ≦ 商品コード ≦ 1000',
    samples: [
      { input: '6\n3 1 3 2 1 3', output: '3', note: '3が3回で最多。' },
      { input: '1\n9', output: '9' },
    ],
    hiddenTests: [
      { input: '4\n5 5 5 5', output: '5' },
      { input: '4\n1 2 1 2', output: '1' },
      { input: '5\n10 20 20 10 30', output: '10' },
    ],
    solution: `#include <stdio.h>

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);
    int bestValue = a[0], bestCount = 0;
    for (int i = 0; i < n; i++) {
        int cnt = 0;
        for (int j = 0; j < n; j++) if (a[j] == a[i]) cnt++;
        if (cnt > bestCount || (cnt == bestCount && a[i] < bestValue)) {
            bestCount = cnt;
            bestValue = a[i];
        }
    }
    printf("%d\\n", bestValue);
    return 0;
}
`,
    template: `#include <stdio.h>

// 課題: n 個の商品コードから、もっとも多く出現するコードを出力しよう
//       (同数の場合はコードが小さい方)。

int main(void) {
    int n;
    scanf("%d", &n);
    int a[100];
    for (int i = 0; i < n; i++) scanf("%d", &a[i]);

    // ここに処理を書こう

    return 0;
}
`,
  },
];
