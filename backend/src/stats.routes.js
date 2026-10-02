const express = require('express');

// "Vencida" = fecha límite anterior a hoy (fecha local del servidor) y estado distinto de hecha.
const OVERDUE = "due_date < date('now', 'localtime') AND status <> 'hecha'";

function createStatsRouter(db) {
  const byStatus = db.prepare('SELECT status, COUNT(*) AS total FROM tasks GROUP BY status');
  const overdue = db.prepare(`SELECT COUNT(*) AS total FROM tasks WHERE ${OVERDUE}`);
  // Igual que el filtro del tablero: "Ana" y "ana" son la misma persona.
  const byAssignee = db.prepare(
    `SELECT MIN(assignee) AS assignee, COUNT(*) AS total, SUM(status = 'hecha') AS done
     FROM tasks GROUP BY assignee COLLATE NOCASE
     ORDER BY total DESC, assignee IS NULL, assignee COLLATE NOCASE`,
  );

  const router = express.Router();

  router.get('/', (req, res) => {
    const counts = { pendiente: 0, en_progreso: 0, hecha: 0 };
    for (const row of byStatus.all()) {
      counts[row.status] = row.total;
    }

    res.json({
      total: counts.pendiente + counts.en_progreso + counts.hecha,
      byStatus: counts,
      overdue: overdue.get().total,
      byAssignee: byAssignee.all(),
    });
  });

  return router;
}

module.exports = { createStatsRouter };
