# ==========================================
# Stage 1: Build Stage
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package configuration files
COPY package*.json ./

# Install all dependencies (including devDependencies for building Vite app)
RUN npm ci

# Copy source code
COPY . .-

# Build application (Vite reads VITE_* env vars at build-time)
RUN npm run build

# ==========================================
# Stage 2: Production Runner Stage
# ==========================================
FROM nginx:alpine-slim

# Install security updates and curl for healthcheck
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache curl

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Setup non-root execution permissions for Nginx
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
