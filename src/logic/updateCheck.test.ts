import { describe, expect, it } from 'vitest';
import {
  BUILD_MANIFEST_FILE,
  CACHE_BUST_PARAM,
  MAX_BUILD_MANIFEST_BYTES,
  RELOAD_PARAM,
  UPDATE_CHECK_MIN_INTERVAL_MS,
  UPDATE_CHECK_TIMEOUT_MS,
  attemptedBuildIdFrom,
  decideUpdate,
  formatVersionLabel,
  isAppVersion,
  isBuildId,
  manifestUrl,
  parseBuildManifest,
  parseBuildManifestText,
  reloadUrl,
  shouldCheck,
  type BuildManifest,
  type UpdateDecisionInput,
} from './updateCheck';

const CURRENT = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REMOTE: BuildManifest = { version: '0.5.0', buildId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
const LIVE_HREF = 'https://brenpike.github.io/game-test/?v=old#x';
const VALID_BUILD_IDS = ['0123456789ab', `local-${(1760000000000).toString(36)}`, 'dev', 'a'.repeat(64)];
const INVALID_BUILD_IDS = [
  '',
  'a'.repeat(65),
  'a/b',
  'a?b',
  'a&b',
  'a%20b',
  'a#b',
  'a b',
  'caf\u00e9',
  '\u{1F600}',
  'a\u0000b',
  'a\nb',
  'a\tb',
  'abc\u007f',
];
const VALID_VERSIONS = ['0.2.0', '1.0.0-beta.1+build.5'];
const INVALID_VERSIONS = ['', 'latest', '1.2', 'v1.2.3', '1.2.3.4', `1.2.3-${'a'.repeat(27)}`, '1.2.3\n', ' 1.2.3'];

/** Returns a decision input for a new remote build, with overrides applied. */
function inputWith(overrides: Partial<UpdateDecisionInput>): UpdateDecisionInput {
  return { enabled: true, currentBuildId: CURRENT, remote: REMOTE, attemptedBuildId: null, ...overrides };
}

describe('constants', () => {
  it('exposes the agreed names and timings', () => {
    expect(BUILD_MANIFEST_FILE).toBe('version.json');
    expect(RELOAD_PARAM).toBe('v');
    expect(CACHE_BUST_PARAM).toBe('t');
    expect(UPDATE_CHECK_MIN_INTERVAL_MS).toBe(60_000);
    expect(UPDATE_CHECK_TIMEOUT_MS).toBe(8_000);
  });
});

describe('parseBuildManifest', () => {
  it('returns exact fields and ignores extra fields', () => {
    expect(parseBuildManifest({ version: '0.5.0', buildId: 'abc123', extra: 1 })).toEqual({
      version: '0.5.0',
      buildId: 'abc123',
    });
  });

  it('accepts every valid build id and version', () => {
    for (const buildId of VALID_BUILD_IDS) {
      expect(parseBuildManifest({ version: '0.2.0', buildId })).toEqual({ version: '0.2.0', buildId });
    }
    for (const version of VALID_VERSIONS) {
      expect(parseBuildManifest({ version, buildId: 'dev' })).toEqual({ version, buildId: 'dev' });
    }
  });

  it('rejects padded fields instead of trimming them', () => {
    expect(parseBuildManifest({ version: ' 0.5.0 ', buildId: 'abc123' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: '\tabc123\n' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0\n', buildId: 'abc123' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: ' abc123' })).toBeNull();
  });

  it('rejects invalid build ids and versions', () => {
    for (const buildId of INVALID_BUILD_IDS) {
      expect(parseBuildManifest({ version: '0.2.0', buildId })).toBeNull();
    }
    for (const version of INVALID_VERSIONS) {
      expect(parseBuildManifest({ version, buildId: 'dev' })).toBeNull();
    }
  });

  it('rejects non-objects, null and arrays', () => {
    expect(parseBuildManifest(null)).toBeNull();
    expect(parseBuildManifest(undefined)).toBeNull();
    expect(parseBuildManifest('0.5.0')).toBeNull();
    expect(parseBuildManifest(42)).toBeNull();
    expect(parseBuildManifest(true)).toBeNull();
    expect(parseBuildManifest(['0.5.0', 'abc'])).toBeNull();
  });

  it('rejects missing, non-string or blank fields', () => {
    expect(parseBuildManifest({})).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0' })).toBeNull();
    expect(parseBuildManifest({ buildId: 'abc' })).toBeNull();
    expect(parseBuildManifest({ version: 5, buildId: 'abc' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: null })).toBeNull();
    expect(parseBuildManifest({ version: '   ', buildId: 'abc' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: '' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: 123 })).toBeNull();
    expect(parseBuildManifest({ version: ['0.5.0'], buildId: 'abc' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: { id: 'abc' } })).toBeNull();
  });
});

describe('isBuildId', () => {
  it('accepts 1 to 64 characters from [A-Za-z0-9._-]', () => {
    for (const buildId of VALID_BUILD_IDS) expect(isBuildId(buildId)).toBe(true);
    expect(isBuildId('A.b_c-9')).toBe(true);
  });

  it('rejects empty, too long, URL-special, whitespace, non-ASCII and control characters', () => {
    for (const buildId of INVALID_BUILD_IDS) expect(isBuildId(buildId)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isBuildId(undefined)).toBe(false);
    expect(isBuildId(null)).toBe(false);
    expect(isBuildId(123)).toBe(false);
    expect(isBuildId(['dev'])).toBe(false);
  });
});

describe('isAppVersion', () => {
  it('accepts SemVer with optional pre-release and build metadata', () => {
    for (const version of VALID_VERSIONS) expect(isAppVersion(version)).toBe(true);
  });

  it('accepts 32 characters and rejects 33', () => {
    const atLimit = `1.2.3-${'a'.repeat(26)}`;
    expect(atLimit).toHaveLength(32);
    expect(isAppVersion(atLimit)).toBe(true);
    const overLimit = `1.2.3-${'a'.repeat(27)}`;
    expect(overLimit).toHaveLength(33);
    expect(isAppVersion(overLimit)).toBe(false);
  });

  it('rejects non-SemVer strings', () => {
    for (const version of INVALID_VERSIONS) expect(isAppVersion(version)).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(isAppVersion(undefined)).toBe(false);
    expect(isAppVersion(null)).toBe(false);
    expect(isAppVersion(1)).toBe(false);
  });
});

describe('parseBuildManifestText', () => {
  const validText = JSON.stringify({ version: '0.2.0', buildId: '0123456789ab' });

  it('parses a valid manifest', () => {
    expect(parseBuildManifestText(validText)).toEqual({ version: '0.2.0', buildId: '0123456789ab' });
  });

  it('accepts text of exactly the size limit', () => {
    const atLimit = validText.padEnd(MAX_BUILD_MANIFEST_BYTES, ' ');
    expect(MAX_BUILD_MANIFEST_BYTES).toBe(1024);
    expect(atLimit).toHaveLength(1024);
    expect(parseBuildManifestText(atLimit)).toEqual({ version: '0.2.0', buildId: '0123456789ab' });
  });

  it('rejects text over the size limit', () => {
    const overLimit = validText.padEnd(MAX_BUILD_MANIFEST_BYTES + 1, ' ');
    expect(overLimit).toHaveLength(1025);
    expect(parseBuildManifestText(overLimit)).toBeNull();
  });

  it('rejects malformed JSON and non-object JSON', () => {
    expect(parseBuildManifestText('')).toBeNull();
    expect(parseBuildManifestText('{"version":')).toBeNull();
    expect(parseBuildManifestText('null')).toBeNull();
    expect(parseBuildManifestText('[]')).toBeNull();
    expect(parseBuildManifestText('"x"')).toBeNull();
  });

  it('rejects valid JSON with invalid fields', () => {
    expect(parseBuildManifestText(JSON.stringify({ version: 'latest', buildId: 'dev' }))).toBeNull();
    expect(parseBuildManifestText(JSON.stringify({ version: '0.2.0', buildId: 'a/b' }))).toBeNull();
  });
});

describe('decideUpdate', () => {
  it('prompts with the remote manifest for a new build', () => {
    expect(decideUpdate(inputWith({}))).toEqual({ kind: 'prompt', manifest: REMOTE });
  });

  it('stays quiet when disabled', () => {
    expect(decideUpdate(inputWith({ enabled: false }))).toEqual({ kind: 'none' });
  });

  it('stays quiet when offline or the manifest was unusable', () => {
    expect(decideUpdate(inputWith({ remote: null }))).toEqual({ kind: 'none' });
  });

  it('stays quiet when already on the remote build', () => {
    expect(decideUpdate(inputWith({ currentBuildId: REMOTE.buildId }))).toEqual({ kind: 'none' });
  });

  it('stays quiet when a reload to this build was already attempted', () => {
    expect(decideUpdate(inputWith({ attemptedBuildId: REMOTE.buildId }))).toEqual({ kind: 'none' });
  });

  it('prompts when the attempted build is older than the remote build', () => {
    expect(decideUpdate(inputWith({ attemptedBuildId: 'older' }))).toEqual({
      kind: 'prompt',
      manifest: REMOTE,
    });
  });
});

describe('manifestUrl', () => {
  it('builds a path under the root base', () => {
    expect(manifestUrl('/', '123')).toBe('/version.json?t=123');
  });

  it('builds a path under the GitHub Pages base', () => {
    expect(manifestUrl('/game-test/', '123')).toBe('/game-test/version.json?t=123');
  });

  it('adds a missing trailing slash to the base', () => {
    expect(manifestUrl('/game-test', '123')).toBe('/game-test/version.json?t=123');
  });

  it('stays path-only for a base without a leading slash', () => {
    expect(manifestUrl('game-test/', '123')).toBe('/game-test/version.json?t=123');
    expect(manifestUrl('', '123')).toBe('/version.json?t=123');
  });

  it('URL-encodes the nonce', () => {
    expect(manifestUrl('/', 'a b&c=d')).toBe('/version.json?t=a%20b%26c%3Dd');
  });
});

describe('reloadUrl', () => {
  it('replaces the reload param and drops origin and hash', () => {
    expect(reloadUrl(LIVE_HREF, 'new')).toBe('/game-test/?v=new');
  });

  it('adds the reload param when absent', () => {
    expect(reloadUrl('https://brenpike.github.io/game-test/', 'new')).toBe('/game-test/?v=new');
  });

  it('keeps the pathname and other params', () => {
    expect(reloadUrl('https://brenpike.github.io/game-test/index.html?debug=1&v=old&x=2#top', 'new')).toBe(
      '/game-test/index.html?debug=1&v=new&x=2',
    );
  });

  it('URL-encodes the build id', () => {
    expect(reloadUrl('http://localhost:5173/', 'a&b=c')).toBe('/?v=a%26b%3Dc');
  });
});

describe('attemptedBuildIdFrom', () => {
  it('reads the reload param', () => {
    expect(attemptedBuildIdFrom(LIVE_HREF)).toBe('old');
    expect(attemptedBuildIdFrom('https://brenpike.github.io/game-test/?debug=1&v=abc')).toBe('abc');
  });

  it('round-trips an encoded build id from reloadUrl', () => {
    const path = reloadUrl(LIVE_HREF, 'a&b=c');
    expect(attemptedBuildIdFrom(`https://brenpike.github.io${path}`)).toBe('a&b=c');
  });

  it('returns null when the reload param is absent', () => {
    expect(attemptedBuildIdFrom('https://brenpike.github.io/game-test/')).toBeNull();
    expect(attemptedBuildIdFrom('https://brenpike.github.io/game-test/?debug=1#v=abc')).toBeNull();
  });
});

describe('shouldCheck', () => {
  it('checks when never checked before', () => {
    expect(shouldCheck(0, null)).toBe(true);
  });

  it('waits until the default interval has fully passed', () => {
    expect(shouldCheck(1_000 + UPDATE_CHECK_MIN_INTERVAL_MS - 1, 1_000)).toBe(false);
    expect(shouldCheck(1_000 + UPDATE_CHECK_MIN_INTERVAL_MS, 1_000)).toBe(true);
    expect(shouldCheck(1_000 + UPDATE_CHECK_MIN_INTERVAL_MS + 1, 1_000)).toBe(true);
  });

  it('honours a custom interval', () => {
    expect(shouldCheck(5_499, 500, 5_000)).toBe(false);
    expect(shouldCheck(5_500, 500, 5_000)).toBe(true);
  });
});

describe('formatVersionLabel', () => {
  it('shows the version and a short build id', () => {
    expect(formatVersionLabel('0.5.0', 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678')).toBe('v0.5.0 (a1b2c3d)');
  });

  it('keeps a build id shorter than seven characters whole', () => {
    expect(formatVersionLabel('0.5.0', 'abc')).toBe('v0.5.0 (abc)');
  });

  it('shows dev builds as dev', () => {
    expect(formatVersionLabel('0.5.0', 'dev')).toBe('v0.5.0 (dev)');
  });
});
