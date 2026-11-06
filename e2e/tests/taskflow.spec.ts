import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Recorrido completo de TaskFlow en un navegador real (specs/004-calidad-despliegue, H21 y CE-013).
// Cada prueba crea su propio usuario para no depender del orden. El tablero es compartido por todo el equipo
// (specs/002-taskflow-v2), así que las pruebas buscan sus propias tareas por título.

const PASSWORD = 'clave2026';
const unique = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const field = (page: Page, name: string) => page.locator(`[formcontrolname="${name}"]`);
const column = (page: Page, status: string) => page.locator(`[data-status="${status}"]`);
const card = (page: Page, status: string, title: string) =>
  column(page, status).locator('app-task-card').filter({ hasText: title });

async function register(page: Page, name = 'Ana Torres'): Promise<string> {
  const email = `ana-${unique()}@taskflow.ec`;
  await page.goto('/registro');
  await field(page, 'name').fill(name);
  await field(page, 'email').fill(email);
  await field(page, 'password').fill(PASSWORD);
  await field(page, 'confirm').fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Por hacer' })).toBeVisible();
  return email;
}

async function createTask(page: Page, title: string, dueDate?: string): Promise<void> {
  await field(page, 'title').first().fill(title);
  if (dueDate) {
    await field(page, 'due_date').first().fill(dueDate);
  }
  await page.getByRole('button', { name: 'Crear tarea' }).click();
  await expect(card(page, 'pendiente', title)).toBeVisible();
}

test('sin sesión, el tablero lleva al inicio de sesión (H7)', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('el registro exige letras y números y luego entra al tablero (H6, H19)', async ({ page }) => {
  await page.goto('/registro');
  await field(page, 'name').fill('Ana Torres');
  await field(page, 'email').fill(`ana-${unique()}@taskflow.ec`);
  await field(page, 'password').fill('solo-letras');
  await field(page, 'confirm').fill('solo-letras');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByText('La contraseña debe incluir letras y números')).toBeVisible();
  await expect(page).toHaveURL(/\/registro$/);

  await field(page, 'password').fill(PASSWORD);
  await field(page, 'confirm').fill(PASSWORD);
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Por hacer' })).toBeVisible();
  await expect(page.getByText('Ana Torres')).toBeVisible();
});

test('una tarea con fecha pasada aparece como vencida y se mueve de columna (H9, H10)', async ({
  page,
}) => {
  await register(page);
  await createTask(page, 'Configurar pipeline', '2020-01-15');

  await expect(
    card(page, 'pendiente', 'Configurar pipeline').locator('[data-overdue]'),
  ).toBeVisible();

  await card(page, 'pendiente', 'Configurar pipeline')
    .getByRole('button', { name: 'Mover a En progreso' })
    .click();

  await expect(card(page, 'en_progreso', 'Configurar pipeline')).toBeVisible();
  await page.reload();
  await expect(card(page, 'en_progreso', 'Configurar pipeline')).toBeVisible();
});

test('el formulario rechaza una fecha límite fuera de rango (H19)', async ({ page }) => {
  await register(page);
  await field(page, 'title').first().fill('Fecha imposible');
  await field(page, 'due_date').first().fill('1999-12-31');
  await page.getByRole('button', { name: 'Crear tarea' }).click();

  await expect(
    page.getByText('La fecha límite debe estar entre los años 2000 y 2099'),
  ).toBeVisible();
  await expect(column(page, 'pendiente').locator('app-task-card')).toHaveCount(0);
});

test('un respaldo descargado recupera una tarea borrada (H17, H18)', async ({ page }) => {
  await register(page);
  await createTask(page, 'Redactar informe APA 7');

  // Descargar el respaldo.
  await page.getByRole('link', { name: 'Respaldos' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar respaldo' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^taskflow-respaldo-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();
  const titles = JSON.parse(readFileSync(file, 'utf8')).tasks.map(
    (task: { title: string }) => task.title,
  );
  expect(titles).toContain('Redactar informe APA 7');

  // Borrar la tarea.
  await page.getByRole('link', { name: 'Tablero' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await card(page, 'pendiente', 'Redactar informe APA 7')
    .getByRole('button', { name: 'Eliminar' })
    .click();
  await expect(card(page, 'pendiente', 'Redactar informe APA 7')).toHaveCount(0);

  // Importarla de nuevo.
  await page.getByRole('link', { name: 'Respaldos' }).click();
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.locator('[data-preview]')).toContainText(`${titles.length} tarea`);
  await page.getByRole('button', { name: /^Importar \d+ tareas?$/ }).click();
  // Solo vuelve la tarea borrada; las demás ya existían y se omiten.
  await expect(page.getByRole('status')).toContainText('Se importó 1 tarea');

  await page.getByRole('link', { name: 'Tablero' }).click();
  await expect(card(page, 'pendiente', 'Redactar informe APA 7')).toBeVisible();
});

test('cerrar sesión vuelve al inicio de sesión (H7)', async ({ page }) => {
  await register(page);

  await page.getByRole('button', { name: 'Cerrar sesión' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});
