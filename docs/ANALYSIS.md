# DIY Layout 插件 · 阶段一代码分析 + 阶段二技术方案

> 调查日期：2026-10-04。本文档是 `dsh-diy-layout` 插件的分析与设计依据。

---

## 阶段一：代码分析

### 1. 本机 Harness 安装形态（扫描结果）

| 项 | 值 |
|---|---|
| **实际运行版本** | **0.2.0-rc.2**（桌面 App `/Applications/DeepSeek Harness.app`，Electron，正在运行；profile `~/.dsh/profiles/desktop`） |
| npm 安装 | npx 缓存 `~/.npm/_npx/1e7f6d9597241db0/node_modules/@deepseek-ai/*`（0.2.0-rc.2，含构建产物 `lib/`、类型 `lib/types/`，**未压缩可读**），`dsh` CLI 位于其 `.bin/` |
| 源码检出 | `~/Documents/deepseek-harness/default-workspace/deepseek-harness-src`（**0.1.7-rc.2**，未构建；其 client 侧源码结构与 0.2.0-rc.2 构建产物逐项核对一致，分析结论可直接沿用） |
| DSH_HOME | `~/.dsh`（profiles：`web`、`desktop`） |
| 桌面 profile 已装插件 | 22 个 bundle，含 `dsh-better-sidebar`、`@linxin666/dsh-client-ui-task-board`、`@linxin666/dsh-client-ui-skill-explorer`、`dshmarket`、`@g57651/dsh-session-manager` 等大量第三方 UI 插件 |

> 重要：用户实际运行的是桌面版 **0.2.0-rc.2**，不是源码检出的 0.1.7-rc.2。本插件的类型检查与运行时验证均对准 0.2.0-rc.2（npx 缓存内的构建产物 + 类型声明），源码检出仅用于阅读实现模式。

### 2. 主页侧边栏相关文件（权威清单）

前端是 pnpm monorepo 中的 `packages/client/*`（React + 自研 Cordis DI + 自研 Slots 扩展系统），左侧边栏链路：

| 文件（包） | 作用 |
|---|---|
| `ui-layout/src/client/index.ts` | 把 `AppFrame` 注册进内建 `root` slot，声明 `sidebar`/`main`/`rightbar`/`shell.overlay`/`shell.leading` 子槽 |
| `ui-layout/src/client/AppFrame.tsx` | 三列 CSS grid 框架；`renderSlot('sidebar', {collapsed, width})`；`data-sidebar-collapsed` 等稳定 data 属性；`shell.overlay` 渲染在 `div[data-shell-overlay]`（list、点击穿透） |
| `ui-layout/src/client/columns.ts` | 列几何常量：`SIDEBAR_MIN=264 / MAX=420 / DEFAULT=280 / COLLAPSED=56 / AUTO_COLLAPSE=1024` |
| `ui-layout/src/client/stores.ts` + `service.ts` | 布局 store（`panelInfo.activePanelId`、`layoutInfo.sidebar`）与 `ctx.layout`（`LayoutController`：仅 `selectPanel` / `toggleSidebar` / `openRightbar` / `closeRightbar` / `beginNavigation`——**不暴露侧边栏宽度写入**） |
| `ui-sidebar/src/client/index.ts` | 侧边栏插件 apply：把 `SidebarRoot` 注册进 `sidebar` 槽并**声明 7 个子槽**（`sidebar.brand.mark/name`、`sidebar.toggle.badge`、`sidebar.panellist`(list)、`sidebar.workspaces`、`sidebar.footer.action`(list)、`sidebar.settings`）；用 `entriesOfSlot('sidebar.panellist')` + `subscribe` 把条目台账投影成 `{id, order, label}` 快照，按 `order` 稳定排序 |
| `ui-sidebar/src/client/SidebarRoot.tsx` | 侧边栏外壳；内部 `PanelRow` 渲染每条插件入口：`<Tooltip label delayMs={500} disabled={wide}><button aria-label aria-current class=panelRow[+panelActive]><span class=panelGlyph>{renderSlot('sidebar.panellist',{size,active},{only:id})}</span>{wide && <span class=panelTitle>label</span>}</button></Tooltip>` |
| `ui-sidebar/src/client/SidebarRoot.module.css` | `.panelList`（flex column，gap 4px）；`.panelRow`（min-height 36px，margin 0 2px，padding 7px 8px，radius `--dsw-radius-md`，hover/active 同色 `--dsw-alias-interactive-bg-hover`）；`.panelTitle` 已自带 ellipsis；折叠 rail 36×36 |
| `ui-plugin-manager/src/client/index.ts` | 往 `sidebar.panellist` 注册条目的真实范例：`{name, id:'plugins', order:0, label:()=>t('panel'), locale:NS}, PluginsPanelIcon`（**entry 组件本身就是图标**，接收 owner props `{size, active}`）；同 id 注册 `main` keyed 页面 |
| `ui-schedule/src/client/index.ts` | 同上，`id:'schedules'`，order 10 |

