export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000/api',
  appName: 'HireFlow (dev)',
  gemini: {
    /**
     * Paste a Google AI Studio key here to screen CVs with a real model. Empty
     * falls back to `MockAiProvider`, so the pipeline still demos offline.
     *
     * This file is tracked, and GitHub push protection rejects a key in it.
     * Before pasting one, tell git to stop watching the file:
     *
     *     git update-index --skip-worktree src/environments/environment.development.ts
     *
     * Undo with `--no-skip-worktree` when you need to commit a real change here.
     */
    apiKey: '',
    model: 'gemini-3.6-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs: 30_000,
  },
} as const;
