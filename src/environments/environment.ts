export const environment = {
  production: true,
  apiBaseUrl: '/api',
  appName: 'HireFlow',
  gemini: {
    /**
     * Left empty on purpose. Anything here ships inside the JS bundle, so a
     * production build with a key hands that key to every visitor — inject it
     * from your own build pipeline, or point `baseUrl` at a backend proxy.
     *
     * With no key, `GeminiAiProvider` falls back to `MockAiProvider`, so a
     * fresh clone still demonstrates the whole screening pipeline offline.
     */
    apiKey: '',
    /**
     * Needs a model that supports `responseSchema`. The 2.5 generation now 404s
     * for keys that did not already use it ("no longer available to new users"),
     * so this pins the current flash release.
     */
    model: 'gemini-3.6-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    /** Screening runs unattended, so a hung call must not wedge the card. */
    timeoutMs: 30_000,
  },
} as const;
