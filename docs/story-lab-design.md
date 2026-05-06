# 《时空故事》Story Lab 设计细化稿

> Story Lab 不是普通剧情编辑器，而是《时空故事》的**内容工程平台**。
> 它负责管理世界观、地点、NPC、事件、对白、行为逻辑、结局条件，并提供 AI 生成后的自动检测、人工验收、模拟测试和内容包导出能力。

---

# 1. Story Lab 的核心定位

Story Lab 主要解决四件事：

```text
1. 定义故事内容由哪些部分组成。
2. 让 AI 按固定结构批量生成内容。
3. 自动检测 AI 生成内容是否合法。
4. 人工验收后导出给游戏本体使用。
```

整体工作流：

```text
世界设定
  ↓
AI 生成 NPC / 事件 / 对话 / 行为逻辑
  ↓
保存为 YAML / JSON 文件
  ↓
Story Lab 调用检测脚本
  ↓
检测字段、引用、条件、效果、逻辑
  ↓
人工修改
  ↓
标记为 accepted / locked
  ↓
导出 content-pack.json
  ↓
游戏本体加载测试
```

---

# 2. 内容文件目录设计

推荐使用 YAML 管理制作期内容，最终打包成 JSON 给 Story Lab 和游戏本体使用。`content/<pack>` 是制作期源头，`content/packs/` 下的 manifest 与内容包 JSON 是生成产物，两个应用的 `public/content-packs` 通过软链接共用该目录。

```text
content
└── qinglan-town
    ├── world.yaml              # 内容包元信息、世界设定、时间系统、世界参数
    ├── variables.yaml          # 世界变量定义
    ├── factions.yaml           # 势力
    ├── maps.yaml               # 地图与地块
    ├── locations.yaml          # 地点
    ├── buildings.yaml          # 建筑
    ├── npcs
    │   ├── index.yaml          # NPC 索引
    │   └── <slug>
    │       ├── identity.yaml
    │       ├── background.yaml
    │       ├── attributes.yaml
    │       ├── relationships.yaml
    │       ├── behavior.yaml
    │       └── dialogues.yaml
    ├── actions.yaml            # 玩家可执行行为
    ├── events.yaml             # 事件
    ├── items.yaml              # 物品
    ├── endings.yaml            # 结局
    └── content-pack.json       # 生成产物
```

---

# 3. 故事与世界基础部分

## 3.1 world.yaml

用于定义一个故事包的基础信息、世界设定和时间系统。制作期不再单独维护 `story.yaml`。

```yaml
name: 示例故事
packId: sample_story
version: 0.1.0
schemaVersion: 1.0.0
id: world_sample
name: 示例世界

summary: >
  玩家在限定天数内介入多条互相牵连的危机，并通过行动、对话和选择改变结局。

maxDays: 14
segments:
  - morning
  - noon
  - night
actionPointsPerSegment: 3
```

---

# 4. 世界参数设计

## 4.1 world.yaml

`world.yaml` 已在 3.1 中定义基础字段；本节保留用于说明更细的世界参数设计。

```yaml
id: world_qinglan_town
name: 青岚镇

time_system:
  total_days: 30
  segments:
    - id: morning
      name: 晨
      order: 1
    - id: noon
      name: 午
      order: 2
    - id: night
      name: 夜
      order: 3
  action_points_per_segment: 3

turn_rules:
  move_cost: 1
  normal_action_cost: 1
  major_action_cost: 2
  dangerous_action_cost: 3

world_intro:
  public: >
    青岚镇位于山路与旧驿之间，靠商队、药草和山货维生。
    近来山中盗匪渐盛，镇里又出现了奇怪的病症。
  hidden: >
    多年前破驿旧庙曾发生火案，镇中几位老人至今讳莫如深。
    这桩旧案与如今的盗匪和疫病线索暗中相连。

starting_state:
  time:
    day: 1
    segment: morning
    action_points: 3
  player:
    location_id: loc_town_gate
```

---

# 5. 世界变量设计

## 5.1 variables.yaml

世界变量是游戏运行时最重要的可计算参数。

```yaml
variables:
  - key: town_order
    name: 小镇秩序
    type: number
    initial: 70
    min: 0
    max: 100
    description: 影响偷盗、冲突、巡守行为与部分结局。

  - key: town_fear
    name: 镇民恐慌
    type: number
    initial: 20
    min: 0
    max: 100
    description: 影响逃离、谣言、暴动、NPC 保守行为。

  - key: plague_level
    name: 疫病程度
    type: number
    initial: 10
    min: 0
    max: 100
    description: 影响药铺事件、病人数量、空镇结局。

  - key: herb_stock
    name: 药材库存
    type: number
    initial: 80
    min: 0
    max: 100
    description: 影响治疗、药铺行为、沈青禾命运线。

  - key: bandit_power
    name: 盗匪势力
    type: number
    initial: 35
    min: 0
    max: 100
    description: 影响山林危险、商路安全、夜袭事件。

  - key: guard_power
    name: 巡守力量
    type: number
    initial: 50
    min: 0
    max: 100
    description: 影响盗匪压制、镇门安全、匪火入镇结局。

  - key: food_price
    name: 粮价指数
    type: number
    initial: 100
    min: 50
    max: 200
    description: 影响集市冲突、流民压力、米铺事件。

  - key: truth_progress
    name: 真相进度
    type: number
    initial: 0
    min: 0
    max: 100
    description: 影响旧案线、祠堂线、真相昭雪结局。

  - key: merchant_route_safety
    name: 商路安全
    type: number
    initial: 60
    min: 0
    max: 100
    description: 影响商队、药材、粮食和外部消息。

  - key: refugee_pressure
    name: 流民压力
    type: number
    initial: 10
    min: 0
    max: 100
    description: 影响镇门、民居区、集市冲突和粮价。
```

---

# 6. 事实标记设计

## 6.1 facts.yaml

Facts 用于记录发生过或尚未发生的关键事实。

