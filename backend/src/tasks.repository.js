function createTasksRepository(db) {
  // Cada tarea se devuelve con el nombre de quien la creó.
  const SELECT_TASKS = `SELECT tasks.*, users.name AS created_by_name
    FROM tasks LEFT JOIN users ON users.id = tasks.created_by`;

  const insert = db.prepare(
    `INSERT INTO tasks (title, description, priority, assignee, created_by)
     VALUES (@title, @description, COALESCE(@priority, 'media'), @assignee, @createdBy)`,
  );
  const selectAll = db.prepare(`${SELECT_TASKS} ORDER BY tasks.id`);
  const selectByAssignee = db.prepare(
    `${SELECT_TASKS} WHERE tasks.assignee = ? COLLATE NOCASE ORDER BY tasks.id`,
  );
  const selectById = db.prepare(`${SELECT_TASKS} WHERE tasks.id = ?`);
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
    create({ title, description = null, priority = null, assignee = null, createdBy = null }) {
      const { lastInsertRowid } = insert.run({ title, description, priority, assignee, createdBy });
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
