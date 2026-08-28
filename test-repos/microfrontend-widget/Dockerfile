FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R appuser:appgroup /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx
USER appuser
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]