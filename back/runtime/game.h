#ifndef GAME_H
#define GAME_H

/* ================== アルゴリズムクエスト 上級モード API ==================
 * ステージには「迷路(ナビゲーション)問題」と「配列問題」の2種類がある。
 * その問題で使えない関数を呼ぶと、その場で失敗として終了する。
 */

/* ---- 迷路問題 ---- */

/* 向いている方向に1マス進む。壁にぶつかると失敗として即終了する。 */
void move_forward(void);

/* 左に90度回転する。 */
void turn_left(void);

/* 右に90度回転する。 */
void turn_right(void);

/* 前方が壁(または盤外)なら1、そうでなければ0を返す。 */
int is_wall_ahead(void);

/* 現在ゴールの上にいれば1を返す。 */
int is_goal(void);

/* ---- 配列問題 ---- */

/* 配列の長さを返す。 */
int array_length(void);

/* i 番目(0はじまり)の値を返す。範囲外なら失敗として即終了する。 */
int get_value(int i);

/* i 番目と j 番目の値を入れかえる。達成条件を満たした瞬間にクリアとなる。 */
void swap_values(int i, int j);

#endif /* GAME_H */
