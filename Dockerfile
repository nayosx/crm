# Etapa 1: Build
FROM node:20 AS builder

# Declaramos todos los argumentos que configuraste en Dokploy
ARG API_URL
ARG IS_ENCRYPTED
ARG VERSION

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Comando de inyección múltiple usando sed
# 1. Cambia la URL de la API
# 2. Cambia el estado de encriptación
# 3. Actualiza la versión de la app
RUN sed -i "s|API: '.*'|API: '${API_URL}'|g" src/environments/environment.ts && \
    sed -i "s|isEncripted:.*|isEncripted: ${IS_ENCRYPTED},|g" src/environments/environment.ts && \
    sed -i "s|version: \".*\"|version: \"${VERSION}\"|g" src/environments/environment.ts

RUN npm run build --prod

# Etapa 2: Nginx
FROM nginx:alpine
COPY --from=builder /app/dist/crm/browser/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80