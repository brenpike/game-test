/**
 * Browser glue for typing an axolotl name: one real `<input>` over the game canvas, so the
 * on-screen keyboard, IME composition, paste and screen readers all work.
 *
 * The field holds only what the caller's `fitEdit` keeps: which characters stay and how many. When
 * an edit leaves anything else in the field, the field is rewritten to the kept text with the caret
 * kept where `fitEdit` puts it. While an IME composition is in progress the field is left alone and
 * the fit applies when it ends. The field's `maxlength` is only a raw ceiling in UTF-16 units, so a
 * huge paste or composition cannot grow the field without bound; it is never the length rule.
 *
 * Names stay on the device (ADR 0007): this module makes no network request, never touches
 * storage, and puts the field in no form and gives it no `name`, so the browser offers no
 * autofill and keeps no form history. Spellcheck and autocorrect are off, so no cloud
 * spellcheck service is sent what the player types.
 */

/** A box in client CSS px, the same space as `Element.getBoundingClientRect()`. */
export interface TextEntryRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface TextEntryOptions {
  /** Starting text, before fitting: the field opens with `fitEdit(value, value, value.length).value`. */
  readonly value: string;
  /**
   * The field's raw `maxlength` ceiling, in UTF-16 units. A ceiling only, never the length rule:
   * set it well above anything `fitEdit` keeps, so it only stops a huge paste or composition.
   */
  readonly maxRawLength: number;
  /**
   * Maps an edit to the text the field keeps (which characters stay and how many) and where its
   * caret goes. `before` is the last accepted text, `after` the field's text after the edit and
   * `caret` the caret after it, as UTF-16 offsets into `after`. Runs on open for the starting text,
   * after each edit outside an IME composition, when a composition ends, and on commit.
   */
  readonly fitEdit: (
    before: string,
    after: string,
    caret: number,
  ) => { readonly value: string; readonly caret: number };
  /** Accessible name read by screen readers, e.g. "Axolotl name". */
  readonly ariaLabel: string;
  /** CSS font-family. Defaults to the rounded system stack (art guide 8); never a webfont. */
  readonly font?: string;
  /** Hint shown while the field is empty. Omitted: no placeholder. */
  readonly placeholder?: string;
  /**
   * Caret blink, where the browser supports `caret-animation`: a number is how long the caret
   * shows each blink, in ms (it hides for the same time); `null` keeps the caret steady. Omitted,
   * or in a browser without `caret-animation`: the browser's own caret. Must be finite and above 0.
   */
  readonly caretBlinkMs?: number | null;
  /**
   * The text the field keeps (`fitEdit`'s value), after each edit that changes it; held back while
   * an IME composition is in progress. Not called for the starting text.
   */
  readonly onInput: (value: string) => void;
  /**
   * The text the field keeps (`fitEdit`'s value) at the end, on Enter or when the field loses
   * focus. The entry is already closed.
   */
  readonly onCommit: (value: string) => void;
  /** Escape was pressed. The entry is already closed. */
  readonly onCancel: () => void;
}

export interface TextEntry {
  /**
   * Places the field over `rect`, kept inside the visible viewport, or centred at the top of
   * the visible viewport when `rect` is omitted. The choice is reapplied on every viewport
   * resize or scroll; pass a fresh rect after your own layout changes.
   */
  place(rect?: TextEntryRect): void;
  /** Removes the field and every listener without calling any callback. Safe to call again. */
  close(): void;
}

/** Same stack as the UI font in src/art/palette.ts; platform code must not import src/art. */
const DEFAULT_FONT_FAMILY =
  'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Quicksand", "Segoe UI", system-ui, sans-serif';
