// Cada tarea se devuelve con el nombre de quien la creó y cuántos comentarios tiene.
const SELECT_TASKS = `SELECT tasks.*, users.name AS created_by_name,
    (SELECT COUNT(*) FROM comments WHERE comments.task_id = tasks.id) AS comment_count
  FROM tasks LEFT JOIN users ON users.id = tasks.created_by`;

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

/** Escapa los comodines de LIKE para que el texto buscado se compare literalmente. */
function likePattern(text) {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function createTasksRepository(db) {
  const insert = db.prepare(
    `INSERT INTO tasks (title, description, priority, assignee, due_date, created_by)
     VALUES (@title, @description, COALESCE(@priority, 'media'), @assignee, @dueDate, @createdBy)`,
  );
  const selectById = db.prepare(`${SELECT_TASKS} WHERE tasks.id = ?`);
  const updateStatus = db.prepare(`UPDATE tasks SET status = ?, updated_at = ${NOW} WHERE id = ?`);
  const updateTask = db.prepare(
    `UPDATE tasks
     SET title = @title, description = @description, priority = COALESCE(@priority, 'media'),
         assignee = @assignee, due_date = @dueDate, updated_at = ${NOW}
     WHERE id = @id`,
  );
  const deleteTask = db.prepare('DELETE FROM tasks WHERE id = ?');

  return {
    create({
      title,
      description = null,
      priority = null,
      assignee = null,
      dueDate = null,
      createdBy = null,
    }) {
      const { lastInsertRowid } = insert.run({
        title,
        description,
        priority,
        assignee,
        dueDate,
        createdBy,
      });
      return selectById.get(lastInsertRowid);
    },

    /**
     * Con `assignee` filtra por responsable (sin distinguir mayúsculas) y con `q` busca en el título y la
     * descripción. Los dos filtros se combinan.
     */
    list({ assignee, q } = {}) {
      const where = [];
      const params = {};
      if (assignee) {
        where.push('tasks.assignee = @assignee COLLATE NOCASE');
        params.assignee = assignee;
      }
      if (q) {
        where.push("(tasks.title LIKE @q ESCAPE '\\' OR tasks.description LIKE @q ESCAPE '\\')");
        params.q = likePattern(q);
      }
      const filter = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return db.prepare(`${SELECT_TASKS} ${filter} ORDER BY tasks.id`).all(params);
    },

    findById(id) {
      return selectById.get(id);
    },

    /** Reemplaza los campos editables. Devuelve la tarea, o undefined si no existe. */
    update(id, { title, description = null, priority = null, assignee = null, dueDate = null }) {
      const { changes } = updateTask.run({ id, title, description, priority, assignee, dueDate });
      return changes ? selectById.get(id) : undefined;
    },

    /** Devuelve true si la tarea existía y se eliminó. */
    remove(id) {
      return deleteTask.run(id).changes > 0;
    },

    /** Devuelve la tarea actualizada, o undefined si no existe. */
    setStatus(id, status) {
      const { changes } = updateStatus.run(status, id);
      return changes ? selectById.get(id) : undefined;
    },
  };
}

module.exports = { createTasksRepository };
