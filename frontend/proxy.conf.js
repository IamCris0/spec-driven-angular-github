// Proxy de ng serve: reenvía /api a la API (specs/004-calidad-despliegue, H24).
// API_TARGET permite apuntar a otra API, por ejemplo la de las pruebas de punta a punta.
module.exports = {
  '/api': {
    target: process.env.API_TARGET || 'http://localhost:3000',
    secure: false,
    changeOrigin: true,
  },
};
