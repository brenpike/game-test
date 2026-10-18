/**
 * Build-time constants injected by the `define` option in vite.config.ts.
 * Platform code only: never use these in src/logic/, which must stay pure.
 */

/** App version from package.json. */
declare const __APP_VERSION__: string;

/** Build id: short commit SHA in CI, `local-<time>` for local builds, `dev` for the dev server. */
declare const __BUILD_ID__: string;
