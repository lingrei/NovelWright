---
description: W4 写作模式自动化工作流。自动循环执行 Plan→Write→Review→Consolidate→Next Chunk。
---

> **⚠️ LANGUAGE RULE (MANDATORY): All output — chat replies, questions, analysis, file content — must be in English. No Chinese in any output. This command file is written in Chinese as source code; read and follow its logic, but ALWAYS respond in English.**

# W4 写作模式 — 自动化工作流编排器

## 自动化声明

**W4 Mode下，Agent自主执行以下全部操作，不等待用户确认：**

| ✅ 自动执行 | ❌ 禁止行为 |
|------------|-----------|
| 读取_Story.md/_Setting.md/_Draft.md | 向用户解释"接下来我要..." |
| 创建_chunk_plan.md | 在写作前征求用户意见 |
| 写入drafts/*.md | 暂停等待用户评价Batch |
| 执行审计修复 | 输出审计过程给用户看 |
| Consolidate到_Draft.md | 询问用户"要继续吗" |
| 自动开始下一个Chunk | 中断循环等待确认 |

---

## 1. 上下文加载 (每次Session开始 — MANDATORY)

| 步骤 | 操作 | 目的 |
|:----:|------|------|
| ① | 读取 `_state.yaml` | 确定当前Chunk编号 |
| ② | 读取 `_Story.md` | 验证Chunk状态标记（✅/⬜） |
| ③ | 执行 Mid-Chunk 恢复探测 | 确定从哪个阶段恢复 |
| ④ | 读取 `_Setting.md`（完整） | 世界/角色规则、Voice定义 |
| ⑤ | 读取 `_Draft.md`（末尾50-100行） | 上下文衔接 |
| ⑥ | 读取 `_chunk_plan.md`（如存在） | 当前执行计划 |
| ⑦ | 加载当前阶段 Skill | PLAN→chunk-planner / WRITE→camera-os / REVIEW→prose-auditor |
| ⑧ | 加载 `golden_examples/` 全部6个文件 | 写作原则校准 |
| ⑨ | 加载相关 `craft_references/` 文件 | 技术参考 |
| ⑩ | 读取上一个 `_chunk_review.md` 的感官指纹 | 感官通道衰减预警 |
| ⑪ | 读取 `.claude/collaborator_model.md` | 合作者审美倾向参考 |

---

## 1.5 状态管理 — Session恢复

| 检测条件 | 推断阶段 | 恢复行为 |
|---------|---------|---------|
| `_chunk_plan.md` 不存在 | 未开始PLAN | 从 PLAN 开始 |
| `_chunk_plan.md` 存在，无Batch文件 | PLAN完成 | 跳到WRITE |
| 部分Batch文件存在 | WRITE进行中 | 从下一个Batch继续 |
| 所有Batch存在，无review | WRITE完成 | 跳到REVIEW |
| Review完成，Draft无此Chunk | REVIEW完成 | 跳到CONSOLIDATION |

---

## 2. 主循环 (INFINITE LOOP)

```
FOR each Pending Chunk in _Story.md:
    → PLAN   (加载 chunk-planner)
    → WRITE  (加载 camera-os)
    → REVIEW (嵌入式Checklist + 子代理审计)
    → CONSOLIDATE (加载 consolidation-engine)
    → UPDATE _Story.md (标记 ✅) + _state.yaml
    → NEXT
```

### 2.1 PLAN 阶段
📦 加载 `.claude/commands/chunk-planner.md`
→ 创建 `_chunk_plan.md` → 自我审计 → 进入WRITE

### 2.2 WRITE 阶段
📦 加载 `.claude/commands/camera-os.md`
📦 首Batch前加载 `golden_examples/` 全部文件
📦 按 `_chunk_plan.md` Step C 加载 `craft_references/`

**Batch写入规范：**
* 路径: `[项目]/drafts/Chunk_[N]_Batch_[M].md`
* 内容: **纯散文** — 禁止元数据、注释

**Voice Recalibration:** 每3个Batch重读Voice定义，防止退化。

### 2.3 REVIEW 阶段

| 级别 | 时机 | 执行者 |
|------|------|--------|
| **Batch即时审计** | 每个Batch写完后 | 主会话内部（thought block） |
| **Chunk综合审查** | 所有Batch写完后 | review-agent 子代理 |

**🔍 Chunk综合审查：** 调度 `review-agent` 子代理（Read-only），返回审计报告后主会话修复。

### 2.4 CONSOLIDATION
📦 加载 `.claude/commands/consolidation-engine.md`
→ 合并Batch到_Draft.md → 更新_state.yaml → 触发下一Chunk

---

## END OF W4 WRITING WORKFLOW