```yaml
facts:
  - key: player_arrived_qinglan
    name: 玩家抵达青岚镇
    type: boolean
    initial: true

  - key: first_patient_event_happened
    name: 第一批病人事件已发生
    type: boolean
    initial: false

  - key: shen_asked_player_for_help
    name: 沈青禾已向玩家求助
    type: boolean
    initial: false

  - key: shen_collected_herbs
    name: 沈青禾已上山采药
    type: boolean
    initial: false

  - key: old_case_record_found
    name: 旧案记录已被发现
    type: boolean
    initial: false

  - key: player_bought_bandit_contact_clue
    name: 玩家已购买盗匪接头人线索
    type: boolean
    initial: false

  - key: bandit_attacked_route
    name: 盗匪已袭击商路
    type: boolean
    initial: false

  - key: merchant_route_attack_reported
    name: 商路遇袭消息已传入镇中
    type: boolean
    initial: false

  - key: grain_shortage_rumor_happened
    name: 米粮短缺传闻已出现
    type: boolean
    initial: false

  - key: old_temple_discovered
    name: 破驿旧庙已被发现
    type: boolean
    initial: false
```

---

# 7. 枚举定义

## 7.1 enums.yaml

所有 AI 可用的枚举都要集中定义，避免 AI 乱造字段。

```yaml
npc_tiers:
  - core
  - important
  - normal
  - background

location_types:
  - town_location
  - wild_location
  - ruin_location
  - hidden_location

building_types:
  - shop
  - treatment_room
  - guard_post
  - tavern
  - residence
  - shrine
  - forest_path
  - hidden_area

action_types:
  - move
  - dialogue
  - trade
  - help
  - investigate
  - steal
  - fight
  - rest
  - negotiate
  - threaten

event_types:
  - time_event
  - location_event
  - npc_behavior_event
  - world_state_event
  - player_choice_event

dialogue_types:
  - first_meet
  - normal
  - ask_about_location
  - ask_about_person
  - event_reaction
  - relationship_high
  - relationship_low
  - secret_reveal
  - ask_for_help
  - farewell
  - ending

content_statuses:
  - draft
  - reviewing
  - needs_fix
  - accepted
  - locked
  - rejected

allowed_effect_types:
  - change_variable
  - set_variable
  - change_location_state
  - change_building_state
  - change_npc_state
  - change_player_attribute
  - change_relationship
  - add_fact
  - remove_fact
  - trigger_event
  - start_dialogue
  - move_npc
  - move_player
  - add_item
  - remove_item
  - open_shop
```

---

# 8. 势力设计

## 8.1 factions.yaml

```yaml
factions:
  - id: faction_town_people
    name: 镇民
    type: civil
    description: 青岚镇普通居民，以求生、维持生活和保护家人为核心。
    goals:
      - 维持日常生活
      - 避免疫病扩散
      - 避免盗匪入镇
    default_attitude_to_player: neutral
    content_status: accepted

  - id: faction_guard
    name: 巡守
    type: order
    description: 负责维持镇门、集市和山路秩序的人手。
    goals:
      - 维持小镇秩序
      - 压制盗匪
      - 追查内应
    default_attitude_to_player: cautious
    content_status: accepted

  - id: faction_bandit
    name: 黑岭盗
    type: hostile
    description: 盘踞青岚山路的盗匪势力，劫掠商队和药材。
    goals:
      - 控制山路
      - 劫掠药材和粮食
      - 利用镇中内应
    default_attitude_to_player: hostile
    content_status: accepted

  - id: faction_town_authority
    name: 镇中主事
    type: authority
    description: 以镇长魏长庚为核心的地方权力结构。
    goals:
      - 稳住局面
      - 维护表面秩序
      - 隐瞒旧案
    default_attitude_to_player: cautious
    content_status: accepted
```

---

# 9. 地图设计

## 9.1 maps.yaml

```yaml
maps:
  - id: map_qinglan_town
    name: 青岚镇
    type: grid
    width: 8
    height: 6
    entry_tile_id: tile_01_03

    tiles:
      - id: tile_01_03
        name: 镇门
        x: 1
        y: 3
        terrain: road
        location_id: loc_town_gate
        discovered: true
        visible: true
        blocked: false
        danger_level: 10

      - id: tile_03_03
        name: 集市
        x: 3
        y: 3
        terrain: town
        location_id: loc_market
        discovered: true
        visible: true
        blocked: false
        danger_level: 5

      - id: tile_04_02
        name: 回春药铺
        x: 4
        y: 2
        terrain: town
        location_id: loc_herb_shop
        discovered: true
        visible: true
        blocked: false
        danger_level: 5

      - id: tile_04_04
        name: 旧酒肆
        x: 4
        y: 4
        terrain: town
        location_id: loc_tavern
        discovered: true
        visible: true
        blocked: false
        danger_level: 10

      - id: tile_05_03
        name: 祠堂
        x: 5
        y: 3
        terrain: town
        location_id: loc_ancestral_hall
        discovered: true
        visible: true
        blocked: false
        danger_level: 5

      - id: tile_06_02
        name: 民居区
        x: 6
        y: 2
        terrain: town
        location_id: loc_residential_area
        discovered: true
        visible: true
        blocked: false
        danger_level: 5

      - id: tile_07_03
        name: 青岚山林
        x: 7
        y: 3
        terrain: forest
        location_id: loc_forest
        discovered: true
        visible: true
        blocked: false
        danger_level: 30

      - id: tile_07_05
        name: 破驿旧庙
        x: 7
        y: 5
        terrain: ruin
        location_id: loc_old_temple
        discovered: false
        visible: false
        blocked: false
        danger_level: 50
```

---

# 10. 地点设计

## 10.1 locations.yaml 字段