**当前渲染流程**：各插件 `ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({id, order, label}, IconComponent))` → ui-sidebar 订阅台账并投影（按 order 排序）→ `SidebarRoot` 渲染 `nav.panelList > PanelRow*`，图标由条目组件渲染，点击调 `ctx.layout.selectPanel(id)` 切换 `main` keyed 槽中央面板。

**CSS Modules 哈希模式**（0.2.0-rc.2 构建产物实测）：`[hash]_[local]`，如 `hHd-Xa_panelRow`——生成类名**以原类名结尾**，可用 `[class*="_panelRow"]` / `[class$="_panelList"]` 属性选择器稳定定位；`panelList` 类名全仓库唯一。

### 3. 关键平台设施（本插件直接复用）

- **Tooltip**（`ui-primitives/Tooltip.tsx`，baseline 模块）：`{label, shortcutKeys, side, align, delayMs=0, gap=8, disabled, portal, maxWidth, children}`；fixed 定位 + 视口翻转；hover 500ms / focus 立即（侧边栏自己的约定）；点击收回；气泡样式 `--dsw-alias-tooltip-bg` 等（见 `Tooltip.module.css`）。**限制**：必须拥有锚点元素（cloneElement 包裹 children），无法附着到别人渲染的按钮上。
- **主题**（`ui-theme`）：暗色 `body[data-ds-dark-theme]`；组件只允许引用 `--dsw-alias-*` 语义层 + `--dsw-radius-*` + `--ds-ease-in-out` 等设计令牌。
- **持久化**（`client/store`）：`defineStore({init, persist: 'dsh.xxx', actions})` → localStorage 整值 JSON；`ui-sidebar-right`、`ui-conversation` 等均如此。左侧栏宽度目前**不持久化**（layout store 无 persist）。
- **设置界面扩展**：`settings.section`（list，owner `{close()}`，options `{id, order, label}`，页面组件自带 `<h2>` 标题）——`ui-settings-plugins`、better-sidebar 都这样注册整页。
- **浮层**：`shell.overlay`（list、root、点击穿透、`data-shell-overlay` 容器）。
- **模块表基线**（`web/src/platform.ts`）：`react`、`react/jsx-runtime`、`react-dom`、`react-dom/client`、`@deepseek-ai/cordis`、`dsh-client-store`、`dsh-client-ui-slots`、`dsh-client-ui-primitives`、`dsh-client-ui-dockkit` 对所有动态包隐式可用（构建时 external、运行时 `require` 注入）。
- **客户端插件包结构**：`package.json` 声明 `exports["."]`（host 半）+ `exports["./client"]`（浏览器 bundle）+ `dsh.client{platform:'web'}` + `dsh.bundle.patch`；bundle 是闭包工厂 `window.__ModuleLoader__.load({id, factory(require){...}})`。

### 4. 介入点评估（侵入性从低到高）

| 方案 | 能做到 | 结论 |
|---|---|---|
| A. 贡献新 panellist 条目 | 只能加条目 | 不满足需求 |
| B. 以更低 priority 遮蔽 panellist 单元格 | 换 order/label/图标 | 会**替换掉原条目组件（图标）**——内置插件图标可复刻，第三方插件图标无法复刻，且改不了行按钮 DOM → 弃用 |
| C. 遮蔽整个 `sidebar` 槽（fork SidebarRoot） | 一切 | **不可行**：7 个子槽声明被 ui-sidebar 占用（注册同名子槽 throw），而 renderSlot 授权按 entry 绑定——替换者无法渲染 `sidebar.workspaces`（工作区树）、`sidebar.settings` 等内容，侧边栏会残废 |
| D. **CSS 注入 + 浮层 Tooltip + 设置页 slot（本方案）** | 见下 | ✅ 全部需求可达成，零核心修改，纯增量 |

### 5. 技术限制（如实声明）

