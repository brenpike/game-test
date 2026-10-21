import * as Phaser from 'phaser';
import { LETTERBOX } from './art/palette';
import { GAME_EVENTS, REGISTRY_KEYS, type ReducedMotionPayload } from './logic/gameEvents';
import { VIEW } from './logic/tuning';
import { fitView, type ViewFit } from './logic/viewport';
import { WORLD_H } from './logic/zone';
import { BootScene } from './scenes/BootScene';
import { CreatorScene } from './scenes/CreatorScene';
import { HomeTankScene } from './scenes/HomeTankScene';
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

/** Creates the game in `parent` with `scenes`, on renderer `type` (Phaser.AUTO or Phaser.CANVAS). */
function startGame(parent: HTMLElement, type: number, scenes: Phaser.Types.Scenes.SceneType[]): Phaser.Game {
  const initialView = measureView(parent);
  const game = new Phaser.Game({
    type,
    parent: PARENT_ID,
    backgroundColor: LETTERBOX,
    scale: {
      mode: Phaser.Scale.NONE,
      width: initialView.canvasW,
      height: initialView.canvasH,
      zoom: 1 / initialView.dpr,
    },
    input: { activePointers: 3 },
    scene: scenes,
  });
  watchReducedMotion(game);
  game.events.once(Phaser.Core.Events.READY, () => watchViewport(game, parent));
  return game;
}

const GAME_SCENES: Phaser.Types.Scenes.SceneType[] = [
  BootScene,
  TitleScene,
  HomeTankScene,
  SwimScene,
  HudScene,
  CreatorScene,
];

/**
 * Dev builds only: starts the game with the dev tools the query flags ask for. `?compare` runs only
 * the rig compare scene, `?perf` adds the frame-time overlay, `?renderer=canvas` forces Canvas.
 */
async function startDevGame(parent: HTMLElement): Promise<void> {
  if (import.meta.env.DEV) {
    const { readDevFlags } = await import('./platform/devFlags');
    const flags = readDevFlags();
    const type = flags.renderer === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;
    const scenes = flags.compare ? [(await import('./scenes/RigCompareScene')).RigCompareScene] : GAME_SCENES;
    const game = startGame(parent, type, scenes);
    if (flags.perf) (await import('./scenes/PerfOverlay')).installPerfOverlay(game);
  }
}

const parent = findParent();

if (import.meta.env.DEV) {
  void startDevGame(parent);
} else {
  startGame(parent, Phaser.AUTO, GAME_SCENES);
}
