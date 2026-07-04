import type { DragEvent } from 'react';
import type { Block, BlockType } from '../game/types';

export const BLOCK_LABEL: Record<BlockType, string> = {
  move: 'まえにすすむ',
  turnLeft: 'ひだりをむく',
  turnRight: 'みぎをむく',
  repeat: 'くりかえす',
  repeatForever: 'ずっとくりかえす',
  ifWall: 'もし まえがかべなら',
};

const CONTAINER_KINDS: BlockType[] = ['repeat', 'repeatForever', 'ifWall'];

export function isContainer(kind: BlockType): boolean {
  return CONTAINER_KINDS.includes(kind);
}

let seq = 0;
export function newBlock(kind: BlockType): Block {
  seq++;
  if (kind === 'repeat') return { id: `blk${seq}`, kind, times: 2, body: [] };
  if (isContainer(kind)) return { id: `blk${seq}`, kind, body: [] };
  return { id: `blk${seq}`, kind };
}

/** id のブロックを fn で差し替えた新しいツリーを返す */
function mapBlocks(blocks: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return fn(b);
    if (b.body) return { ...b, body: mapBlocks(b.body, id, fn) };
    return b;
  });
}

function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.body ? { ...b, body: removeBlock(b.body, id) } : b));
}

function findBlock(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.body) {
      const found = findBlock(b.body, id);
      if (found) return found;
    }
  }
  return null;
}

function containsId(block: Block, id: string): boolean {
  if (block.id === id) return true;
  return (block.body ?? []).some((b) => containsId(b, id));
}

/** id のブロックを同じリスト内で delta だけ移動した新しいツリーを返す */
function moveInList(blocks: Block[], id: string, delta: number): Block[] {
  const i = blocks.findIndex((b) => b.id === id);
  if (i >= 0) {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return blocks;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  }
  return blocks.map((b) => (b.body ? { ...b, body: moveInList(b.body, id, delta) } : b));
}

/**
 * block を containerId の body(null ならルート)の beforeId の直前(null なら末尾)に挿入する。
 */
function insertBlock(
  blocks: Block[],
  containerId: string | null,
  beforeId: string | null,
  block: Block,
): Block[] {
  if (containerId === null) {
    const i = beforeId ? blocks.findIndex((b) => b.id === beforeId) : -1;
    const next = [...blocks];
    next.splice(i >= 0 ? i : next.length, 0, block);
    return next;
  }
  return mapBlocks(blocks, containerId, (b) => ({
    ...b,
    body: insertBlock(b.body ?? [], null, beforeId, block),
  }));
}

/** DnD のドロップ処理: パレットからの新規 or 既存ブロックの移動 */
function handleDropData(
  root: Block[],
  e: DragEvent,
  containerId: string | null,
  beforeId: string | null,
): Block[] | null {
  const kind = e.dataTransfer.getData('application/x-block-kind') as BlockType | '';
  const movedId = e.dataTransfer.getData('application/x-block-id');
  if (kind) {
    return insertBlock(root, containerId, beforeId, newBlock(kind));
  }
  if (movedId) {
    if (movedId === beforeId) return null;
    const moved = findBlock(root, movedId);
    if (!moved) return null;
    // 自分自身(の子孫)へのドロップは無効
    if (containerId && containsId(moved, containerId)) return null;
    if (beforeId && containsId(moved, beforeId)) return null;
    const without = removeBlock(root, movedId);
    return insertBlock(without, containerId, beforeId, moved);
  }
  return null;
}

interface Props {
  allowed: BlockType[];
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
  disabled: boolean;
  /** コンテナ内にクリック追加するとき対象のコンテナブロック id。null ならトップレベル */
  selectedContainerId: string | null;
  onSelectContainer: (id: string | null) => void;
  /** 実行中に今うごいているブロックの id(あれば光らせる) */
  activeBlockId?: string | null;
}

