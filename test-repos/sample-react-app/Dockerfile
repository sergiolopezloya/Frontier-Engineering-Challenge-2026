# ==========================================
# Stage 1: Build Environment (Node Builder)
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Install build essentials for alpine if native extensions are needed
RUN apk add --no-cache libc6-compat

# Leverage caching for dependency installation
COPY package*.json .npmrc* ./ 
RUN npm ci --only=production

# Copy source code
COPY . .

# Pass build-time environment variables (Required for Vite static injection)
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Build production-ready assets
RUN npm run build

# ==========================================
# Stage 2: Web Server Runner (Nginx Alpine)
# ==========================================
FROM nginx:1.25-alpine

# Copy Nginx Configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static compiled assets from Builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Setup non-root execution policy for compliance and vulnerability mitigation
RUN apk add --no-cache libcap && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /var/log/nginx /usr/share/nginx/html /etc/nginx && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx

# Drop root privileges
USER nginx

# Expose port (standard HTTP port bound securely as unprivileged user)
EXPOSE 80

# Default container execution instruction
CMD ["nginx", "-g", "daemon off;"]