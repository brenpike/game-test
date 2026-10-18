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
);
