function createTasksRepository(db) {
  const insert = db.prepare(
    `INSERT INTO tasks (title, description, priority, assignee)
     VALUES (@title, @description, COALESCE(@priority, 'media'), @assignee)`,
  );
  const selectAll = db.prepare('SELECT * FROM tasks ORDER BY id');
  const selectByAssignee = db.prepare(
    'SELECT * FROM tasks WHERE assignee = ? COLLATE NOCASE ORDER BY id',
  );
  const selectById = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const updateStatus = db.prepare(
    `UPDATE tasks SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  );

  const updateTask = db.prepare(
    `UPDATE tasks
     SET title = @title, description = @description, priority = COALESCE(@priority, 'media'),
         assignee = @assignee, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = @id`,
  );
  const deleteTask = db.prepare('DELETE FROM tasks WHERE id = ?');

  return {
    create({ title, description = null, priority = null, assignee = null }) {
      const { lastInsertRowid } = insert.run({ title, description, priority, assignee });
      return selectById.get(lastInsertRowid);
    },

    /** Con `assignee` devuelve solo las tareas de ese responsable (sin distinguir mayúsculas). */
    list({ assignee } = {}) {
      return assignee ? selectByAssignee.all(assignee) : selectAll.all();
    },

    findById(id) {
      return selectById.get(id);
    },

    /** Reemplaza los campos editables. Devuelve la tarea, o undefined si no existe. */
    update(id, { title, description = null, priority = null, assignee = null }) {
      const { changes } = updateTask.run({ id, title, description, priority, assignee });
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
