/**
 * Standalone build for dsh-diy-layout, mirroring the repository's dynamic
 * client-bundle contract (packages/client/tsdown.client.ts, clientConfig):
 *
 * - lib/index.js  — Node half loaded by the cordis Loader (empty apply).
 * - lib/client.js — browser CJS closure factory: the banner hands the module
 *   table's `require` in, the intro/footer shape the CommonJS module record.
 *   Every PLATFORM_MODULES specifier stays external (resolved from the frozen
 *   module table at factory execution); everything else inlines.
 *
 * CSS is carried as TS string constants instead of *.module.css, so no CSS
 * pipeline is needed in this standalone build. The config is a plain object
 * (no `tsdown` import) so the binary can be invoked from an external
 * toolchain checkout.
 */

const ID = 'dsh-diy-layout'

/** The shell's frozen module table (packages/client/web/src/platform.ts). */
const PLATFORM_MODULES = new Set([
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
])

export default [
  {
    entry: ['src/index.ts'],
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'src/client/index.tsx' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: false,
    sourcemap: false,
    clean: false,
    deps: {
      // Module-table rows stay imports; everything else inlines (the preset's
      // rule: a require() the table cannot answer is a guaranteed throw).
      neverBundle: (specifier: string) => PLATFORM_MODULES.has(specifier),
      alwaysBundle: (specifier: string) => !PLATFORM_MODULES.has(specifier),
    },
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    // `return exports` (not the preset's `return module.exports`): this
    // toolchain's rolldown constant-folds the intro into
    // `var exports = { exports: {} }.exports`, dropping the `module` binding
    // while keeping the identical exports object.
    footer: 'return exports; } });',
    outputOptions: {
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      entryFileNames: 'client.js',
    },
  },
]
