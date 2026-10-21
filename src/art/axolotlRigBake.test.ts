/**
 * Axolotl rig bake texture lifecycle (issue #46), headless: a bake removes
 * every texture it made, and the shared twinkle strip lives only while some
 * bake holds it. Phaser is mocked and the scene is a fake texture manager; the
 * painters run against a context that accepts every call and draws nothing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Phaser from 'phaser';
import { createAxolotlRigBake } from './axolotlRig';
import { DEFAULT_ART_LOOK } from './drawAxolotlParts';

vi.mock('phaser', () => ({ CANVAS: 1, WEBGL: 2 }));

/** A value that accepts every call, property read and write, and turns into 0 as a primitive. */
function inert(): unknown {
  const stored = new Map<PropertyKey, unknown>();
  const target = function noop(): void {};
  const proxy: unknown = new Proxy(target, {
    get: (_t, key) => {
      if (key === Symbol.toPrimitive) return () => 0;
      if (stored.has(key)) return stored.get(key);
      return proxy;
    },
    set: (_t, key, value: unknown) => {
      stored.set(key, value);
      return true;
    },
    apply: () => proxy,
    construct: () => proxy as object,
  });
  return proxy;
}

/** The texture manager surface a bake uses, recording what it creates and removes. */
class FakeTextures {
  readonly live = new Set<string>();
  readonly created: string[] = [];

  exists(key: string): boolean {
    return this.live.has(key);
  }

  remove(key: string): void {
    this.live.delete(key);
  }

  createCanvas(key: string): unknown {
    if (this.live.has(key)) throw new Error(`texture "${key}" already exists`);
    this.live.add(key);
    this.created.push(key);
    return { context: inert(), add: () => undefined, refresh: () => undefined };
  }

  twinkles(): string[] {
    return [...this.live].filter((key) => key.startsWith('axo-rig-twinkle-'));
  }
}

function fakeScene(textures: FakeTextures): Phaser.Scene {
  return { textures, sys: { game: { renderer: { type: 2 } } } } as unknown as Phaser.Scene;
}

describe('rig bake texture lifecycle', () => {
  beforeEach(() => {
    vi.stubGlobal('Path2D', function Path2D() {
      return inert();
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('removes the twinkle strip of every scale it left behind, and all its textures on destroy', () => {
    const textures = new FakeTextures();
    const bake = createAxolotlRigBake(fakeScene(textures), 'lifecycle', 2);
    for (const bakeScale of [2.25, 2.5, 2.75, 3.125, 3.5]) {
      expect(bake.setBakeScale(bakeScale)).toBe(true);
      expect(textures.twinkles()).toEqual([`axo-rig-twinkle-${bake.scale}`]);
    }
    bake.destroy();
    expect([...textures.live]).toEqual([]);
  });

  it('shares one twinkle strip between bakes at one scale until the last lets go', () => {
    const textures = new FakeTextures();
    const scene = fakeScene(textures);
    const first = createAxolotlRigBake(scene, 'first', 2);
    const second = createAxolotlRigBake(scene, 'second', 2);
    const strip = `axo-rig-twinkle-${first.scale}`;
    expect(textures.created.filter((key) => key === strip)).toHaveLength(1);
    first.destroy();
    expect(textures.twinkles()).toEqual([strip]);
    second.destroy();
    expect([...textures.live]).toEqual([]);
  });

  it('keeps its twinkle strip through a re-bake at the same scale without baking it again', () => {
    const textures = new FakeTextures();
    const bake = createAxolotlRigBake(fakeScene(textures), 'same-scale', 2);
    const strip = `axo-rig-twinkle-${bake.scale}`;
    expect(bake.setAppearance({ look: { ...DEFAULT_ART_LOOK, sex: 'girl' } })).toBe(true);
    expect(textures.twinkles()).toEqual([strip]);
    expect(textures.created.filter((key) => key === strip)).toHaveLength(1);
    bake.destroy();
    expect([...textures.live]).toEqual([]);
  });
});
