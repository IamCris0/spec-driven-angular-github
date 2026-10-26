import { defineConfig, devices } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Pruebas de punta a punta (specs/004-calidad-despliegue, H21). Levantan su propia API y su propio
// ng serve en puertos distintos de los de desarrollo, con una base de datos nueva en cada ejecución.
const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 4300);
const dataDir = mkdtempSync(join(tmpdir(), 'tf-e2e-'));
// En local se puede usar el Edge o el Chrome instalados (PW_CHANNEL=msedge) sin descargar navegadores.
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: './tests',
  // Las pruebas comparten una sola API: en serie son más fáciles de seguir en el reporte.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: [
    {
      command: 'node src/server.js',
      cwd: '../backend',
      url: `http://localhost:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        PORT: String(API_PORT),
        DB_PATH: join(dataDir, 'taskflow.db'),
        BACKUP_DIR: join(dataDir, 'backups'),
        BACKUP_INTERVAL_HOURS: '0',
        JWT_SECRET: 'clave-de-las-pruebas-e2e',
        FRONTEND_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      command: `npx ng serve --port ${WEB_PORT}`,
      cwd: '../frontend',
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { API_TARGET: `http://localhost:${API_PORT}`, NG_CLI_ANALYTICS: 'false' },
    },
  ],
});