const INK = '#2b2350';
const WHITE = '#ffffff';
/** At least 16 px, so iOS Safari does not zoom the page when the field takes focus. */
const FONT_SIZE_PX = 22;
/** Same values as NAME_FIELD in src/art/drawUi.ts; platform code must not import src/art. */
const FIELD_FILL = '#f6f3fd';
const FIELD_INSET = '#c9c2e0';
const FIELD_PLACEHOLDER = '#6e6790';
const BORDER_PX = 3.5;
const RADIUS_PX = 8;
const PADDING_X_PX = 12;
/** Light inset along the top and left inner edges, like the canvas name box. */
const INSET_SHADOW = `inset 3px 3px 0 0 ${FIELD_INSET}`;
/** Double focus ring (art guide 8): 3 px white, then 3 px ink, just outside the outline. */
const FOCUS_RING_SHADOW = `0 0 0 3px ${WHITE}, 0 0 0 6px ${INK}`;
/** One injected stylesheet for what inline styles cannot set: placeholder colour and caret blink. */
const STYLE_ELEMENT_ID = 'glam-gills-text-entry-style';
const FIELD_CLASS = 'glam-gills-text-entry';
const CARET_STEADY_CLASS = `${FIELD_CLASS}-caret-steady`;
const CARET_BLINK_CLASS = `${FIELD_CLASS}-caret-blink`;
const CARET_BLINK_KEYFRAMES = `${FIELD_CLASS}-caret-blink`;
const FIELD_STYLESHEET = [
  `.${FIELD_CLASS}::placeholder { color: ${FIELD_PLACEHOLDER}; opacity: 1; }`,
  `@keyframes ${CARET_BLINK_KEYFRAMES} { 0%, 100% { caret-color: ${INK}; } 50% { caret-color: transparent; } }`,
  '@supports (caret-animation: manual) {',
  `  .${CARET_STEADY_CLASS} { caret-animation: manual; }`,
  `  .${CARET_BLINK_CLASS} { caret-animation: manual; animation: ${CARET_BLINK_KEYFRAMES} 1s step-end infinite; }`,
  '}',
].join('\n');
/** Edge margin from the visible viewport, CSS px. */
const EDGE_MARGIN_PX = 16;
/** Default field size, CSS px; the height is also the smallest allowed (touch target). */
const DEFAULT_WIDTH_PX = 420;
const MIN_HEIGHT_PX = 56;
/** IME key code browsers report for a keydown that belongs to a composition. */
const IME_PROCESS_KEY_CODE = 229;

interface ViewportBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface TextEntrySession {
  readonly input: HTMLInputElement;
  readonly options: TextEntryOptions;
  rect: TextEntryRect | undefined;
  composing: boolean;
  /** The last fitted text; starts at the fitted starting text. */
  accepted: string;
  closed: boolean;
  readonly handlers: SessionHandlers;
}

interface SessionHandlers {
  readonly keydown: (event: KeyboardEvent) => void;
  readonly keyup: (event: KeyboardEvent) => void;
  readonly input: (event: Event) => void;
  readonly compositionstart: () => void;
  readonly compositionend: () => void;
  readonly blur: () => void;
  readonly viewportChange: () => void;
}

let openSession: TextEntrySession | null = null;

/** The visible part of the page in layout-viewport CSS px: the visual viewport, else the window. */
function visibleViewport(): ViewportBox {
  const viewport = window.visualViewport;
  if (viewport === null) return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  return { left: viewport.offsetLeft, top: viewport.offsetTop, width: viewport.width, height: viewport.height };
}

/** Clamps `start` so a `size`-long span stays inside `[low, high]`; pins to `low` when it cannot fit. */
function clampSpan(start: number, size: number, low: number, high: number): number {
  return Math.max(low, Math.min(start, high - size));
}

/** The field's box: over `rect` when given, else centred at the top; always inside the margins. */
function fieldBox(rect: TextEntryRect | undefined, viewport: ViewportBox): ViewportBox {
  const roomWidth = Math.max(0, viewport.width - 2 * EDGE_MARGIN_PX);
  const low = { x: viewport.left + EDGE_MARGIN_PX, y: viewport.top + EDGE_MARGIN_PX };
  const high = {
    x: viewport.left + viewport.width - EDGE_MARGIN_PX,
    y: viewport.top + viewport.height - EDGE_MARGIN_PX,
  };
  if (rect === undefined) {
    const width = Math.min(DEFAULT_WIDTH_PX, roomWidth);
    return { left: viewport.left + (viewport.width - width) / 2, top: low.y, width, height: MIN_HEIGHT_PX };
  }
  const width = Math.min(rect.width, roomWidth);
  const height = Math.max(MIN_HEIGHT_PX, rect.height);
  return {
    left: clampSpan(rect.left, width, low.x, high.x),
    top: clampSpan(rect.top, height, low.y, high.y),
    width,
    height,
  };
}

function placeSession(session: TextEntrySession): void {
  const box = fieldBox(session.rect, visibleViewport());
  const style = session.input.style;
  style.left = `${box.left}px`;
  style.top = `${box.top}px`;
  style.width = `${box.width}px`;
  style.height = `${box.height}px`;
}

/** The starting text as `fitEdit` keeps it, with the caret at its end. */
function fittedStartingText(options: TextEntryOptions): string {
  return options.fitEdit(options.value, options.value, options.value.length).value;
}