```yaml
locations:
  - id: loc_herb_shop
    name: 回春药铺
    type: town_location

    tags:
      - medicine
      - treatment
      - plague

    state:
      status: normal
      is_accessible: true
      danger_level: 5
      herb_stock: 45
      patient_count: 3
      is_quarantined: false

    descriptions:
      morning: 药铺刚刚开门，药童正在整理药斗。
      noon: 药铺里挤满了求诊的人，药香和咳声混在一起。
      night: 药铺前门半掩，后堂仍有一盏灯火。

    buildings:
      - building_herb_counter
      - building_consulting_room
      - building_back_yard

    default_npcs:
      - npc_shen_qinghe
      - npc_old_doctor

    access_rules:
      - id: access_herb_shop_daytime
        name: 白日正常进入
        conditions:
          all:
            - fact: time.segment
              in:
                - morning
                - noon
            - fact: location.loc_herb_shop.state.status
              equals: normal
            - fact: location.loc_herb_shop.state.is_quarantined
              equals: false

      - id: access_herb_shop_night_emergency
        name: 夜间紧急求医
        conditions:
          all:
            - fact: time.segment
              equals: night
            - fact: player.state.health
              less_than: 70
            - fact: npc.npc_shen_qinghe.state.alive
              equals: true

    actions:
      - action_buy_medicine
      - action_treatment
      - action_help_boil_medicine

    content_status: accepted
```

---

# 11. 建筑设计

## 11.1 buildings.yaml 字段

```yaml
buildings:
  - id: building_herb_counter
    location_id: loc_herb_shop
    name: 药柜
    type: shop

    state:
      status: normal
      stock_level: 45
      locked: false

    descriptions:
      default: 木柜里分门别类地放着草药，几味常用药已经所剩不多。
      low_stock: 药柜明显空了几格，掌柜的脸色也越发沉重。

    actions:
      - action_buy_medicine
      - action_ask_about_herbs
      - action_steal_medicine

    content_status: accepted

  - id: building_consulting_room
    location_id: loc_herb_shop
    name: 问诊间
    type: treatment_room

    state:
      status: busy
      patient_count: 3

    descriptions:
      default: 问诊间里摆着几张竹榻，病人低声咳着。

    actions:
      - action_treatment
      - action_help_treat_patients
      - action_inquire_plague

    content_status: accepted
```

---

# 12. NPC 设计

## 12.1 NPC 的完整字段

每个 NPC 建议包含以下部分：

```text
基础身份
出身设定
公开背景
私密背景
隐藏背景
性格属性
初始状态
目标
秘密
日程
行为规则
关系
可触发事件
对白引用
结局影响
AI 生成来源
内容状态
```

---

## 12.2 npcs/index.yaml 与 npcs/<slug> 示例

```yaml
# npcs/index.yaml
- id: npc_shen_qinghe
  name: 沈青禾
  path: npcs/shen-qinghe
  files:
    - identity.yaml
    - background.yaml
    - attributes.yaml
    - relationships.yaml
    - behavior.yaml
    - dialogues.yaml

# npcs/shen-qinghe/identity.yaml
id: npc_shen_qinghe
name: 沈青禾
age: 22
identity: 回春药铺学徒
tier: core
faction: faction_town_people
location: loc_herb_shop

# npcs/shen-qinghe/behavior.yaml
behaviorRules:
  - id: rule_shen_collect_herbs
    name: 药材短缺时上山采药
    priority: 90
    conditions:
      all:
        - fact: variables.plague_level
          greater_than_or_equal: 45
    effects:
      - type: move_npc
        npcId: npc_shen_qinghe
        locationId: loc_forest
    designNote: 推动药材短缺线，并让玩家感受到 NPC 会自行行动。
```

---

# 13. 玩家行为设计

## 13.1 actions.yaml

```yaml
actions:
  - id: action_buy_medicine
    name: 购买药材
    type: trade
    target_type: building
    target_id: building_herb_counter

    cost:
      action_points: 1

    conditions:
      all:
        - fact: time.segment
          in:
            - morning
            - noon
        - fact: location.loc_herb_shop.state.status
          equals: normal
        - fact: variables.herb_stock
          greater_than: 0

    effects:
      - type: open_shop
        shop_id: shop_herb_shop

    content_status: accepted

  - id: action_help_boil_medicine
    name: 帮忙熬药
    type: help
    target_type: building
    target_id: building_consulting_room

    cost:
      action_points: 1
      stamina: 10

    conditions:
      all:
        - fact: variables.plague_level
          greater_than_or_equal: 30
        - fact: player.state.stamina
          greater_than_or_equal: 10
        - fact: location.loc_herb_shop.state.patient_count
          greater_than: 0

    effects:
      - type: change_variable
        key: plague_level
        delta: -3
      - type: change_variable
        key: herb_stock
        delta: -2
      - type: change_relationship
        source: player
        target: npc_shen_qinghe
        path: trust
        delta: 5
      - type: change_player_attribute
        attribute: stamina
        delta: -10

    content_status: accepted
```

---

# 14. 事件设计

## 14.1 events.yaml

```yaml
events:
  - id: event_first_patient
    name: 第一批病人
    type: time_event
    location_id: loc_herb_shop

    participants:
      - npc_shen_qinghe

    trigger:
      all:
        - fact: time.day
          greater_than_or_equal: 3
        - fact: facts.first_patient_event_happened
          not_equals: true

    description: 药铺里忽然多了几名发热咳嗽的病人，沈青禾神色不安。

    effects:
      - type: add_fact
        key: first_patient_event_happened
        value: true
      - type: change_variable
        key: plague_level
        delta: 10
      - type: change_location_state
        location_id: loc_herb_shop
        path: patient_count
        delta: 3

    player_options:
      - id: option_help_diagnose
        name: 帮忙诊治
        conditions:
          all:
            - fact: player.identity
              equals: identity_doctor
        effects:
          - type: change_variable
            key: plague_level
            delta: -5
          - type: change_relationship
            source: player
            target: npc_shen_qinghe
            path: trust
            delta: 10

      - id: option_buy_medicine_for_patients
        name: 出钱买药
        conditions:
          all:
            - fact: player.state.money
              greater_than_or_equal: 30
        effects:
          - type: change_player_attribute
            attribute: money
            delta: -30
          - type: change_variable
            key: plague_level
            delta: -3
          - type: change_relationship
            source: player
            target: npc_shen_qinghe
            path: gratitude
            delta: 10

    followups:
      - event_herb_shortage_warning

    content_status: accepted
```

