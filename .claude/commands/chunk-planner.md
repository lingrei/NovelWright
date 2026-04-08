---
description: W4写作的Plan阶段专用。Beat Theory推导、Dilation评级、Batch分配、_chunk_plan.md模板。
---

# CHUNK PLANNER: W4 计划阶段

> **唯一任务：从_Story.md的Chunk Plan推导出可执行的_chunk_plan.md。**

---

## 1. 从Story提取执行约束

| 字段 | 用途 |
|------|------|
| **锚点** (时间/地点/在场) | 场景物理约束 |
| **状态流** (起点/终点) | Entry/Exit条件 |
| **必经节点** | 直接作为Beats |
| **强度边界** (Tier/上限/禁止) | 硬性约束 |
| **焦点** (核心/基调/情绪目标) | 写作导向 |
| **锚点行为** | 角色描写约束 |
| **禁区** | 不可触碰的内容 |

---

## 2. _chunk_plan.md 模板

```markdown
# CHUNK [N] BLUEPRINT

## Step 0: 边界检查
- **Last Pixel:** [上一Chunk结束状态]
- **Start Pixel:** [续接点]
- **Stop Sign:** [不可触碰的边界]

## Step 0.5: 前置状态继承 (4D锚定)
- **时间/地点:** [...]
- **角色状态:** [每个在场角色当前状态]
- **已确立事实:** PHYSICAL / IRREVERSIBLE

## Step A: 执行约束（从_Story.md提取）
## Step B: Beat → Batch 推导
## Step C: Craft Reference Loading（必填）
- **需加载:** [文件列表] 或 **无**
```

---

## 3. Beat Theory

### 步骤1：提取必经节点 → 每个节点 = 1 Beat
### 步骤2：评估Dilation等级（见CLAUDE.md定义）
### 步骤3：高Dilation粒度校验

| Dilation | 拆分要求 |
|:--------:|:-------:|
| L1-L4 | 不拆分 |
| L5-L6 | 可选拆分（单一动作不拆，复合事件拆） |
| **L7-L10** | **强制拆分≥2个子Beat** |

### 步骤4：填写Beat表格

| Beat | 必经节点 | Dilation | Sensory Focus | 叙事焦点 |
|:-----|:---------|:-------:|:-------------|:---------|

---

## 4. Batch Allocation

- **High (L7-10):** 必须单列 (1 Beat/Batch)
- **Med (L5-6):** 默认单列，可合并
- **Low (L1-4):** 可合并 (最多2 Beats/Batch)

**HARD CONSTRAINT:** 最多2个 Beats/Batch

### 情绪曲线（必填）
- 起始情绪 / 高峰位置 / 结束情绪 / 有无打断

---

## END OF CHUNK PLANNER
