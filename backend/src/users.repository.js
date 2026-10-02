// Columnas públicas: password_hash nunca sale de este módulo salvo en findCredentialsByEmail.
const PUBLIC_COLUMNS = 'id, name, email, created_at';

function createUsersRepository(db) {
  const insert = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
  const selectById = db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = ?`);
  const selectCredentials = db.prepare(
    `SELECT ${PUBLIC_COLUMNS}, password_hash FROM users WHERE email = ?`,
  );
  const selectEmail = db.prepare('SELECT 1 FROM users WHERE email = ?');

  return {
    create({ name, email, passwordHash }) {
      const { lastInsertRowid } = insert.run(name, email, passwordHash);
      return selectById.get(lastInsertRowid);
    },

    findById(id) {
      return selectById.get(id);
    },

    emailExists(email) {
      return Boolean(selectEmail.get(email));
    },

    findCredentialsByEmail(email) {
      return selectCredentials.get(email);
    },
  };
}

module.exports = { createUsersRepository };
