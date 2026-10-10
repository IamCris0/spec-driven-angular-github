const express = require('express');
const { STATUSES, blankToNull, validateTaskInput } = require('./tasks.routes');

// Respaldo de las tareas en JSON (specs/003-respaldos-validaciones, H17 y H18).
const FORMAT = 'taskflow-backup';
const VERSION = 1;
const MAX_TASKS = 1000;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

/** Fecha local AAAA-MM-DD para el nombre del archivo. */
function localDate(now = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const isIsoDate = (value) =>
  typeof value === 'string' && ISO_UTC.test(value) && !Number.isNaN(Date.parse(value));

// Devuelve el error del respaldo completo o de su primera tarea inválida, o null si todo es válido.
function validateBackup(backup) {
  if (
    backup === null ||
    typeof backup !== 'object' ||
    backup.format !== FORMAT ||
    !Array.isArray(backup.tasks)
  ) {
    return 'El archivo no es un respaldo de TaskFlow';
  }
  if (backup.version !== VERSION) {
    return 'La versión del respaldo no es compatible';
  }
  if (backup.tasks.length > MAX_TASKS) {
    return `El respaldo no puede tener más de ${MAX_TASKS} tareas`;
  }

  for (const [index, task] of backup.tasks.entries()) {
    let error;
    if (task === null || typeof task !== 'object' || Array.isArray(task)) {
      error = 'debe ser un objeto';
    } else if (task.status != null && !STATUSES.includes(task.status)) {
      error = 'El estado debe ser pendiente, en_progreso o hecha';
    } else {
      error = validateTaskInput(task);
    }
    if (error) {
      return `La tarea ${index + 1} no es válida: ${error}`;
    }
  }
  return null;
}

function createBackupRouter(db) {
  const selectTasks = db.prepare(
    `SELECT tasks.id, title, description, status, priority, assignee, due_date, tasks.created_at,
            users.name AS created_by_name
     FROM tasks LEFT JOIN users ON users.id = tasks.created_by
     ORDER BY tasks.id`,
  );
  const selectComments = db.prepare(
    `SELECT task_id, users.name AS author, body, comments.created_at
     FROM comments JOIN users ON users.id = comments.user_id
     ORDER BY comments.id`,
  );
  const exists = db.prepare('SELECT 1 FROM tasks WHERE title = ? AND created_at = ?');
  const insert = db.prepare(
    `INSERT INTO tasks (title, description, status, priority, assignee, due_date, created_by,
                        created_at, updated_at)
     VALUES (@title, @description, @status, @priority, @assignee, @dueDate, @createdBy,
             @createdAt, @createdAt)`,
  );

  // Todas las tareas o ninguna: si una inserción falla, la transacción se revierte.
  const importTasks = db.transaction((tasks, createdBy) => {
    let imported = 0;
    for (const task of tasks) {
      const title = task.title.trim();
      const createdAt = isIsoDate(task.created_at) ? task.created_at : new Date().toISOString();
      if (exists.get(title, createdAt)) {
        continue;
      }
      insert.run({
        title,
        description: blankToNull(task.description),
        status: task.status ?? 'pendiente',
        priority: task.priority ?? 'media',
        assignee: blankToNull(task.assignee),
        dueDate: task.due_date || null,
        createdBy,
        createdAt,
      });
      imported++;
    }
    return { imported, skipped: tasks.length - imported };
  });

  const router = express.Router();

  router.get('/export', (req, res) => {
    const comments = new Map();
    for (const { task_id: taskId, ...comment } of selectComments.all()) {
      comments.set(taskId, [...(comments.get(taskId) ?? []), comment]);
    }

    res.attachment(`taskflow-respaldo-${localDate()}.json`);
    res.json({
      format: FORMAT,
      version: VERSION,
      exported_at: new Date().toISOString(),
      exported_by: req.user.name,
      tasks: selectTasks.all().map(({ id, ...task }) => ({
        ...task,
        comments: comments.get(id) ?? [],
      })),
    });
  });

  router.post('/import', (req, res) => {
    const error = validateBackup(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    res.status(201).json(importTasks(req.body.tasks, req.user.id));
  });

  return router;
}

module.exports = { createBackupRouter };