---

# 15. 对话设计

## 15.1 npcs/<slug>/dialogues.yaml

```yaml
dialogues:
  - id: dialogue_shen_first_meet
    speaker: npc_shen_qinghe
    type: first_meet

    conditions:
      all:
        - fact: facts.met_npc_shen_qinghe
          not_equals: true
        - fact: npc.npc_shen_qinghe.state.alive
          equals: true

    text: 若是买药，请稍候。今日问诊的人多，我怕是顾不过来。

    effects:
      - type: add_fact
        key: met_npc_shen_qinghe
        value: true

    content_status: accepted

  - id: dialogue_shen_ask_help
    speaker: npc_shen_qinghe
    type: ask_for_help

    conditions:
      all:
        - fact: variables.plague_level
          greater_than_or_equal: 35
        - fact: relationship.player.npc_shen_qinghe.trust
          greater_than_or_equal: 20
        - fact: npc.npc_shen_qinghe.state.alive
          equals: true

    text: 药不够了，病人却越来越多。若你愿意帮忙，我想请你去山林寻几味药。

    effects:
      - type: add_fact
        key: shen_asked_player_for_help
        value: true

    content_status: accepted
```

---

# 16. 结局设计

## 16.1 endings.yaml

```yaml
endings:
  - id: ending_qinglan_saved
    name: 青岚得存
    priority: 100

    conditions:
      all:
        - fact: variables.plague_level
          less_than_or_equal: 40
        - fact: variables.bandit_power
          less_than_or_equal: 50
        - fact: variables.town_order
          greater_than_or_equal: 50

    summary: 青岚镇虽历经疫病与匪患，却终究保存了下来。药铺重新开门，镇门外又有商旅往来。

    causal_chain_rules:
      - fact: first_patient_event_happened
        text: 第 3 天，镇中出现第一批病人。
      - fact: shen_asked_player_for_help
        text: 沈青禾曾向你求助，而你介入了药铺的困境。

    content_status: accepted

  - id: ending_empty_town
    name: 空镇余烬
    priority: 90

    conditions:
      all:
        - fact: variables.plague_level
          greater_than_or_equal: 75
        - fact: variables.town_fear
          greater_than_or_equal: 70

    summary: 疫病蔓延，药材耗尽，镇民陆续逃离。青岚镇没有在一夜之间毁灭，却在一天天的恐惧中空了。

    causal_chain_rules:
      - fact: first_patient_event_happened
        text: 第一批病人出现后，疫病未能被及时控制。
      - fact: shen_collected_herbs
        text: 沈青禾曾独自上山采药，说明药铺已经无力支撑。

    content_status: accepted

  - id: ending_bandit_takeover
    name: 匪火入镇
    priority: 95

    conditions:
      all:
        - fact: variables.bandit_power
          greater_than_or_equal: 80
        - fact: variables.guard_power
          less_than_or_equal: 40

    summary: 黑岭盗趁夜入镇，巡守无力抵挡。青岚镇没有迎来审判旧案的那一天，只有火光照亮了祠堂的牌位。

    causal_chain_rules:
      - fact: merchant_route_attack_reported
        text: 商路遇袭后，黑岭盗的势力进一步扩张。

    content_status: accepted
```

---

# 17. AI 生成任务设计

## 17.1 generation-jobs.yaml

```yaml
generation_jobs:
  - id: job_generate_core_npcs_001
    type: npc_batch
    target_pack: qinglan_town_mvp
    status: completed

    input:
      count: 6
      npc_tier: core
      target_locations:
        - loc_herb_shop
        - loc_town_gate
        - loc_tavern
        - loc_ancestral_hall
        - loc_forest
      target_storylines:
        - plague
        - bandit
        - old_case
        - food_price
      allow_new_factions: false
      allow_new_locations: false

    output:
      file: npcs/<slug>/*.yaml
      generated_ids:
        - npc_shen_qinghe
        - npc_lu_huaishan
        - npc_zhao_sanniang
        - npc_wei_changgeng
        - npc_han_jin
        - npc_luo_shoucang

    validation:
      last_status: passed
      last_checked_at: 2026-04-28T00:00:00Z
```

---

# 18. Story Lab UI 设计

Story Lab 前端建议分为 7 个核心页面。

```text
1. 总览 Dashboard
2. 世界设定 World Bible
3. 地点与地图 Map & Locations
4. NPC 管理 NPC Studio
5. 事件与分支 Event Graph
6. AI 生成器 Generation Lab
7. 校验与模拟 Validator & Simulator
```

## 18.1 NPC Studio

NPC 编辑器需要分 Tab：

```text
基础信息
出身设定
背景故事
性格属性
状态字段
目标
秘密
日程
行为规则
关系
对白
事件引用
结局影响
AI 生成记录
检测结果
```

## 18.2 Event Graph

事件图需要显示：

```text
事件前置条件
事件影响变量
事件参与 NPC
事件后续 followups
事件影响结局
事件是否可触发
未触发原因
```

## 18.3 Validator 面板

校验面板显示：

```text
错误数量
警告数量
通过数量
按文件分组
按对象分组
按错误类型分组
点击错误定位到字段
一键复制 AI 修复 Prompt
```

---

# 19. 校验器设计

Story Lab 必须内置检测脚本，AI 生成内容后自动调用。

校验分为 8 类：

```text
1. YAML / JSON 格式校验
2. Schema 字段校验
3. ID 唯一性校验
4. 引用有效性校验
5. fact 路径有效性校验
6. conditions / effects 合法性校验
7. 故事逻辑校验
8. 内容缺口分析
```

