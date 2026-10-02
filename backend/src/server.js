const { createApp } = require('./app');
const { createDb } = require('./db');

const PORT = process.env.PORT || 3000;

createApp(createDb()).listen(PORT, () => {
  console.log(`API de TaskFlow escuchando en http://localhost:${PORT}/api`);
});