1. **侧边栏宽度调节无法安全实现**：`ctx.layout` 不暴露 `setSidebar`；宽度在内联 `grid-template-columns` 上（带拖拽手柄、store clamp）。用 CSS `!important` 覆盖会与拖拽/clamp 逻辑互相打架。→ **不实现**（需求中为可选项），改为侧边栏自带拖拽。
2. **CSS 重排不改 DOM 顺序**：用 flex/grid `order` 实现，视觉顺序变、Tab 焦点顺序不变（条目个位数，影响极小）。
3. **样式锚点依赖 0.2.0-rc.2 的 CSS Modules 编译模式**（`[hash]_[local]`）与类名（`panelList` 等）。已用 `dsh.engines` 钉住版本；DSH 升级后若失效，插件自动退化为“不生效”而非破坏 UI（选择器匹配不到就不产生效果）。
4. Tooltip 需自绘一个小气泡（~40 行，样式逐值复刻 `Tooltip.module.css` 并使用同一批设计令牌）：因为官方 `Tooltip` 必须拥有锚点元素，而这里锚点（按钮）由 `SidebarRoot` 渲染，插件无法包一层。

---

## 阶段二：技术方案

**插件身份**：`dsh-diy-layout`（客户端 UI 插件 + bundle），单条 insert 行 `id: diy-layout`。不改任何 Harness 核心文件。

**介入方式（全部官方增量通道）**：

1. **布局/名称显示/隐藏/排序 → 注入式 CSS**
   apply 侧挂一个 `<style data-plugin-css="dsh-diy-layout/sidebar">`，订阅「用户配置 store + `sidebar.panellist` 台账 + locale」三路变化重新生成规则文本。规则锚点：
   - 导航容器 `nav[class*="_panelList"]`（唯一）
   - 展开态根 `div[class*="_root"]:not([class*="_collapsed"])`（折叠 rail 有自己的 36×36 图标态，规则避开它）
   - 行 `button[class*="_panelRow"]`、标题 `span[class*="_panelTitle"]`
   - 双栏：容器 `display:grid; grid-template-columns:repeat(2, minmax(0,1fr))`，行去外边距、`min-width:0`（标题已自带 ellipsis）
   - 仅图标：标题 `display:none` + 行内容居中
   - 隐藏：`nav > button:nth-child(k) { display:none }`（display:none 同时移出 Tab 序与无障碍树）
   - 排序：`nav > button:nth-child(k) { order: p }`——k 由「与 ui-sidebar 完全相同的投影算法」（`entriesOfSlot` + order 稳定排序）算出的自然 DOM 位次，p 为用户期望位次；恒等排列时不生成规则
2. **Tooltip → `shell.overlay` 注册一个悬浮提示组件**
   仅「仅图标」模式激活；document 级委托 `pointerover/out`、`focusin/out`、`pointerdown`；对「标题 span 存在且被 CSS 隐藏」的按钮延迟 500ms 显示（与 shell 约定一致；折叠 rail 的行没有标题 span，继续用 shell 自带 Tooltip，**不会双重气泡**）；`createPortal(document.body)` + z-index 1100 + 左侧翻转，样式复刻官方气泡。
3. **配置界面 → `settings.section` 注册整页**（id `diy-layout`，order 16）：布局模式 SegmentedControl、名称显示 SegmentedControl、逐条目上移/下移 + 显示/隐藏 Switch、恢复默认。组件全部取自 `ui-primitives`（baseline 模块）。
4. **状态**：`defineStore` 单例（ui-layout 同款单例化模式），`persist: 'dsh.diy-layout.v1'` → localStorage，重启保留。
5. **主题**：全部颜色/圆角/动效走 `--dsw-alias-*` / `--dsw-radius-*` / `--ds-ease-in-out` 令牌，暗色自动适配。
6. **兼容性**：不注册 panellist 单元格、不遮蔽任何已有 entry、不碰 DOM 结构；新装第三方侧边栏插件自动纳入排序/隐藏/双栏（其行同样被选择器覆盖）；插件卸载即撤 style 元素与 overlay，零残留。

**数据流**：

```
slots.changed('sidebar.panellist') / locale ──► 投影 syncEntries ──► store.entries（自然序）
用户配置 store（persist localStorage）──────────┐
                                              ├─► buildSidebarCss(state, entries) ──► <style> 文本更新
Tooltip overlay（读 store.nameDisplay）────────┘
设置页（读 store.entries + 写 actions）─┘
```
