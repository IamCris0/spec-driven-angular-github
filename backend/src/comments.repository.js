const SELECT_COMMENTS = `SELECT comments.*, users.name AS user_name
  FROM comments JOIN users ON users.id = comments.user_id`;

function createCommentsRepository(db) {
  const insert = db.prepare('INSERT INTO comments (task_id, user_id, body) VALUES (?, ?, ?)');
  const selectById = db.prepare(`${SELECT_COMMENTS} WHERE comments.id = ?`);
  const selectByTask = db.prepare(
    `${SELECT_COMMENTS} WHERE comments.task_id = ? ORDER BY comments.id`,
  );

  return {
    create({ taskId, userId, body }) {
      return selectById.get(insert.run(taskId, userId, body).lastInsertRowid);
    },

    listByTask(taskId) {
      return selectByTask.all(taskId);
    },
  };
}

module.exports = { createCommentsRepository };
