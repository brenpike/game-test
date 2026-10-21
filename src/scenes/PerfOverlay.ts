/**
 * Dev-only frame-time overlay (`?perf`, issue #46). Times every frame and the axolotl rig's share of
 * it into a frame window, shows live p50 and p95 twice a second, and logs one summary line to the
 * console per window. Stores and sends nothing. main.ts loads this module only in dev builds.
 */
import * as Phaser from 'phaser';
import { rigRendererOf, takeRigBakeCount, takeRigFrameMs } from '../art/axolotlRig';
import { INK, UI_ON_LETTERBOX } from '../art/palette';
import {
  createFrameWindow,
  formatFrameSummary,
  recordFrame,
  resetFrameWindow,
  summarizeFrames,
} from '../logic/frameStats';
import { readSceneView, uiTextStyle, useCssCamera } from './BootScene';

/** Scene key of the overlay. Also marks dev-only code in a build. */
export const PERF_SCENE_KEY = 'glam-gills-dev-perf';

const READOUT_MS = 500;
const READOUT_PX = 14;
const READOUT_MARGIN = 8;
const READOUT_PADDING = { x: 6, y: 4 };

/** Keys of the running scenes other than the overlay, joined with '+', in render order. */
function activeSceneLabel(game: Phaser.Game): string {
  const keys = game.scene
    .getScenes(true)
    .map((scene) => scene.sys.settings.key)
    .filter((key) => key !== PERF_SCENE_KEY);
  return keys.length > 0 ? keys.join('+') : '(none)';
}

/** One decimal place, or '-' for a percentile of no samples. */
function formatMs(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '-';
}

class PerfOverlayScene extends Phaser.Scene {
  private readout!: Phaser.GameObjects.Text;
  private readonly frames = createFrameWindow();
  private rendererName = '';
  private sceneLabel = '';
  private lastFrameAt: number | null = null;
  private readoutDueAt = 0;

  constructor() {
    super({ key: PERF_SCENE_KEY });
  }

  create(): void {
    this.input.enabled = false;
    this.rendererName = rigRendererOf(this);
    const { fit } = readSceneView(this.scale);
    this.readout = this.add.text(READOUT_MARGIN, READOUT_MARGIN, '', {
      ...uiTextStyle(READOUT_PX, fit.dpr, false),
      color: UI_ON_LETTERBOX,
      backgroundColor: INK,
      padding: READOUT_PADDING,
    });
    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.handlePostRender, this);
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
  }

  private layout(): void {
    const { fit } = readSceneView(this.scale);
    useCssCamera(this.cameras.main, fit.dpr);
    this.readout.setResolution(fit.dpr);
  }

  /** Records the frame that just rendered; a change of running scenes starts a new window with it. */
  private handlePostRender(): void {
    const now = performance.now();
    const axolotlMs = takeRigFrameMs();
    const bakes = takeRigBakeCount();
    const label = activeSceneLabel(this.game);
    if (label !== this.sceneLabel) {
      this.sceneLabel = label;
      resetFrameWindow(this.frames);
    }
    const previous = this.lastFrameAt;
    this.lastFrameAt = now;
    if (previous === null) return;
    const summary = recordFrame(this.frames, now - previous, axolotlMs, bakes);
    if (summary) console.info(formatFrameSummary(summary, `${this.sceneLabel} | ${this.rendererName}`));
    if (now >= this.readoutDueAt) {
      this.readoutDueAt = now + READOUT_MS;
      this.showReadout();
    }
  }

  /** A hidden page stops the game loop, so the gap would read as one huge frame: start a new window. */
  private handleHidden(): void {
    resetFrameWindow(this.frames);
    this.lastFrameAt = null;
  }

  private showReadout(): void {
    const live = summarizeFrames(this.frames.frameMs, this.frames.axolotlMs, this.frames.bakes);
    this.readout.setText([
      `${this.rendererName} | ${this.sceneLabel}`,
      `p50 ${formatMs(live.p50)} ms | p95 ${formatMs(live.p95)} ms`,
      `axolotl p95 ${formatMs(live.axolotlP95)} ms | bakes ${live.bakes}`,
    ]);
  }

  private handleShutdown(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.game.events.off(Phaser.Core.Events.POST_RENDER, this.handlePostRender, this);
    this.game.events.off(Phaser.Core.Events.HIDDEN, this.handleHidden, this);
  }
}

/** Adds the overlay on top of every scene once the game is ready (now, when it already is). */
export function installPerfOverlay(game: Phaser.Game): void {
  const addOverlay = (): void => {
    game.scene.add(PERF_SCENE_KEY, PerfOverlayScene, true);
  };
  if (game.isRunning) addOverlay();
  else game.events.once(Phaser.Core.Events.READY, addOverlay);
}
