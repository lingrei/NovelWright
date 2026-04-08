---
description: W4写作的CONSOLIDATE阶段专用。合并草稿、更新状态、触发下一Chunk。
---

# CONSOLIDATION ENGINE

---

## 1. 合并协议

### 步骤1：读取所有已审计通过的Batch文件
```
[项目]/drafts/Chunk_[N]_Batch_1.md
[项目]/drafts/Chunk_[N]_Batch_2.md
...
```

### 步骤2：合并到_Draft.md
- 找到 `<!-- DRAFT_END_ANCHOR -->` 标记
- 在标记前插入：Chunk标题 + 所有Batch内容
- 保留 DRAFT_END_ANCHOR 在末尾

### 步骤3：验证合并
- 读取_Draft.md确认内容完整
- 检查Batch之间无遗漏

---

## 2. 4D状态更新

更新 `_state.yaml`：

```yaml
story_state:
  after_chunk_[N]:
    META: [绝对真相变化]
    POV:
      [角色名]:
        knows: [新增已知]
        doesnt_know: [仍然未知]
    PHYSICAL: [物理状态变化]
    IRREVERSIBLE: [新跨越的界限]
```

---

## 3. 进度更新

1. `_state.yaml`: `current_chunk: [N+1]`, `chunks_completed: +[N]`
2. `_Story.md`: Chunk [N] 标记 ✅

---

## 4. 触发下一Chunk

自动进入下一个 Pending Chunk 的 PLAN 阶段。

如果所有Chunk都已完成 → 通知用户 "W4 写作完成"。

---

## END OF CONSOLIDATION ENGINE
