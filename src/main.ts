import * as Phaser from 'phaser';
import { LETTERBOX } from './art/palette';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from './logic/gameEvents';
import { VIEW } from './logic/tuning';
import { fitView, type ViewFit } from './logic/viewport';
import { WORLD_H } from './logic/zone';
import { BootScene } from './scenes/BootScene';
import { HudScene } from './scenes/HudScene';
import { SwimScene } from './scenes/SwimScene';
import { TitleScene } from './scenes/TitleScene';

const PARENT_ID = 'game';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const ORIENTATION_SETTLE_MS = 250;

function findParent(): HTMLElement {
  const parent = document.getElementById(PARENT_ID);
  if (!parent) {
    throw new Error(`main: missing #${PARENT_ID} element in index.html`);
  }
  return parent;
}

/** Fits the world into the parent's content box (inside the safe-area padding). */
function measureView(parent: HTMLElement): ViewFit {
  const style = window.getComputedStyle(parent);
  const cssW = parent.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const cssH = parent.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  return fitView(cssW, cssH, window.devicePixelRatio, { worldH: WORLD_H, ...VIEW });
}

/** Resizes the canvas backing store to CSS size x DPR and shows it at CSS size. */
function applyView(game: Phaser.Game, parent: HTMLElement): void {
  const fit = measureView(parent);
  const zoom = 1 / fit.dpr;
  const scale = game.scale;
  if (scale.width === fit.canvasW && scale.height === fit.canvasH && scale.zoom === zoom) {
    return;
  }
  scale.zoom = zoom;
  game.canvas.style.width = `${fit.canvasW * zoom}px`;
  game.canvas.style.height = `${fit.canvasH * zoom}px`;
  scale.resize(fit.canvasW, fit.canvasH);
}

function watchViewport(game: Phaser.Game, parent: HTMLElement): void {
  const refreshView = (): void => applyView(game, parent);
  const refreshAfterRotate = (): void => {
    refreshView();
    window.setTimeout(refreshView, ORIENTATION_SETTLE_MS);
  };
  game.canvas.style.display = 'block';
  window.addEventListener('resize', refreshView);
  window.addEventListener('orientationchange', refreshAfterRotate);
  refreshView();
}

function watchReducedMotion(game: Phaser.Game): void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  game.registry.set(REGISTRY_KEYS.reducedMotion, query.matches);
  query.addEventListener('change', (event: MediaQueryListEvent) => {
    const payload: ReducedMotionPayload = { reduced: event.matches };
    game.registry.set(REGISTRY_KEYS.reducedMotion, payload.reduced);
    game.events.emit(GAME_EVENTS.REDUCED_MOTION, payload);
  });
}

const parent = findParent();
const initialView = measureView(parent);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: PARENT_ID,
  backgroundColor: LETTERBOX,
  scale: {
    mode: Phaser.Scale.NONE,
    width: initialView.canvasW,
    height: initialView.canvasH,
    zoom: 1 / initialView.dpr,
  },
  input: { activePointers: 3 },
  scene: [BootScene, TitleScene, SwimScene, HudScene],
});

watchReducedMotion(game);
game.events.once(Phaser.Core.Events.READY, () => watchViewport(game, parent));
