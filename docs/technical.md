# 技术说明

## 技术简述

- 纯前端单机运行，无需后端服务。
- 使用结构化内容包驱动剧情和交互。
- 地图采用 SVG 网格绘制，辅以贴图增强展示效果。
- 游戏逻辑由条件系统、效果系统、事件系统和 NPC 行为系统共同驱动。
- 配套制作工具用于生成、编辑、校验和测试游戏内容。

## 技术方向

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- IndexedDB / LocalStorage

## 推荐文件架构

```text
project-root
├── apps
│   ├── game-client      # 游戏本体
│   └── story-lab        # 剧情内容制作工具
│
├── packages
│   ├── schema           # 内容数据结构定义
│   ├── engine           # 条件、效果、回合、NPC 行为等核心逻辑
│   ├── validator        # 内容校验器
│   └── content-pack     # 内容包导入导出
│
├── content
│   ├── sources          # 制作期内容包源文件
│   └── packs            # 发布期内容包产物
│
└── docs                 # 项目文档
```

## 环境要求

- Node.js `20.19+` 或 `22.12+`
- pnpm `10+`

## 安装依赖

```bash
pnpm install
```

## 启动游戏本体

```bash
pnpm dev:game
```

默认访问：

```text
http://localhost:5173
```

## 启动 Story Lab

```bash
pnpm dev:lab
```

默认访问：

```text
http://localhost:5174
```

## 构建全部项目

```bash
pnpm build
```

## 运行常用检查

```bash
pnpm check
```

该命令会依次执行：

- `pnpm validate:content`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build:content-pack`

只有前三项全部成功后，才会自动执行 `pnpm build:content-pack`。

## 生成内容包

制作期内容包目录是内容源头。修改源文件后，先生成发布期产物：

```bash
pnpm build:content-pack
```

该命令会更新：

- `content/packs/manifest.json`
- `content/packs/<packId>.json`

`apps/game-client/public/content-packs` 与 `apps/story-lab/public/content-packs` 是指向 `content/packs` 的软链接，两个应用共用同一份打包产物。

## 校验内容包

```bash
pnpm validate:content
```

## 运行 30 天模拟

```bash
pnpm simulate
```
