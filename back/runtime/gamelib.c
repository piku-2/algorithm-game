/*
 * game.h の実装(サンドボックス側ランタイム)。
 * ステージは環境変数 GAME_STAGE のファイルから読み込み、
 * 実行トレースを環境変数 GAME_TRACE のファイルへ1行1イベントで書き出す。
 * すべての API 呼び出しはステップとして数え、maxSteps を超えたら
 * L(ステップ上限)を記録して終了する。無限ループ対策。
 *
 * ステージファイル形式:
 *   迷路: "N W H startX startY dir(U/R/D/L) maxSteps" + 盤面行
 *   配列: "A n kind(S/D/R/M/m) maxSteps" + 値の行(空白区切り)
 *
 * トレース行:
 *   M fx fy tx ty d / T x y d / C x y d / G x y d / L x y d(共通: ステップ上限)
 *   S i j(swap) / E 1|0(配列: 終了時に達成/未達成)
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "game.h"

#define MAX_H 64
#define MAX_W 128
#define MAX_N 64

static char MODE; /* 'N'=迷路 'A'=配列 */
static int MAX_STEPS;
static long steps;
static FILE *tr;

/* 迷路 */
static int W, H, X, Y, DIR;
static char grid[MAX_H][MAX_W + 2];
static const int DX[4] = {0, 1, 0, -1};
static const int DY[4] = {-1, 0, 1, 0};
static const char DIRC[4] = {'U', 'R', 'D', 'L'};

/* 配列 */
static int N;
static char KIND;
static int values[MAX_N];
static int initial[MAX_N];

static void die(const char *msg) {
    /* エラー終了。デストラクタが E 行を書かないよう先にトレースを閉じる */
    if (tr) {
        fclose(tr);
        tr = NULL;
    }
    fprintf(stderr, "%s\n", msg);
    exit(2);
}

__attribute__((constructor)) static void game_init(void) {
    const char *stage_path = getenv("GAME_STAGE");
    const char *trace_path = getenv("GAME_TRACE");
    if (!stage_path || !trace_path) die("GAME_STAGE/GAME_TRACE not set");
    FILE *f = fopen(stage_path, "r");
    if (!f) die("cannot open stage file");
    if (fscanf(f, " %c", &MODE) != 1) die("bad stage mode");
    if (MODE == 'N') {
        char dirch;
        if (fscanf(f, "%d %d %d %d %c %d\n", &W, &H, &X, &Y, &dirch, &MAX_STEPS) != 6)
            die("bad stage header");
        if (W > MAX_W || H > MAX_H) die("stage too large");
        switch (dirch) {
            case 'U': DIR = 0; break;
            case 'R': DIR = 1; break;
            case 'D': DIR = 2; break;
            case 'L': DIR = 3; break;
            default: die("bad dir");
        }
        for (int y = 0; y < H; y++) {
            if (!fgets(grid[y], sizeof grid[y], f)) die("bad stage rows");
        }
    } else if (MODE == 'A') {
        if (fscanf(f, "%d %c %d", &N, &KIND, &MAX_STEPS) != 3) die("bad array header");
        if (N < 1 || N > MAX_N) die("array too large");
        for (int i = 0; i < N; i++) {
            if (fscanf(f, "%d", &values[i]) != 1) die("bad array values");
            initial[i] = values[i];
        }
    } else {
        die("unknown stage mode");
    }
    fclose(f);
    tr = fopen(trace_path, "w");
    if (!tr) die("cannot open trace file");
}

static void finish(void) {
    fclose(tr);
    tr = NULL;
    exit(0);
}

/* ---- 配列: 達成条件 ---- */

static int solved(void) {
    switch (KIND) {
        case 'S': /* 小さい順 */
            for (int i = 0; i + 1 < N; i++)
                if (values[i] > values[i + 1]) return 0;
            return 1;
        case 'D': /* 大きい順 */
            for (int i = 0; i + 1 < N; i++)
                if (values[i] < values[i + 1]) return 0;
            return 1;
        case 'R': /* 最初の並びの逆順 */
            for (int i = 0; i < N; i++)
                if (values[i] != initial[N - 1 - i]) return 0;
            return 1;
        case 'M': { /* 最大値を最後へ */
            int mx = values[0];
            for (int i = 1; i < N; i++)
                if (values[i] > mx) mx = values[i];
            return values[N - 1] == mx;
        }
        case 'm': { /* 最小値を先頭へ */
            int mn = values[0];
            for (int i = 1; i < N; i++)
                if (values[i] < mn) mn = values[i];
            return values[0] == mn;
        }
        default:
            return 0;
    }
}

/* プログラムが自力で終了したとき、達成していなければ E 0 を記録する */
__attribute__((destructor)) static void game_finalize(void) {
    if (tr && MODE == 'A') {
        fprintf(tr, "E %d\n", solved());
        fclose(tr);
        tr = NULL;
    }
}

static void bump(void) {
    if (++steps > MAX_STEPS) {
        if (MODE == 'N') fprintf(tr, "L %d %d %c\n", X, Y, DIRC[DIR]);
        else fprintf(tr, "L 0 0 R\n");
        finish();
    }
}

static void require_mode(char m) {
    if (MODE != m) die("この問題では つかえない関数です");
}

/* ---- 迷路 API ---- */

static int wall_at(int x, int y) {
    if (x < 0 || x >= W || y < 0 || y >= H) return 1;
    return grid[y][x] == '#';
}

void move_forward(void) {
    require_mode('N');
    bump();
    int nx = X + DX[DIR], ny = Y + DY[DIR];
    if (wall_at(nx, ny)) {
        fprintf(tr, "C %d %d %c\n", X, Y, DIRC[DIR]);
        finish();
    }
    fprintf(tr, "M %d %d %d %d %c\n", X, Y, nx, ny, DIRC[DIR]);
    X = nx;
    Y = ny;
    if (grid[Y][X] == 'G') {
        fprintf(tr, "G %d %d %c\n", X, Y, DIRC[DIR]);
        finish();
    }
}

void turn_left(void) {
    require_mode('N');
    bump();
    DIR = (DIR + 3) % 4;
    fprintf(tr, "T %d %d %c\n", X, Y, DIRC[DIR]);
}

void turn_right(void) {
    require_mode('N');
    bump();
    DIR = (DIR + 1) % 4;
    fprintf(tr, "T %d %d %c\n", X, Y, DIRC[DIR]);
}

int is_wall_ahead(void) {
    require_mode('N');
    bump();
    return wall_at(X + DX[DIR], Y + DY[DIR]);
}

int is_goal(void) {
    require_mode('N');
    bump();
    return grid[Y][X] == 'G';
}

/* ---- 配列 API ---- */

int array_length(void) {
    require_mode('A');
    bump();
    return N;
}

int get_value(int i) {
    require_mode('A');
    bump();
    if (i < 0 || i >= N) die("配列の範囲外です (get_value)");
    return values[i];
}

void swap_values(int i, int j) {
    require_mode('A');
    bump();
    if (i < 0 || i >= N || j < 0 || j >= N) die("配列の範囲外です (swap_values)");
    int t = values[i];
    values[i] = values[j];
    values[j] = t;
    fprintf(tr, "S %d %d\n", i, j);
    if (solved()) {
        fprintf(tr, "E 1\n");
        finish();
    }
}
