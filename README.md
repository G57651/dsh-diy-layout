# dsh-diy-layout · 侧边栏 DIY 布局

一个 DeepSeek Harness 客户端 UI 插件：**无需修改 Harness 任何源码**，即可自定义主页侧边栏两个插件区域的展示方式与排列布局——上部的「全局面板」列表，以及底部账号/设置区上方的「插件行」（chat-import、dsh-context、one-click-restart 等注册的 `sidebar.footer.action` 位置）。

- 全局面板：单栏 / 双栏排列；图标+名称 / 仅图标（悬浮显示名称 Tooltip）
- 底部插件行：默认横向 / 单列 / 双列；跟随插件 / 仅图标（悬浮提示）
- 两个区域均支持逐条目排序（上移/下移）与显示/隐藏
- 配置持久化在浏览器 localStorage（`dsh.diy-layout.v2`），重启后仍然保留
- 明暗主题自动适配（全部使用官方 `--dsw-alias-*` 设计令牌）

## 使用方法

安装后（见下），打开 **设置 → 侧边栏 DIY 布局**：

| 配置项 | 说明 |
|---|---|
| 全局面板 · 布局模式 | 单栏（默认）/ 双栏（按侧边栏宽度自动分列） |
| 全局面板 · 名称显示 | 图标 + 名称（默认）/ 仅图标——悬浮图标 500ms 后显示名称气泡 |
| 底部插件区 · 排列方式 | 默认横向（默认）/ 单列 / 双列 |
| 底部插件区 · 名称显示 | 跟随插件（默认，由各插件自适应形态）/ 仅图标——压缩为 36×36 圆钮并悬浮显示名称；自带 `title` 提示的条目沿用其原生提示 |
| 插件排列与显示（两个区域各一组） | 每个插件一行：↑ 上移、↓ 下移、开关 = 显示/隐藏 |
| 恢复默认 | 清除两个区域的排序与隐藏记录（布局模式与名称显示保留） |

折叠侧边栏（56px 图标栏）有自己的官方图标态与 Tooltip，本插件不干预其中；隐藏与排序在折叠栏中保持一致。

## 安装（bundle 通道，推荐）

**方式 A · Release 安装包**（从 [Releases](https://github.com/G57651/dsh-diy-layout/releases) 下载或直接用 URL）：

```sh
dsh plugin --profile <你的 profile> add \
  https://github.com/G57651/dsh-diy-layout/releases/download/v0.2.0/dsh-diy-layout-0.2.0.tgz
# 例如桌面版：dsh plugin --profile desktop add <上面的 URL>（或经应用内插件管理器安装）
```

**方式 B · GitHub 仓库直接安装**（仓库内已含构建产物 lib/，无需授权构建脚本）：

```sh
dsh plugin --profile <你的 profile> add github:G57651/dsh-diy-layout
```

安装后重启 Harness（桌面 App 或 `dsh web`）即生效。卸载：`dsh plugin --profile <profile> remove dsh-diy-layout`。

本地试跑（不改 profile）：

```sh
dsh web --patch ./test/diy-layout.local.patch.yml   # patch 内为插件 lib/index.js 的绝对路径
```

## 实现原理（为什么零侵入）

Harness 的侧边栏由 `ui-sidebar` 的 `SidebarRoot` 渲染：上部的插件入口来自 `sidebar.panellist` list slot（entry 组件即图标，行按钮/标签由 shell 渲染）；底部账号/设置区上方的插件行来自 `sidebar.footer.action` list slot（chat-import、dsh-context、one-click-restart 等在此注册**自带完整按钮**的条目）。slots 系统不授权重排或替换他人的行 DOM，因此本插件采用三条**官方增量通道**：

1. **注入式样式**：apply 侧维护一个 `<style data-plugin="dsh-diy-layout">`，订阅「配置 store + 两个 slot 台账 + locale」重新生成规则。选择器锚定 DSH CSS Modules 的 `[hash]_<local>` 编译模式（如 `hHd-Xa_panelRow`）与全仓库唯一的 `panelList`/`footArea` 类名；footer 条目经渲染器的 `div[data-slot]` 锚点定位。双栏/双列=容器 grid、仅图标=隐藏标签、隐藏=`display:none !important`（footer 条目自带内联样式）、排序=flex/grid `order`。选择器匹配不到时插件静默失效，**不可能破坏 UI**。
2. **条目身份标记**：footer 共享一个 slot outlet，且部分条目可能条件性渲染为空（如内置 cordis-panel），DOM 位次与台账位次会错位——插件通过 React fiber（`RootEntry` 的 `entry.options.id`）给每个已渲染条目打上 `data-diy-entry="<id>"` 标记，排序/隐藏规则按 id 而非位置命中，对任意第三方条目稳健。fiber 结构变化时标记失效，表现为功能不生效而非破坏。
3. **悬浮 Tooltip**：注册进 `shell.overlay`（官方加法式浮层），document 级委托监听，对面板行（标签被样式隐藏时）与 footer 条目（仅图标规则生效且无自带 `title` 时）延迟 500ms 显示气泡（`createPortal` 到 body，样式复刻官方 `Tooltip.module.css`）。折叠 rail 与自带提示的条目不覆盖，**不会出现双重气泡**。
4. **设置页**：注册 `settings.section`（id `diy-layout`），控件全部来自 `ui-primitives`。

**不做的事**：不注册/遮蔽任何已存在的 slot entry，不改 DOM 结构，不 import 其他插件代码。侧边栏宽度调节未实现——`ctx.layout` 不暴露宽度写入（强改会与拖拽/clamp 逻辑冲突）；侧边栏宽度请用自带拖拽手柄。

## 兼容性

- 锁定 `dsh >= 0.2.0-rc.1`（在 0.2.0-rc.2 上开发并测试）。DSH 处于 developer preview，升级后若类名/结构变化，插件自动退化为「不生效」而非破坏 UI。
- 新装第三方侧边栏插件（两个区域皆可）自动纳入排序/隐藏/布局；其卸载后残留的记录惰性存在，可用「恢复默认」清除。
- 已知取舍：CSS `order` 改变视觉顺序，Tab 焦点顺序仍按 DOM 序（条目个位数时影响极小）；隐藏的行同时移出 Tab 序与无障碍树；footer 仅图标模式依赖通用覆盖规则，形态特殊的条目以「跟随插件」模式为准。

## 开发

```
pnpm pack 之前先构建：使用 Harness 仓库工具链
  <repo>/node_modules/.bin/tsdown          # 产出 lib/index.js + lib/client.js
  <repo>/node_modules/.bin/tsc -p tsconfig.json   # 类型检查（paths 指向 0.2.0-rc.2 类型）
```

源码结构：

```
src/index.ts               # Node 半（Loader 加载，空 apply）
src/client/index.tsx       # apply：词典/存储/样式/台账投影/两个 slot 注册
src/client/store.ts        # defineStore（persist: dsh.diy-layout.v2，两个区域的配置）
src/client/sidebar-css.ts  # CSS 生成器（锚点 + 两个区域的规则）
src/client/tagging.ts      # React fiber 条目身份标记（data-diy-entry）
src/client/tooltip-overlay.tsx
src/client/settings-page.tsx
src/client/locales.ts      # zh/en
docs/ANALYSIS.md           # 阶段一分析与阶段二方案
test/fixture-panels/       # 测试夹具：两个区域各 4/3 个模拟条目（非交付物）
```
