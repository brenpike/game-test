import { DEV_FLAGS_MARK, parseDevFlags, type DevFlags } from '../logic/devFlags';

/**
 * Reads the developer query flags (`?perf`, `?compare`, `?renderer=canvas`, `?area=<id>`, `?decor`) from the page URL.
 * `?area=dev-test-area` asks for the dev-and-test area; the caller ignores unknown ids.
 * `?decor` adds the dev-and-test Decorations to the Home Tank.
 * Every flag is off outside dev builds. Logs the flags to the console when any flag is on.
 */
export function readDevFlags(): DevFlags {
  const flags = parseDevFlags(window.location.search, import.meta.env.DEV);
  if (flags.perf || flags.compare || flags.renderer !== 'auto' || flags.area !== null || flags.decor) {
    console.info(DEV_FLAGS_MARK, flags);
  }
  return flags;
}