/** Builds the unattached field: attributes for a private, uncorrected name, and the UI look. */
function createInput(options: TextEntryOptions, startingText: string): HTMLInputElement {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = startingText;
  input.maxLength = options.maxRawLength;
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'words');
  input.setAttribute('spellcheck', 'false');
  input.setAttribute('enterkeyhint', 'done');
  input.setAttribute('inputmode', 'text');
  input.setAttribute('aria-label', options.ariaLabel);
  if (options.placeholder !== undefined) input.placeholder = options.placeholder;
  styleInput(input, options.font ?? DEFAULT_FONT_FAMILY);
  styleCaret(input, options.caretBlinkMs);
  return input;
}

/** Adds the field stylesheet to the document head unless an earlier field already did. */
function ensureFieldStylesheet(): void {
  if (document.getElementById(STYLE_ELEMENT_ID) !== null) return;
  const styleElement = document.createElement('style');
  styleElement.id = STYLE_ELEMENT_ID;
  styleElement.textContent = FIELD_STYLESHEET;
  document.head.appendChild(styleElement);
}

/**
 * Picks the caret look: blinking `caretBlinkMs` on and off, steady for `null`, or the browser's
 * own caret when omitted. The stylesheet applies either class only where `caret-animation` works.
 */
function styleCaret(input: HTMLInputElement, caretBlinkMs: number | null | undefined): void {
  if (caretBlinkMs === undefined) return;
  if (caretBlinkMs === null) {
    input.classList.add(CARET_STEADY_CLASS);
    return;
  }
  if (!Number.isFinite(caretBlinkMs) || caretBlinkMs <= 0) {
    throw new RangeError(`caretBlinkMs must be finite and above 0, got ${caretBlinkMs}`);
  }
  input.classList.add(CARET_BLINK_CLASS);
  input.style.setProperty('animation-duration', `${2 * caretBlinkMs}ms`);
}

/**
 * Ink on the light name-box fill with its top-left inset, 3.5 px ink outline, radius 8, and the
 * always-on double focus ring (art guide 8), matching NAME_FIELD in src/art/drawUi.ts.
 */
function styleInput(input: HTMLInputElement, fontFamily: string): void {
  ensureFieldStylesheet();
  input.classList.add(FIELD_CLASS);
  const style = input.style;
  style.setProperty('position', 'fixed');
  style.setProperty('z-index', '10');
  style.setProperty('box-sizing', 'border-box');
  style.setProperty('margin', '0');
  style.setProperty('padding', `0 ${PADDING_X_PX}px`);
  style.setProperty('appearance', 'none');
  style.setProperty('-webkit-appearance', 'none');
  style.setProperty('font-family', fontFamily);
  style.setProperty('font-size', `${FONT_SIZE_PX}px`);
  style.setProperty('font-weight', '700');
  style.setProperty('color', INK);
  style.setProperty('caret-color', INK);
  style.setProperty('background', FIELD_FILL);
  style.setProperty('border', `${BORDER_PX}px solid ${INK}`);
  style.setProperty('border-radius', `${RADIUS_PX}px`);
  style.setProperty('outline', 'none');
  style.setProperty('box-shadow', `${INSET_SHADOW}, ${FOCUS_RING_SHADOW}`);
  style.setProperty('user-select', 'text');
  style.setProperty('-webkit-user-select', 'text');
  style.setProperty('-webkit-touch-callout', 'default');
}

/** The caller's fit of the field's current text against the last accepted text. */
function fittedEdit(session: TextEntrySession): { readonly value: string; readonly caret: number } {
  const input = session.input;
  const caret = input.selectionEnd ?? input.value.length;
  return session.options.fitEdit(session.accepted, input.value, caret);
}

/**
 * Fits the field's text, writing it back (with the caret) only when the fit changed it, then
 * reports the fitted text when it differs from the last accepted text.
 */
function fitAndReport(session: TextEntrySession): void {
  const input = session.input;
  const fitted = fittedEdit(session);
  if (fitted.value !== input.value) {
    input.value = fitted.value;
    input.setSelectionRange(fitted.caret, fitted.caret);
  }
  if (fitted.value === session.accepted) return;
  session.accepted = fitted.value;
  session.options.onInput(fitted.value);
}

function isComposingInput(event: Event): boolean {
  return event instanceof InputEvent && event.isComposing;
}

/** Leaves the field alone while an IME composition is in progress; compositionend fits it. */
function handleInput(session: TextEntrySession, event: Event): void {
  if (session.composing || isComposingInput(event)) return;
  fitAndReport(session);
}

