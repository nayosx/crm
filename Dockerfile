# Etapa 1: Build Angular
FROM node:20 AS builder

# Definimos el argumento que vendrá de Dokploy
ARG API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Inyectamos la URL de producción antes de compilar
# Este comando busca la línea de 'API:' y reemplaza lo que esté entre comillas
RUN if [ -n "$API_URL" ]; then \
    sed -i "s|API: '.*'|API: '${API_URL}'|g" src/environments/environment.ts; \
    fi

RUN npm run build --prod

# Etapa 2: Nginx con build
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/crm/browser/ /usr/share/nginx/html/

EXPOSE 80