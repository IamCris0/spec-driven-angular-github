/**
 * Ruta base de la API REST (contrato en specs/). Es relativa: en desarrollo la reenvía el proxy de ng serve
 * (proxy.conf.js) y en Docker, nginx (specs/004-calidad-despliegue, H24).
 */
export const API_URL = '/api';
