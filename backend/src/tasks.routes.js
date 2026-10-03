const express = require('express');

const STATUSES = ['pendiente', 'en_progreso', 'hecha'];
const PRIORITIES = ['baja', 'media', 'alta'];
const MAX_TITLE_LENGTH = 120;
const MAX_COMMENT_LENGTH = 500;

/** true si es una fecha real con formato AAAA-MM-DD (rechaza, por ejemplo, el 30 de febrero). */
function isValidDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

// Devuelve el mensaje de error de validación, o null si los datos son válidos.
function validateTaskInput({ title, description, priority, assignee, due_date: dueDate }) {
  if (typeof title !== 'string' || title.trim() === '') {
    return 'El título es obligatorio';
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return `El título no puede superar los ${MAX_TITLE_LENGTH} caracteres`;
  }
  if (description != null && typeof description !== 'string') {
    return 'La descripción debe ser texto';
  }
  if (priority != null && !PRIORITIES.includes(priority)) {
    return 'La prioridad debe ser baja, media o alta';
  }
  if (assignee != null && typeof assignee !== 'string') {
    return 'El responsable debe ser texto';
  }
  if (dueDate != null && dueDate !== '' && !isValidDate(dueDate)) {
    return 'La fecha límite no es válida';
  }
  return null;
}

// Los campos opcionales vacíos se guardan como null.
function blankToNull(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function notFound(res) {
  return res.status(404).json({ error: 'Tarea no encontrada' });
}

function createTasksRouter(repository, comments) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const { assignee } = req.query;
    const { q } = req.query;
    res.json(
      repository.list({
        assignee: typeof assignee === 'string' ? assignee.trim() : '',
        q: typeof q === 'string' ? q.trim() : '',
      }),
    );
  });

  router.get('/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = Number.isInteger(id) ? repository.findById(id) : undefined;
    return task ? res.json(task) : notFound(res);
  });

  router.post('/', (req, res) => {
    const body = req.body ?? {};
    const error = validateTaskInput(body);
    if (error) {
      return res.status(400).json({ error });
    }

    const task = repository.create({
      title: body.title.trim(),
      description: blankToNull(body.description),
      priority: body.priority ?? null,
      assignee: blankToNull(body.assignee),
      dueDate: body.due_date || null,
      createdBy: req.user.id,
    });
    res.status(201).json(task);
  });

  router.put('/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || !repository.findById(id)) {
      return notFound(res);
    }

    const body = req.body ?? {};
    const error = validateTaskInput(body);
    if (error) {
      return res.status(400).json({ error });
    }

    res.json(
      repository.update(id, {
        title: body.title.trim(),
        description: blankToNull(body.description),
        priority: body.priority ?? null,
        assignee: blankToNull(body.assignee),
        dueDate: body.due_date || null,
      }),
    );
  });

  router.delete('/:id', (req, res) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && repository.remove(id) ? res.status(204).end() : notFound(res);
  });

  router.patch('/:id/status', (req, res) => {
    const id = Number(req.params.id);
    const status = req.body?.status;

    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'El estado debe ser pendiente, en_progreso o hecha' });
    }

    const task = Number.isInteger(id) ? repository.setStatus(id, status) : undefined;
    return task ? res.json(task) : notFound(res);
  });

  router.get('/:id/comments', (req, res) => {
    const task = repository.findById(Number(req.params.id));
    return task ? res.json(comments.listByTask(task.id)) : notFound(res);
  });

  router.post('/:id/comments', (req, res) => {
    const task = repository.findById(Number(req.params.id));
    if (!task) {
      return notFound(res);
    }

    const body = typeof req.body?.body === 'string' ? req.body.body.trim() : '';
    if (!body) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }
    if (body.length > MAX_COMMENT_LENGTH) {
      return res
        .status(400)
        .json({ error: `El comentario no puede superar los ${MAX_COMMENT_LENGTH} caracteres` });
    }

    res.status(201).json(comments.create({ taskId: task.id, userId: req.user.id, body }));
  });

  return router;
}

module.exports = { createTasksRouter };