export function BlockEditor({
  allowed,
  blocks,
  onChange,
  disabled,
  selectedContainerId,
  onSelectContainer,
  activeBlockId = null,
}: Props) {
  const addBlock = (kind: BlockType) => {
    onChange(insertBlock(blocks, selectedContainerId, null, newBlock(kind)));
  };

  const drop = (e: DragEvent, containerId: string | null, beforeId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const next = handleDropData(blocks, e, containerId, beforeId);
    if (next) onChange(next);
  };

  const allowDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div className="block-editor">
      <div className="palette">
        <h3>ブロック</h3>
        {allowed.map((kind) => (
          <button
            key={kind}
            className={`block block-${kind} palette-block`}
            onClick={() => addBlock(kind)}
            disabled={disabled}
            draggable={!disabled}
            onDragStart={(e) => e.dataTransfer.setData('application/x-block-kind', kind)}
          >
            + {BLOCK_LABEL[kind]}
          </button>
        ))}
        <p className="palette-help">クリックでついか / ドラッグでもおけるよ</p>
        {selectedContainerId && (
          <p className="palette-note">
            「{BLOCK_LABEL[findBlock(blocks, selectedContainerId)?.kind ?? 'repeat']}」のなかに ついか中{' '}
            <button className="link-btn" onClick={() => onSelectContainer(null)}>
              やめる
            </button>
          </p>
        )}
      </div>
      <div className="workspace" onDragOver={allowDrop} onDrop={(e) => drop(e, null, null)}>
        <h3>プログラム</h3>
        {blocks.length === 0 && (
          <p className="workspace-empty">ひだりのブロックを おしてね(ドラッグしてもOK)</p>
        )}
        <BlockList
          list={blocks}
          root={blocks}
          onRootChange={onChange}
          disabled={disabled}
          selectedContainerId={selectedContainerId}
          onSelectContainer={onSelectContainer}
          drop={drop}
          allowDrop={allowDrop}
          activeBlockId={activeBlockId}
        />
      </div>
    </div>
  );
}

interface ListProps {
  list: Block[];
  root: Block[];
  onRootChange: (blocks: Block[]) => void;
  disabled: boolean;
  selectedContainerId: string | null;
  onSelectContainer: (id: string | null) => void;
  drop: (e: DragEvent, containerId: string | null, beforeId: string | null) => void;
  allowDrop: (e: DragEvent) => void;
  /** このリストの親コンテナ id(ルートは null) */
  parentId?: string | null;
  activeBlockId?: string | null;
}

function BlockList({
  list,
  root,
  onRootChange,
  disabled,
  selectedContainerId,
  onSelectContainer,
  drop,
  allowDrop,
  parentId = null,
  activeBlockId = null,
}: ListProps) {
  return (
    <div className="block-list">
      {list.map((block, i) => {
        const isActive = block.id === activeBlockId;
        const hasActiveChild = activeBlockId !== null && !isActive && containsId(block, activeBlockId);
        return (
        <div
          key={block.id}
          className={`block block-${block.kind} ${isActive ? 'block-active' : ''} ${hasActiveChild ? 'block-active-ancestor' : ''}`}
          draggable={!disabled}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('application/x-block-id', block.id);
          }}
          onDragOver={allowDrop}
          onDrop={(e) => drop(e, parentId, block.id)}
        >
          <div className="block-row">
            <span className="block-label">{BLOCK_LABEL[block.kind]}</span>
            {block.kind === 'repeat' && (
              <>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={block.times ?? 1}
                  disabled={disabled}
                  onChange={(e) =>
                    onRootChange(
                      mapBlocks(root, block.id, (b) => ({
                        ...b,
                        times: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                      })),
                    )
                  }
                />
                <span className="block-label">かい</span>
              </>
            )}
            <span className="block-actions">
              <button
                disabled={disabled || i === 0}
                onClick={() => onRootChange(moveInList(root, block.id, -1))}
                title="うえへ"
              >
                ↑
              </button>
              <button
                disabled={disabled || i === list.length - 1}
                onClick={() => onRootChange(moveInList(root, block.id, 1))}
                title="したへ"
              >
                ↓
              </button>
              <button
                disabled={disabled}
                onClick={() => {
                  if (selectedContainerId && containsId(block, selectedContainerId)) {
                    onSelectContainer(null);
                  }
                  onRootChange(removeBlock(root, block.id));
                }}
                title="けす"
              >
                ×
              </button>
            </span>
          </div>
          {isContainer(block.kind) && (
            <div className="repeat-body" onDragOver={allowDrop} onDrop={(e) => drop(e, block.id, null)}>
              <BlockList
                list={block.body ?? []}
                root={root}
                onRootChange={onRootChange}
                disabled={disabled}
                selectedContainerId={selectedContainerId}
                onSelectContainer={onSelectContainer}
                drop={drop}
                allowDrop={allowDrop}
                parentId={block.id}
                activeBlockId={activeBlockId}
              />
              <button
                className={`repeat-target ${selectedContainerId === block.id ? 'repeat-target-active' : ''}`}
                disabled={disabled}
                onClick={() => onSelectContainer(selectedContainerId === block.id ? null : block.id)}
              >
                {selectedContainerId === block.id ? 'ここに ついか中…' : '+ ここに ついかする'}
              </button>
            </div>
          )}
        </div>
        );
      })}
    </div>
  );
}