---

# 20. 推荐检测技术栈

```text
TypeScript
Zod
yaml
fast-glob
tsx
chalk
```

依赖：

```bash
pnpm add zod yaml fast-glob chalk
pnpm add -D tsx typescript
```

package.json 脚本：

```json
{
  "scripts": {
    "build:content-pack": "tsx --tsconfig tsconfig.base.json scripts/build-content-pack.ts content/qinglan-town",
    "validate:content": "tsx --tsconfig tsconfig.base.json scripts/validate-content.ts content/qinglan-town"
  }
}
```

---

# 21. Schema 设计示例

## 21.1 schemas/common.ts

```ts
import { z } from "zod"

export const IdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "ID 必须使用小写字母、数字和下划线，并以字母开头")

export const ContentStatusSchema = z.enum([
  "draft",
  "reviewing",
  "needs_fix",
  "accepted",
  "locked",
  "rejected",
])

export const ConditionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({ fact: z.string(), equals: z.unknown() }).strict(),
    z.object({ fact: z.string(), not_equals: z.unknown() }).strict(),
    z.object({ fact: z.string(), greater_than: z.number() }).strict(),
    z.object({ fact: z.string(), greater_than_or_equal: z.number() }).strict(),
    z.object({ fact: z.string(), less_than: z.number() }).strict(),
    z.object({ fact: z.string(), less_than_or_equal: z.number() }).strict(),
    z.object({ fact: z.string(), in: z.array(z.unknown()) }).strict(),
    z.object({ fact: z.string(), not_in: z.array(z.unknown()) }).strict(),
    z.object({ fact: z.string(), exists: z.boolean() }).strict(),
    z.object({ all: z.array(ConditionSchema) }).strict(),
    z.object({ any: z.array(ConditionSchema) }).strict(),
    z.object({ not: ConditionSchema }).strict(),
  ])
)

export const ConditionGroupSchema = ConditionSchema

export const EffectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("change_variable"),
    key: IdSchema,
    delta: z.number(),
  }).strict(),

  z.object({
    type: z.literal("set_variable"),
    key: IdSchema,
    value: z.number(),
  }).strict(),

  z.object({
    type: z.literal("change_location_state"),
    location_id: IdSchema,
    path: z.string(),
    value: z.unknown().optional(),
    delta: z.number().optional(),
  }).strict(),

  z.object({
    type: z.literal("change_building_state"),
    building_id: IdSchema,
    path: z.string(),
    value: z.unknown().optional(),
    delta: z.number().optional(),
  }).strict(),

  z.object({
    type: z.literal("change_npc_state"),
    npc_id: IdSchema,
    path: z.string(),
    value: z.unknown(),
  }).strict(),

  z.object({
    type: z.literal("change_player_attribute"),
    attribute: IdSchema,
    delta: z.number(),
  }).strict(),

  z.object({
    type: z.literal("change_relationship"),
    source: z.string(),
    target: z.string(),
    path: z.string(),
    delta: z.number(),
  }).strict(),

  z.object({
    type: z.literal("add_fact"),
    key: IdSchema,
    value: z.unknown(),
  }).strict(),

  z.object({
    type: z.literal("remove_fact"),
    key: IdSchema,
  }).strict(),

  z.object({
    type: z.literal("trigger_event"),
    event_id: IdSchema,
  }).strict(),

  z.object({
    type: z.literal("start_dialogue"),
    dialogue_id: IdSchema,
  }).strict(),

  z.object({
    type: z.literal("move_npc"),
    npc_id: IdSchema,
    location_id: IdSchema,
  }).strict(),

  z.object({
    type: z.literal("move_player"),
    location_id: IdSchema,
  }).strict(),

  z.object({
    type: z.literal("add_item"),
    item_id: IdSchema,
    count: z.number().int().positive(),
  }).strict(),

  z.object({
    type: z.literal("remove_item"),
    item_id: IdSchema,
    count: z.number().int().positive(),
  }).strict(),

  z.object({
    type: z.literal("open_shop"),
    shop_id: IdSchema,
  }).strict(),
])
```

---

## 21.2 schemas/npc.ts

```ts
import { z } from "zod"
import {
  IdSchema,
  ContentStatusSchema,
  ConditionGroupSchema,
  EffectSchema,
} from "./common"

export const NpcSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.enum(["male", "female", "unknown"]),
  tier: z.enum(["core", "important", "normal", "background"]),
  identity: z.string().min(1),
  faction: IdSchema,
  default_location: IdSchema,

  origin: z.object({
    birthplace: z.string(),
    family_status: z.string(),
    social_class: z.string(),
    education: z.string(),
    formative_experience: z.string(),
  }).strict(),

  background: z.object({
    public_story: z.string(),
    private_story: z.string(),
    hidden_story: z.string(),
  }).strict(),

  personality: z.object({
    kindness: z.number().min(0).max(100),
    courage: z.number().min(0).max(100),
    greed: z.number().min(0).max(100),
    loyalty: z.number().min(0).max(100),
    suspicion: z.number().min(0).max(100),
    responsibility: z.number().min(0).max(100),
  }).strict(),

  state: z.object({
    alive: z.boolean(),
    health: z.number().min(0).max(200),
    mood: z.string(),
    infected: z.boolean().optional(),
    injured: z.boolean().optional(),
    busy: z.boolean().optional(),
    current_goal: z.string().nullable(),
    story_stage: z.number().int().min(0),
  }).strict(),

  goals: z.array(z.object({
    id: IdSchema,
    name: z.string(),
    priority: z.number().min(0).max(100),
  }).strict()),

  secrets: z.array(z.object({
    id: IdSchema,
    name: z.string(),
    reveal_condition: ConditionGroupSchema,
    content: z.string(),
  }).strict()),

  schedule: z.array(z.object({
    id: IdSchema,
    segment: z.enum(["morning", "noon", "night"]),
    location_id: IdSchema,
    activity: z.string(),
    priority: z.number().min(0).max(100),
    conditions: ConditionGroupSchema,
  }).strict()),

  behavior_rules: z.array(z.object({
    id: IdSchema,
    name: z.string(),
    priority: z.number().min(0).max(100),
    conditions: ConditionGroupSchema,
    effects: z.array(EffectSchema),
    design_note: z.string().optional(),
  }).strict()),

  relationships: z.array(z.object({
    target_id: IdSchema,
    value: z.number().min(-100).max(100),
    trust: z.number().min(0).max(100),
    fear: z.number().min(0).max(100),
    gratitude: z.number().min(0).max(100),
    suspicion: z.number().min(0).max(100),
    relation_type: z.string(),
    reason: z.string(),
  }).strict()),

  dialogue_refs: z.array(IdSchema).default([]),
  event_refs: z.array(IdSchema).default([]),

  ending_impacts: z.array(z.object({
    ending_id: IdSchema,
    condition_note: z.string(),
  }).strict()).default([]),

  ai_meta: z.object({
    generated_by: z.enum(["human", "ai", "mixed"]),
    generation_job_id: IdSchema.optional(),
    reviewed_by: z.string().optional(),
    revision: z.number().int().min(0),
  }).strict(),

  content_status: ContentStatusSchema,
}).strict()

export const NpcFileSchema = z.object({
  npcs: z.array(NpcSchema),
}).strict()
```

