import { defineConfig } from '@playwright/test'

const PORT = 3000

export default defineConfig({
  testDir: './tests/e2e',
  // One real WebRTC handshake between two WebGL pages is slow on a CPU-only runner.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Procedural_Park/`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      // Chromium hides host ICE candidates behind mDNS names. Those don't resolve in
      // containers/CI, so two browsers on one machine could never connect.
      args: ['--disable-features=WebRtcHideLocalIpsWithMdns'],
    },
  },
  // Starts the real Vite dev server (the same one `npm run dev` uses).
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/Procedural_Park/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
