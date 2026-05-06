# 内容包结构

游戏本体读取发布后的 `ContentPack`，不读取编辑器工程文件。

## 顶层结构

```ts
type ContentPack = {
  packId: string
  version: string
  schemaVersion: string
  world: WorldDefinition
  variables: VariableDefinition[]
  maps: GameMap[]
  locations: Location[]
  buildings: Building[]
  factions: Faction[]
  identities: PlayerIdentity[]
  npcs: NPC[]
  relationships: RelationshipState[]
  interactions: Interaction[]
  quests: Quest[]
  rewards: Reward[]
  events: GameEvent[]
  conversations: Conversation[]
  items: ItemDefinition[]
  endings: Ending[]
  runtime: RuntimeConfig
}
```

## 运行时状态

- `time`：日期、时间段、行动点。
- `player`：身份、地点、属性、背包。
- `worldState.variables`：世界变量。
- `worldState.locations`、`buildings`、`npcs`：运行时对象状态。
- `worldState.relationships`：关系数值。
- `worldState.quests`：任务状态，包含 `active`、`completed`、`failed`。
- `worldState.facts`：事实标记。
- `worldState.eventHistory`：已触发事件。
- `worldState.activeConversation` 与 `conversationHistory`：当前会话和历史记录。
- `eventLogs`：玩家交互、NPC 行为、世界事件和任务日志。

## 交互结构

玩家推动世界时执行 `interactions`。交互类型包括：

- `conversation`：启动指定会话。
- `give`：向指定 NPC 给予指定物品。
- `combat`：按玩家与敌方武力值对比解决战斗。
- `environment`：与地点、建筑、地块或物品进行环境互动，`environmentType` 为 `gather` 或 `search`。

地点、建筑和 NPC 通过 `interactionIds` 暴露交互入口。

## 任务结构

任务由 NPC 给予，必须声明：

- `sourceNpcId`：任务来源 NPC。
- `completion`：结构化完成方式，只能由对话、给予、战斗或环境互动触发。
- `rewardIds`：完成后发放的奖励。

任务状态和奖励发放由引擎控制，不由剧情文本临时决定。

## 奖励结构

`rewards[].effects` 是任务奖励的权威配置。任务完成后，引擎按 reward id 找到奖励并执行其中的结构化效果。

## 事件结构

`events` 是世界状态触发器，只负责条件、效果和 follow-up。事件不再携带玩家选项；玩家选择通过交互、会话回复和任务完成方式表达。

## 条件与效果

所有交互、事件、会话、任务和结局都由结构化条件判定，不由自然语言决定。

## 会话结构

玩家主动交谈使用 `conversations`。

```ts
type Conversation = {
  id: string
  npcId: string
  title: string
  entryNodeId: string
  conditions?: ConditionGroup
  priority?: number
  nodes: ConversationNode[]
}
```

- `npcId` 绑定可交谈 NPC。
- `title` 是玩家在话题列表中看到的文案。
- `entryNodeId` 指向同一会话内的入口节点。
- `nodes[].replies[]` 通过 `nextNodeId` 推进，或通过 `endConversation: true` 结束。
- 会话不再声明玩家可见影响提示；真正修改状态的是 `effects`。