---

# 22. 检测脚本设计

## 22.1 tools/validate-content.ts

```ts
import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import { parse } from "yaml"
import chalk from "chalk"
import { NpcFileSchema } from "../packages/schema/npc"
import { z } from "zod"

type ValidationIssue = {
  level: "error" | "warning"
  type: string
  file: string
  targetId?: string
  path?: string
  message: string
}

type ContentIndex = {
  npcIds: Set<string>
  locationIds: Set<string>
  buildingIds: Set<string>
  factionIds: Set<string>
  actionIds: Set<string>
  eventIds: Set<string>
  dialogueIds: Set<string>
  endingIds: Set<string>
  variableKeys: Set<string>
  factKeys: Set<string>
}

function readYamlFile(filePath: string): unknown {
  const raw = fs.readFileSync(filePath, "utf-8")
  return parse(raw)
}

function pushZodIssues(
  issues: ValidationIssue[],
  file: string,
  error: z.ZodError
) {
  for (const item of error.issues) {
    issues.push({
      level: "error",
      type: "schema_error",
      file,
      path: item.path.join("."),
      message: item.message,
    })
  }
}

function validateNpcFile(rootDir: string, issues: ValidationIssue[]) {
  const file = path.join(rootDir, "npcs/index.yaml")

  if (!fs.existsSync(file)) {
    issues.push({
      level: "error",
      type: "missing_file",
      file,
      message: "缺少 npcs/index.yaml",
    })
    return null
  }

  const data = readYamlFile(file)
  const result = NpcFileSchema.safeParse(data)

  if (!result.success) {
    pushZodIssues(issues, file, result.error)
    return null
  }

  return result.data
}

function buildBasicIndex(rootDir: string, npcFile: any): ContentIndex {
  const index: ContentIndex = {
    npcIds: new Set(),
    locationIds: new Set(),
    buildingIds: new Set(),
    factionIds: new Set(),
    actionIds: new Set(),
    eventIds: new Set(),
    dialogueIds: new Set(),
    endingIds: new Set(),
    variableKeys: new Set(),
    factKeys: new Set(),
  }

  for (const npc of npcFile?.npcs ?? []) {
    index.npcIds.add(npc.id)
  }

  const load = (fileName: string) => {
    const file = path.join(rootDir, fileName)
    if (!fs.existsSync(file)) return null
    return readYamlFile(file) as any
  }

  const variables = load("variables.yaml")
  for (const item of variables?.variables ?? []) {
    index.variableKeys.add(item.key)
  }

  const facts = load("facts.yaml")
  for (const item of facts?.facts ?? []) {
    index.factKeys.add(item.key)
  }

  const factions = load("factions.yaml")
  for (const item of factions?.factions ?? []) {
    index.factionIds.add(item.id)
  }

  const locations = load("locations.yaml")
  for (const item of locations?.locations ?? []) {
    index.locationIds.add(item.id)
  }

  const buildings = load("buildings.yaml")
  for (const item of buildings?.buildings ?? []) {
    index.buildingIds.add(item.id)
  }

  const actions = load("actions.yaml")
  for (const item of actions?.actions ?? []) {
    index.actionIds.add(item.id)
  }

  const events = load("events.yaml")
  for (const item of events?.events ?? []) {
    index.eventIds.add(item.id)
  }

  const dialogues = loadNpcDialogues(rootDir)
  for (const item of dialogues?.dialogues ?? []) {
    index.dialogueIds.add(item.id)
  }

  const endings = load("endings.yaml")
  for (const item of endings?.endings ?? []) {
    index.endingIds.add(item.id)
  }

  return index
}

function checkDuplicateIds(
  issues: ValidationIssue[],
  file: string,
  ids: string[],
  label: string
) {
  const seen = new Set<string>()

  for (const id of ids) {
    if (seen.has(id)) {
      issues.push({
        level: "error",
        type: "duplicate_id",
        file,
        targetId: id,
        message: `${label} ID 重复：${id}`,
      })
    }
    seen.add(id)
  }
}

function validateNpcReferences(
  rootDir: string,
  npcFile: any,
  index: ContentIndex,
  issues: ValidationIssue[]
) {
  const file = path.join(rootDir, "npcs/index.yaml")

  for (const npc of npcFile.npcs) {
    if (!index.factionIds.has(npc.faction)) {
      issues.push({
        level: "error",
        type: "reference_error",
        file,
        targetId: npc.id,
        path: "faction",
        message: `NPC ${npc.id} 引用了不存在的 faction：${npc.faction}`,
      })
    }

    if (!index.locationIds.has(npc.default_location)) {
      issues.push({
        level: "error",
        type: "reference_error",
        file,
        targetId: npc.id,
        path: "default_location",
        message: `NPC ${npc.id} 引用了不存在的地点：${npc.default_location}`,
      })
    }

    for (const rel of npc.relationships ?? []) {
      if (!index.npcIds.has(rel.target_id)) {
        issues.push({
          level: "error",
          type: "reference_error",
          file,
          targetId: npc.id,
          path: "relationships.target_id",
          message: `NPC ${npc.id} 的关系引用了不存在的 NPC：${rel.target_id}`,
        })
      }
    }

    for (const id of npc.dialogue_refs ?? []) {
      if (!index.dialogueIds.has(id)) {
        issues.push({
          level: "error",
          type: "reference_error",
          file,
          targetId: npc.id,
          path: "dialogue_refs",
          message: `NPC ${npc.id} 引用了不存在的 dialogue：${id}`,
        })
      }
    }

    for (const id of npc.event_refs ?? []) {
      if (!index.eventIds.has(id)) {
        issues.push({
          level: "error",
          type: "reference_error",
          file,
          targetId: npc.id,
          path: "event_refs",
          message: `NPC ${npc.id} 引用了不存在的 event：${id}`,
        })
      }
    }

    for (const impact of npc.ending_impacts ?? []) {
      if (!index.endingIds.has(impact.ending_id)) {
        issues.push({
          level: "error",
          type: "reference_error",
          file,
          targetId: npc.id,
          path: "ending_impacts.ending_id",
          message: `NPC ${npc.id} 引用了不存在的 ending：${impact.ending_id}`,
        })
      }
    }
  }
}

function collectFactPathsFromCondition(condition: any, paths: string[]) {
  if (!condition || typeof condition !== "object") return

  if (typeof condition.fact === "string") {
    paths.push(condition.fact)
  }

  for (const key of ["all", "any"]) {
    if (Array.isArray(condition[key])) {
      for (const child of condition[key]) {
        collectFactPathsFromCondition(child, paths)
      }
    }
  }

  if (condition.not) {
    collectFactPathsFromCondition(condition.not, paths)
  }
}

function isValidFactPath(pathText: string, index: ContentIndex): boolean {
  if (pathText.startsWith("time.")) return true
  if (pathText.startsWith("player.")) return true

  if (pathText.startsWith("variables.")) {
    const key = pathText.slice("variables.".length)
    return index.variableKeys.has(key)
  }

  if (pathText.startsWith("facts.")) {
    const key = pathText.slice("facts.".length)
    return index.factKeys.has(key)
  }

  if (pathText.startsWith("npc.")) {
    const parts = pathText.split(".")
    const npcId = parts[1]
    return index.npcIds.has(npcId)
  }

  if (pathText.startsWith("location.")) {
    const parts = pathText.split(".")
    const locationId = parts[1]
    return index.locationIds.has(locationId)
  }

  if (pathText.startsWith("building.")) {
    const parts = pathText.split(".")
    const buildingId = parts[1]
    return index.buildingIds.has(buildingId)
  }

  if (pathText.startsWith("relationship.")) {
    const parts = pathText.split(".")
    const source = parts[1]
    const target = parts[2]
    const sourceValid = source === "player" || index.npcIds.has(source)
    const targetValid = target === "player" || index.npcIds.has(target)
    return sourceValid && targetValid
  }

  return false
}

function validateNpcConditionPaths(
  rootDir: string,
  npcFile: any,
  index: ContentIndex,
  issues: ValidationIssue[]
) {
  const file = path.join(rootDir, "npcs/index.yaml")

  for (const npc of npcFile.npcs) {
    const allConditions: any[] = []

    for (const secret of npc.secrets ?? []) {
      allConditions.push(secret.reveal_condition)
    }

    for (const schedule of npc.schedule ?? []) {
      allConditions.push(schedule.conditions)
    }

    for (const rule of npc.behavior_rules ?? []) {
      allConditions.push(rule.conditions)
    }

    for (const condition of allConditions) {
      const paths: string[] = []
      collectFactPathsFromCondition(condition, paths)

      for (const factPath of paths) {
        if (!isValidFactPath(factPath, index)) {
          issues.push({
            level: "error",
            type: "fact_path_error",
            file,
            targetId: npc.id,
            message: `NPC ${npc.id} 使用了无效 fact 路径：${factPath}`,
          })
        }
      }
    }
  }
}

function validateNpcEffects(
  rootDir: string,
  npcFile: any,
  index: ContentIndex,
  issues: ValidationIssue[]
) {
  const file = path.join(rootDir, "npcs/index.yaml")

  for (const npc of npcFile.npcs) {
    for (const rule of npc.behavior_rules ?? []) {
      for (const effect of rule.effects ?? []) {
        if (effect.type === "change_variable" && !index.variableKeys.has(effect.key)) {
          issues.push({
            level: "error",
            type: "effect_error",
            file,
            targetId: npc.id,
            message: `行为 ${rule.id} 修改了不存在的变量：${effect.key}`,
          })
        }

        if (effect.type === "trigger_event" && !index.eventIds.has(effect.event_id)) {
          issues.push({
            level: "error",
            type: "effect_error",
            file,
            targetId: npc.id,
            message: `行为 ${rule.id} 触发了不存在的事件：${effect.event_id}`,
          })
        }

        if (effect.type === "move_npc") {
          if (!index.npcIds.has(effect.npc_id)) {
            issues.push({
              level: "error",
              type: "effect_error",
              file,
              targetId: npc.id,
              message: `行为 ${rule.id} 移动了不存在的 NPC：${effect.npc_id}`,
            })
          }

          if (!index.locationIds.has(effect.location_id)) {
            issues.push({
              level: "error",
              type: "effect_error",
              file,
              targetId: npc.id,
              message: `行为 ${rule.id} 移动到不存在的地点：${effect.location_id}`,
            })
          }
        }
      }
    }
  }
}

function printIssues(issues: ValidationIssue[]) {
  const errors = issues.filter((item) => item.level === "error")
  const warnings = issues.filter((item) => item.level === "warning")

  if (issues.length === 0) {
    console.log(chalk.green("内容校验通过，没有发现问题。"))
    return
  }

  for (const item of issues) {
    const color = item.level === "error" ? chalk.red : chalk.yellow
    console.log(
      color(
        `[${item.level.toUpperCase()}] ${item.type} ${item.file}` +
          `${item.targetId ? `#${item.targetId}` : ""}` +
          `${item.path ? `.${item.path}` : ""}` +
          ` - ${item.message}`
      )
    )
  }

  console.log("")
  console.log(chalk.red(`错误：${errors.length}`))
  console.log(chalk.yellow(`警告：${warnings.length}`))
}

function main() {
  const rootDir = process.argv[2]

  if (!rootDir) {
    console.error("用法：pnpm validate:content content/qinglan-town")
    process.exit(1)
  }

  const issues: ValidationIssue[] = []

  const npcFile = validateNpcFile(rootDir, issues)
  const index = buildBasicIndex(rootDir, npcFile)

  if (npcFile) {
    checkDuplicateIds(
      issues,
      path.join(rootDir, "npcs/index.yaml"),
      npcFile.npcs.map((npc: any) => npc.id),
      "NPC"
    )

    validateNpcReferences(rootDir, npcFile, index, issues)
    validateNpcConditionPaths(rootDir, npcFile, index, issues)
    validateNpcEffects(rootDir, npcFile, index, issues)
  }

  printIssues(issues)

  if (issues.some((item) => item.level === "error")) {
    process.exit(1)
  }
}

main()
```

