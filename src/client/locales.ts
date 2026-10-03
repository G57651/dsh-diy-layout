/** `diyLayout` namespace dictionaries for the settings page and overlay tooltip. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'settings.section': '侧边栏 DIY 布局',
  'settings.intro': '自定义主页侧边栏插件入口的排列与展示方式。设置保存在本浏览器，重启后仍然生效。',
  'columns.label': '布局模式',
  'columns.one': '单栏',
  'columns.two': '双栏',
  'names.label': '名称显示',
  'names.icon-name': '图标 + 名称',
  'names.icon-only': '仅图标（悬浮提示）',
  'order.heading': '插件排列与显示',
  'order.empty': '侧边栏暂无插件入口。',
  'order.up': '上移',
  'order.down': '下移',
  'order.show': '在侧边栏显示 {name}',
  'order.hide': '在侧边栏隐藏 {name}',
  'order.hiddenTag': '已隐藏',
  'reset.label': '恢复默认',
  'reset.hint': '清除排序与隐藏记录，恢复 Harness 默认排列。',
} satisfies Record<string, string>

/** The diyLayout namespace key union. */
export type DiyLayoutKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'settings.section': 'Sidebar DIY Layout',
  'settings.intro': 'Customize how the sidebar plugin entries are arranged and displayed. Settings persist in this browser across restarts.',
  'columns.label': 'Layout mode',
  'columns.one': 'Single column',
  'columns.two': 'Two columns',
  'names.label': 'Plugin names',
  'names.icon-name': 'Icon + name',
  'names.icon-only': 'Icon only (hover tooltip)',
  'order.heading': 'Plugin order and visibility',
  'order.empty': 'The sidebar has no plugin entries yet.',
  'order.up': 'Move up',
  'order.down': 'Move down',
  'order.show': 'Show {name} in the sidebar',
  'order.hide': 'Hide {name} from the sidebar',
  'order.hiddenTag': 'Hidden',
  'reset.label': 'Reset to defaults',
  'reset.hint': 'Clear ordering and hidden records, restoring the Harness default arrangement.',
} satisfies Record<DiyLayoutKey, string>
