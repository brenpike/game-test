import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

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
    ignores: ['src/scenes/motionTweens.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
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
      ],
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
