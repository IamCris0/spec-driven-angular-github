const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;

createApp().listen(PORT, () => {
  console.log(`API de TaskFlow escuchando en http://localhost:${PORT}/api`);
});