---

# 23. 检测脚本输出示例

```text
[ERROR] reference_error content/qinglan-town/npcs/shen-qinghe/behavior.yaml#npc_shen_qinghe.event_refs - NPC npc_shen_qinghe 引用了不存在的 event：event_shen_goes_to_forest

[ERROR] fact_path_error content/qinglan-town/npcs/luo-shoucang/behavior.yaml#npc_luo_shoucang - NPC npc_luo_shoucang 使用了无效 fact 路径：variables.morale

[ERROR] effect_error content/qinglan-town/npcs/han-jin/behavior.yaml#npc_han_jin - 行为 rule_han_night_raid 触发了不存在的事件：event_bandit_night_raid

错误：3
警告：0
```

---

# 24. Story Lab 中的检测按钮

Story Lab 前端应提供三个检测入口。

```text
1. 检测当前文件
2. 检测当前故事包
3. 检测并生成 AI 修复 Prompt
```

检测结果展示：

```text
错误类型：reference_error
文件：npcs/shen-qinghe/behavior.yaml
对象：npc_shen_qinghe
字段：event_refs
说明：引用了不存在的事件 event_shen_goes_to_forest
操作：
- 跳转到字段
- 复制错误
- 生成 AI 修复 Prompt
- 标记忽略
```

---