function handleCompositionEnd(session: TextEntrySession): void {
  session.composing = false;
  fitAndReport(session);
}

/** Closes, then reports the final fitted text, so a commit mid-composition still fits. */
function commitSession(session: TextEntrySession): void {
  const value = fittedEdit(session).value;
  closeSession(session);
  session.options.onCommit(value);
}

function cancelSession(session: TextEntrySession): void {
  closeSession(session);
  session.options.onCancel();
}

function isComposingKey(session: TextEntrySession, event: KeyboardEvent): boolean {
  return session.composing || event.isComposing || event.keyCode === IME_PROCESS_KEY_CODE;
}

/**
 * Enter commits and Escape cancels, unless the key belongs to an IME composition.
 * Every key stops here, so the game's keyboard input never sees typing.
 */
function handleKeyDown(session: TextEntrySession, event: KeyboardEvent): void {
  event.stopPropagation();
  if (isComposingKey(session, event)) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    commitSession(session);
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelSession(session);
  }
}

function handleKeyUp(event: KeyboardEvent): void {
  event.stopPropagation();
}

function createHandlers(session: () => TextEntrySession): SessionHandlers {
  return {
    keydown: (event) => handleKeyDown(session(), event),
    keyup: handleKeyUp,
    input: (event) => handleInput(session(), event),
    compositionstart: () => {
      session().composing = true;
    },
    compositionend: () => handleCompositionEnd(session()),
    blur: () => commitSession(session()),
    viewportChange: () => placeSession(session()),
  };
}

function addListeners(session: TextEntrySession): void {
  const { input, handlers } = session;
  input.addEventListener('keydown', handlers.keydown);
  input.addEventListener('keyup', handlers.keyup);
  input.addEventListener('input', handlers.input);
  input.addEventListener('compositionstart', handlers.compositionstart);
  input.addEventListener('compositionend', handlers.compositionend);
  input.addEventListener('blur', handlers.blur);
  window.addEventListener('resize', handlers.viewportChange);
  window.visualViewport?.addEventListener('resize', handlers.viewportChange);
  window.visualViewport?.addEventListener('scroll', handlers.viewportChange);
}

function removeListeners(session: TextEntrySession): void {
  const { input, handlers } = session;
  input.removeEventListener('keydown', handlers.keydown);
  input.removeEventListener('keyup', handlers.keyup);
  input.removeEventListener('input', handlers.input);
  input.removeEventListener('compositionstart', handlers.compositionstart);
  input.removeEventListener('compositionend', handlers.compositionend);
  input.removeEventListener('blur', handlers.blur);
  window.removeEventListener('resize', handlers.viewportChange);
  window.visualViewport?.removeEventListener('resize', handlers.viewportChange);
  window.visualViewport?.removeEventListener('scroll', handlers.viewportChange);
}

/**
 * Removes the listeners before the element, so removing the focused field never fires a commit.
 * Does nothing when already closed.
 */
function closeSession(session: TextEntrySession): void {
  if (session.closed) return;
  session.closed = true;
  removeListeners(session);
  session.input.remove();
  if (openSession === session) openSession = null;
}

/**
 * Opens the name field and focuses it. Call this synchronously inside a pointer or key
 * gesture handler: `focus()` runs before this returns, and mobile browsers only show the
 * on-screen keyboard for a focus made during a user gesture.
 *
 * Only one field is open at a time; opening another closes this one without callbacks.
 * Enter commits and Escape cancels; both, and every other key, stop at the field, so Phaser
 * never sees them. Losing focus (tapping elsewhere, switching apps) also commits, so typed
 * text is never lost. Commit and cancel close the field before calling back.
 *
 * Names stay on the device: no network, no storage, no form or `name` attribute, and
 * spellcheck and autocorrect off so no cloud spellcheck sees the text (ADR 0007).
 */
export function openTextEntry(options: TextEntryOptions): TextEntry {
  if (openSession !== null) closeSession(openSession);
  const startingText = fittedStartingText(options);
  const input = createInput(options, startingText);
  const session: TextEntrySession = {
    input,
    options,
    rect: undefined,
    composing: false,
    accepted: startingText,
    closed: false,
    handlers: createHandlers(() => session),
  };
  openSession = session;
  addListeners(session);
  placeSession(session);
  document.body.appendChild(input);
  input.focus({ preventScroll: true });
  return {
    place: (rect?: TextEntryRect) => {
      session.rect = rect;
      if (!session.closed) placeSession(session);
    },
    close: () => closeSession(session),
  };
}
