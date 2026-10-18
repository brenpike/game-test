import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import { isAppVersion, isBuildId } from './src/logic/updateCheck.ts';

/** Reads the canonical app version from package.json. */
function readPackageVersion(): string {
  const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  return packageJson.version;
}

/** Resolves the build id once per vite run: commit SHA in CI, a local timestamp id otherwise, 'dev' for the dev server. */
function resolveBuildId(command: 'build' | 'serve'): string {
  if (command !== 'build') {
    return 'dev';
  }
  return process.env.GITHUB_SHA?.slice(0, 12) || `local-${Date.now().toString(36)}`;
}

/** Emits version.json alongside the build so a running game can detect a newer deploy. */
function createVersionJsonPlugin(version: string, buildId: string): Plugin {
  return {
    name: 'game-test-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version, buildId }),
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const appVersion = readPackageVersion();
  const buildId = resolveBuildId(command);
  if (!isAppVersion(appVersion)) {
    throw new Error(`package.json version ${JSON.stringify(appVersion)} must be SemVer of at most 32 characters.`);
  }
  if (!isBuildId(buildId)) {
    throw new Error(`Build id ${JSON.stringify(buildId)} must match [A-Za-z0-9._-]{1,64}.`);
  }
  return {
    base: command === 'build' ? '/game-test/' : '/',
    server: {
      host: true,
    },
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2000,
    },
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __BUILD_ID__: JSON.stringify(buildId),
    },
    plugins: [createVersionJsonPlugin(appVersion, buildId)],
  };
});
