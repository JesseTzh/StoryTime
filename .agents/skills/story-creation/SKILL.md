---
name: story-creation
description: Use when creating, expanding, reviewing, repairing, or importing StoryTime narrative content packs, including worlds, maps, NPCs, events, conversations, schedules, and endings.
---

# 剧情创造

## 核心原则

这是 StoryTime 项目(中文名《时空故事》)的剧情内容生产 Skill。
《时空故事》是一款旨在借助 AI 大语言模型，生成庞大网状故事线的动态叙事模拟游戏。
本 Skill 旨在通过 Agent 代理循环，批量生成大量人物剧情、分支选择及对应结局，持续扩展游戏内容规模，探索 AI 在叙事内容生产中的能力边界。

必须遵守：

- 在生成剧情内容时，需要先输出 md 类型的故事背景/剧情大纲，由开发者审核后再转化为 yaml 类型的游戏内容文件
- 剧情内容生产仅修改 `content/<pack>` 下的文件；不要修改项目内的任何代码文件
- 生成剧情脚本内容时，必须严格按照 Skill 内定义的模板进行生成。

## 目标判断

首先判断用户意图：是创建全新的故事，还是续写、扩展已有故事线。

如果是全新故事，则按照下文生成流程逐步执行；

如果是续写或扩展已有故事线，则直接跳转至对应阶段，并读取相关文档后继续处理。

## 生成流程

1. 编写世界观基础设定，请参阅 
2. 

## 出身介绍字段

编辑 `content/<pack>/identities.yaml` 时，每个出身都必须包含：

- `backgroundSummary`：出身选择界面展示的一句话角色背景，说明角色来历和入局动机，不重复属性、优势、劣势的纯机制描述。
- `intro.title`：进入游戏后的介绍弹窗标题，聚焦当前出身的开场处境。
- `intro.story`：当前内容包的故事背景，只写玩家开局需要知道的局势。
- `intro.origin`：用户角色的来历背景，说明这个出身如何与故事发生关联。
- `intro.motivation`：用户角色为什么来到故事地点，以及开局最直接的目标。

这些字段是内容资产，不要写进游戏客户端代码。不同出身可以共享同一个大背景，但 `origin` 和 `motivation` 必须体现出身差异。

## 默认工作流

1. 读取项目当前内容结构、schema、模板字段和用户目标。
2. 明确本次任务所在阶段，不跨阶段批量生成下游细节。
3. 先锁定世界边界、地图地点、故事线、人物关系和共享事实，再生成 NPC 局部内容。
4. 每次生成都输出可落地字段、引用对象、触发条件、效果和审核点。
5. 对失败项做局部修复，不整体重写已审核内容。
6. 完成后运行：

```bash
pnpm validate:content
```

如内容源需要导出发布产物，再运行：

```bash
pnpm build:content-pack
```