# 25. AI 修复 Prompt 自动生成

当检测失败时，Story Lab 可以自动生成修复 Prompt。

```text
以下是《时空故事》Story Lab 的内容校验错误。
请只修复错误，不要重写全部内容。

【文件】
npcs/shen-qinghe/behavior.yaml

【对象】
npc_shen_qinghe

【错误】
NPC npc_shen_qinghe 引用了不存在的 event：event_shen_goes_to_forest

【原始内容】
{{npc_shen_qinghe_yaml}}

【修复要求】
1. 如果该事件确实应该存在，请只输出一个合法的 event 草稿。
2. 如果该引用不必要，请从 event_refs 中移除。
3. 不要修改 NPC 的其他字段。
4. 输出 YAML。
```

---

# 26. Story Lab 的内容验收规则

AI 生成内容必须经过以下状态流转：

```text
draft
  ↓
validate
  ↓
needs_fix / reviewing
  ↓
accepted
  ↓
locked
```

具体规则：

```text
draft：AI 生成草稿，不能导出进游戏包。
needs_fix：检测未通过，需要修复。
reviewing：检测通过，但等待人工审查。
accepted：人工验收通过，可以进入测试包。
locked：最终定稿，后续 AI 不允许修改。
rejected：废弃，不参与生成上下文。
```

---

# 27. 必须检测的 AI 生成问题

Story Lab 至少要检测以下问题：

```text
字段不存在
字段类型错误
ID 重复
引用不存在
fact 路径不存在
effect 类型非法
变量 key 不存在
NPC 引用了不存在地点
事件引用了不存在 NPC
对白 speaker 不存在
结局条件变量不存在
NPC 死亡后仍有普通对白
地点被隐藏但地图默认可见
建筑没有地点
地点引用不存在建筑
行为没有 conditions
行为没有 effects
事件没有 effects
对话 text 过长
AI 新增了未定义势力
AI 新增了未定义地点
普通 NPC 背景过度夸张
locked 内容被修改
```

---

# 28. 最终设计原则

Story Lab 的核心不是“写故事”，而是**管理可运行的故事数据**。

最终原则：

```text
故事文本负责氛围。
结构字段负责逻辑。
conditions 决定能否触发。
effects 决定世界如何变化。
validator 决定 AI 内容能否进入游戏。
simulator 决定内容是否真的可玩。
human review 决定内容是否最终发布。
```

所以 AI 生成的任何 NPC、事件、对白、行为逻辑，都必须满足：

```text
1. 有合法字段。
2. 有唯一 ID。
3. 引用对象存在。
4. 条件路径有效。
5. 效果可执行。
6. 能被模拟器运行。
7. 能被人工验收。
8. 能被导出给游戏本体。
```

这样 Story Lab 才能支撑《时空故事》长期批量生产 NPC 故事、对话和行为逻辑，而不会因为 AI 内容规模扩大导致世界设定崩坏。
