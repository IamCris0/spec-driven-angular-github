function createTasksRepository(db) {
  const insert = db.prepare(
    `INSERT INTO tasks (title, description, priority, assignee)
     VALUES (@title, @description, COALESCE(@priority, 'media'), @assignee)`,
  );
  const selectAll = db.prepare('SELECT * FROM tasks ORDER BY id');
  const selectById = db.prepare('SELECT * FROM tasks WHERE id = ?');
  const updateStatus = db.prepare(
    `UPDATE tasks SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
  );

  return {
    create({ title, description = null, priority = null, assignee = null }) {
      const { lastInsertRowid } = insert.run({ title, description, priority, assignee });
      return selectById.get(lastInsertRowid);
    },

    list() {
      return selectAll.all();
    },

    findById(id) {
      return selectById.get(id);
    },

    /** Devuelve la tarea actualizada, o undefined si no existe. */
    setStatus(id, status) {
      const { changes } = updateStatus.run(status, id);
      return changes ? selectById.get(id) : undefined;
    },
  };
}

module.exports = { createTasksRepository };
