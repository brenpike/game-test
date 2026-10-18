import { describe, expect, it } from 'vitest';
import {
  BUILD_MANIFEST_FILE,
  CACHE_BUST_PARAM,
  MANIFEST_REQUEST_POLICY,
  MAX_BUILD_MANIFEST_BYTES,
  RELOAD_PARAM,
  UPDATE_CHECK_MIN_INTERVAL_MS,
  UPDATE_CHECK_TIMEOUT_MS,
  attemptedBuildIdFrom,
  decideUpdate,
  formatVersionLabel,
  isAcceptedManifestResponse,
  isAppVersion,
  isBuildId,
  manifestRequestUrl,
  parseBuildManifest,
  parseBuildManifestText,
  reloadUrl,
  shouldCheck,
  type BuildManifest,
  type ManifestResponseFacts,
  type UpdateDecisionInput,
} from './updateCheck';

const CURRENT = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REMOTE: BuildManifest = { buildId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' };
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
const VALID_VERSIONS = [
  '0.0.0',
  '0.2.0',
  '10.20.30',
  '1.0.0-0',
  '1.0.0-alpha',
  '1.0.0-alpha.1',
  '1.0.0-0.3.7',
  '1.0.0-x.7.z.92',
  '1.0.0-x-y-z.--',
  '1.0.0-0A',
  '1.0.0-alpha+001',
  '1.0.0+20130313144700',
  '1.0.0-beta+exp.sha.5114f85',
  '1.0.0+21AF26D3----117B344092BD',
  '1.0.0-beta.1+build.5',
];
const INVALID_VERSIONS = [
  '',
  'latest',
  '1.2',
  'v1.2.3',
  '1.2.3.4',
  `1.2.3-${'a'.repeat(27)}`,
  '1.2.3\n',
  ' 1.2.3',
  '01.2.3',
  '1.02.3',
  '1.2.03',
  '00.0.0',
  '1.2.3-alpha..1',
  '1.2.3-01',
  '1.2.3-alpha.01',
  '1.2.3-',
  '1.2.3+',
  '1.2.3-.a',
  '1.2.3-a.',
  '1.2.3+a..b',
  '1.2.3+build.',
  '1.2.3-a_b',
  '1.2.3+a_b',
  '\u0661.2.3',
  '1.2.3-\u00e9',
];
const IGNORED_VERSION_VALUES: readonly unknown[] = [
  undefined,
  '0.5.0',
  '01.2.3',
  '1.2.3-alpha..1',
  '1.2.3-01',
  'latest',
  `1.2.3-${'a'.repeat(27)}`,
  5,
  null,
  ['0.5.0'],
  { major: 0 },
];

const PAGES_HREF = 'https://brenpike.github.io/game-test/';
const PAGES_MANIFEST_URL = 'https://brenpike.github.io/game-test/version.json?t=n';
const PAGES_RELOAD_URL = 'https://brenpike.github.io/game-test/?v=new';
const HOSTILE_PAGE_HREFS = [
  'https://brenpike.github.io//evil.example/p?x=1',
  'https://brenpike.github.io//evil.example/game-test/',
  'https://brenpike.github.io/other/path/index.html',
  'https://brenpike.github.io/game-test/../../evil?x=1',
  'https://brenpike.github.io/game-test/%2F%2Fevil.example/',
  'https://brenpike.github.io/game-test/?debug=1&v=old&t=old&x=2',
  'https://brenpike.github.io/game-test/#//evil.example/',
  'https://brenpike.github.io/game-test/index.html?v=old#top',
  'https://user:pass@brenpike.github.io/game-test/',
];
const UNBUILDABLE_INPUTS: ReadonlyArray<readonly [pageHref: string, baseUrl: string]> = [
  [PAGES_HREF, '//evil.example/'],
  [PAGES_HREF, 'https://evil.example/game-test/'],
  ['not a url', '/game-test/'],
  ['file:///home/player/game-test/index.html', '/game-test/'],
  ['data:text/html,game', '/game-test/'],
];

/** Returns a decision input for a new remote build, with overrides applied. */
function inputWith(overrides: Partial<UpdateDecisionInput>): UpdateDecisionInput {
  return { enabled: true, currentBuildId: CURRENT, remote: REMOTE, attemptedBuildId: null, ...overrides };
}

/** Returns facts for an accepted manifest response, with overrides applied. */
function responseWith(overrides: Partial<ManifestResponseFacts>): ManifestResponseFacts {
  return { ok: true, redirected: false, type: 'basic', url: PAGES_MANIFEST_URL, ...overrides };
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
  it('returns only the build id and ignores extra fields', () => {
    expect(parseBuildManifest({ version: '0.5.0', buildId: 'abc123', extra: 1 })).toStrictEqual({ buildId: 'abc123' });
  });

  it('accepts every valid build id', () => {
    for (const buildId of VALID_BUILD_IDS) {
      expect(parseBuildManifest({ version: '0.2.0', buildId })).toStrictEqual({ buildId });
    }
  });

  it.each(IGNORED_VERSION_VALUES)('ignores version %j and never returns it', (version) => {
    const data = version === undefined ? { buildId: 'dev' } : { version, buildId: 'dev' };
    expect(parseBuildManifest(data)).toStrictEqual({ buildId: 'dev' });
  });

  it('rejects a padded build id instead of trimming it', () => {
    expect(parseBuildManifest({ buildId: '\tabc123\n' })).toBeNull();
    expect(parseBuildManifest({ buildId: ' abc123' })).toBeNull();
    expect(parseBuildManifest({ buildId: 'abc123 ' })).toBeNull();
  });

  it('rejects invalid build ids', () => {
    for (const buildId of INVALID_BUILD_IDS) {
      expect(parseBuildManifest({ version: '0.2.0', buildId })).toBeNull();
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

  it('rejects a missing, non-string or empty build id', () => {
    expect(parseBuildManifest({})).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: null })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: '' })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: 123 })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: { id: 'abc' } })).toBeNull();
    expect(parseBuildManifest({ version: '0.5.0', buildId: ['abc'] })).toBeNull();
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
  it('accepts SemVer 2.0.0 with optional pre-release and build metadata', () => {
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

  it('rejects leading zeros, empty identifiers, invalid characters and other non-SemVer strings', () => {
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
    expect(parseBuildManifestText(validText)).toStrictEqual({ buildId: '0123456789ab' });
  });

  it('accepts text of exactly the size limit', () => {
    const atLimit = validText.padEnd(MAX_BUILD_MANIFEST_BYTES, ' ');
    expect(MAX_BUILD_MANIFEST_BYTES).toBe(1024);
    expect(atLimit).toHaveLength(1024);
    expect(parseBuildManifestText(atLimit)).toStrictEqual({ buildId: '0123456789ab' });
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

  it('ignores an invalid version', () => {
    expect(parseBuildManifestText(JSON.stringify({ version: 'latest', buildId: 'dev' }))).toStrictEqual({
      buildId: 'dev',
    });
  });

  it('rejects valid JSON with an invalid build id', () => {
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

describe('MANIFEST_REQUEST_POLICY', () => {
  it('pins exactly the six agreed request options', () => {
    expect(MANIFEST_REQUEST_POLICY).toEqual({
      method: 'GET',
      mode: 'same-origin',
      redirect: 'error',
      cache: 'no-store',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
  });

  it('is frozen', () => {
    expect(Object.isFrozen(MANIFEST_REQUEST_POLICY)).toBe(true);
  });
});

describe('manifestRequestUrl', () => {
  it('resolves under the GitHub Pages base', () => {
    expect(manifestRequestUrl(PAGES_HREF, '/game-test/', 'n')).toBe(PAGES_MANIFEST_URL);
  });

  it('ignores the page query and hash', () => {
    expect(manifestRequestUrl(LIVE_HREF, '/game-test/', 'n')).toBe(PAGES_MANIFEST_URL);
  });

  it('resolves under the root base', () => {
    expect(manifestRequestUrl('http://localhost:4173/', '/', 'n')).toBe('http://localhost:4173/version.json?t=n');
  });

  it('adds a missing trailing slash to the base', () => {
    expect(manifestRequestUrl(PAGES_HREF, '/game-test', 'n')).toBe(PAGES_MANIFEST_URL);
  });

  it('treats a base without a leading slash as rooted at the page origin', () => {
    expect(manifestRequestUrl(PAGES_HREF, 'game-test/', 'n')).toBe(PAGES_MANIFEST_URL);
    expect(manifestRequestUrl('https://brenpike.github.io/other/page', 'game-test/', 'n')).toBe(PAGES_MANIFEST_URL);
  });

  it('treats an empty base as the origin root', () => {
    expect(manifestRequestUrl(PAGES_HREF, '', 'n')).toBe('https://brenpike.github.io/version.json?t=n');
  });

  it('URL-encodes the nonce', () => {
    const url = manifestRequestUrl('http://localhost:4173/', '/', 'a b&c=d');
    expect(url).toBe('http://localhost:4173/version.json?t=a+b%26c%3Dd');
    expect(new URL(url ?? '').searchParams.get(CACHE_BUST_PARAM)).toBe('a b&c=d');
  });
});

describe('isAcceptedManifestResponse', () => {
  it('accepts an ok, unredirected, basic response for the requested URL', () => {
    expect(isAcceptedManifestResponse(responseWith({}), PAGES_MANIFEST_URL)).toBe(true);
  });

  it('accepts the same origin and path with a different query', () => {
    const url = 'https://brenpike.github.io/game-test/version.json?t=other';
    expect(isAcceptedManifestResponse(responseWith({ url }), PAGES_MANIFEST_URL)).toBe(true);
  });

  it('rejects a response that is not ok', () => {
    expect(isAcceptedManifestResponse(responseWith({ ok: false }), PAGES_MANIFEST_URL)).toBe(false);
  });

  it('rejects a redirected response', () => {
    expect(isAcceptedManifestResponse(responseWith({ redirected: true }), PAGES_MANIFEST_URL)).toBe(false);
  });

  it('rejects opaque and cors responses', () => {
    expect(isAcceptedManifestResponse(responseWith({ type: 'opaque' }), PAGES_MANIFEST_URL)).toBe(false);
    expect(isAcceptedManifestResponse(responseWith({ type: 'cors' }), PAGES_MANIFEST_URL)).toBe(false);
  });

  it('rejects a response from another origin', () => {
    const url = 'https://evil.example/game-test/version.json?t=n';
    expect(isAcceptedManifestResponse(responseWith({ url }), PAGES_MANIFEST_URL)).toBe(false);
  });

  it('rejects a response for another path', () => {
    const url = 'https://brenpike.github.io/other/version.json?t=n';
    expect(isAcceptedManifestResponse(responseWith({ url }), PAGES_MANIFEST_URL)).toBe(false);
  });

  it('rejects an empty or unparseable response URL', () => {
    expect(isAcceptedManifestResponse(responseWith({ url: '' }), PAGES_MANIFEST_URL)).toBe(false);
    expect(isAcceptedManifestResponse(responseWith({ url: 'not a url' }), PAGES_MANIFEST_URL)).toBe(false);
  });
});

describe('reloadUrl', () => {
  it('builds the base URL with only the reload param', () => {
    expect(reloadUrl(PAGES_HREF, '/game-test/', 'new')).toBe(PAGES_RELOAD_URL);
  });

  it('replaces an earlier reload param and drops the page hash', () => {
    expect(reloadUrl(LIVE_HREF, '/game-test/', 'new')).toBe(PAGES_RELOAD_URL);
  });

  it('keeps no path, query or hash from the current page', () => {
    expect(
      reloadUrl('https://brenpike.github.io/game-test/index.html?debug=1&v=old&x=2#top', '/game-test/', 'new'),
    ).toBe(PAGES_RELOAD_URL);
  });

  it('ignores a page path that looks like another host', () => {
    expect(reloadUrl('https://brenpike.github.io//evil.example/p?x=1', '/game-test/', 'new')).toBe(PAGES_RELOAD_URL);
  });

  it('builds under the root base', () => {
    expect(reloadUrl('http://localhost:4173/x', '/', 'new')).toBe('http://localhost:4173/?v=new');
  });

  it('URL-encodes the build id', () => {
    expect(reloadUrl('http://localhost:4173/', '/', 'a&b=c')).toBe('http://localhost:4173/?v=a%26b%3Dc');
  });
});

describe('update check URL builders', () => {
  it.each(UNBUILDABLE_INPUTS)('return null for page %s with base %s', (pageHref, baseUrl) => {
    expect(manifestRequestUrl(pageHref, baseUrl, 'n')).toBeNull();
    expect(reloadUrl(pageHref, baseUrl, 'new')).toBeNull();
  });

  it.each(HOSTILE_PAGE_HREFS)('stay on the page origin under the base for %s', (pageHref) => {
    const pageOrigin = new URL(pageHref).origin;
    const built: ReadonlyArray<readonly [string | null, string]> = [
      [manifestRequestUrl(pageHref, '/game-test/', 'n'), CACHE_BUST_PARAM],
      [reloadUrl(pageHref, '/game-test/', 'new'), RELOAD_PARAM],
    ];
    for (const [href, param] of built) {
      expect(href).not.toBeNull();
      const url = new URL(href ?? '');
      expect(url.origin).toBe(pageOrigin);
      expect(url.username).toBe('');
      expect(url.password).toBe('');
      expect(url.pathname.startsWith('/game-test/')).toBe(true);
      expect([...url.searchParams.keys()]).toEqual([param]);
      expect(url.hash).toBe('');
    }
  });

  it('build the exact URLs for every hostile page href', () => {
    for (const pageHref of HOSTILE_PAGE_HREFS) {
      expect(manifestRequestUrl(pageHref, '/game-test/', 'n')).toBe(PAGES_MANIFEST_URL);
      expect(reloadUrl(pageHref, '/game-test/', 'new')).toBe(PAGES_RELOAD_URL);
    }
  });
});

describe('attemptedBuildIdFrom', () => {
  it('reads the reload param', () => {
    expect(attemptedBuildIdFrom(LIVE_HREF)).toBe('old');
    expect(attemptedBuildIdFrom('https://brenpike.github.io/game-test/?debug=1&v=abc')).toBe('abc');
  });

  it('round-trips an encoded build id from reloadUrl', () => {
    const url = reloadUrl(LIVE_HREF, '/game-test/', 'a&b=c');
    expect(url).not.toBeNull();
    expect(attemptedBuildIdFrom(url ?? '')).toBe('a&b=c');
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
