import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const FLIP_MESSAGE =
  'Face sprites with faceSprite() from src/scenes/spriteFacing.ts; Phaser flip mirrors about the frame centre, not the origin.';

const FLIP_SELECTORS = [
  {
    selector:
      'CallExpression[callee.property.name=/^(setFlip|setFlipX|setFlipY|toggleFlipX|toggleFlipY)$/]',
    message: FLIP_MESSAGE,
  },
  {
    selector: 'MemberExpression[property.name=/^(flipX|flipY)$/]',
    message: FLIP_MESSAGE,
  },
  {
    selector: 'Property[key.name=/^(flipX|flipY)$/]',
    message: FLIP_MESSAGE,
  },
];

const TWEEN_SELECTORS = [
  {
    selector:
      "CallExpression[callee.object.property.name='tweens'][callee.property.name=/^(add|addCounter|addMultiple|chain)$/]",
    message:
      'Create scene tweens with addMotionTween() from src/scenes/motionTweens.ts so reduced motion can settle them.',
  },
  {
    selector:
      "CallExpression[callee.object.name='tweens'][callee.property.name=/^(add|addCounter|addMultiple|chain)$/]",
    message:
      'Create scene tweens with addMotionTween() from src/scenes/motionTweens.ts so reduced motion can settle them.',
  },
];

export default defineConfig(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', 'prototypes/', '.claude/'],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/logic/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'phaser',
              message: 'src/logic must stay framework-free; do not import phaser.',
            },
          ],
          patterns: [
            {
              group: ['phaser/**'],
              message: 'src/logic must stay framework-free; do not import phaser.',
            },
            {
              group: ['**/art', '**/art/**', '**/scenes', '**/scenes/**'],
              message: 'src/logic must not import from src/art or src/scenes.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/scenes/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...FLIP_SELECTORS],
    },
  },
  {
    files: ['src/scenes/**/*.ts'],
    ignores: ['src/scenes/motionTweens.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...TWEEN_SELECTORS, ...FLIP_SELECTORS],
    },
  },
  {
    files: ['src/scenes/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/logic/collectibles'],
              importNames: ['snacksLeft', 'sparklingSnackIds', 'countCollected', 'allCollected'],
              message:
                'Scenes read snack counts from the SnackTally set in setItems when the items change; do not work them out per frame.',
            },
          ],
        },
      ],
    },
  },
);
