# Frontend de TaskFlow (specs/004-calidad-despliegue, H20).
# Etapa 1: compila Angular. Etapa 2: nginx sirve el build y reenvía /api a la API.
FROM node:22-slim AS build

WORKDIR /app
ENV NG_CLI_ANALYTICS=false
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 80
