# ===================================================================
# SmartAttend Frontend — Production Multi-Stage Dockerfile
# Stage 1: Build React 19 / Vite production bundle
# Stage 2: Serve static bundle via hardened Nginx Alpine image
# ===================================================================

# -------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# -------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and compile production bundle
COPY . .
RUN npm run build

# -------------------------------------------------------------------
# Stage 2: Hardened Nginx Web Server
# -------------------------------------------------------------------
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Clean default Nginx welcome assets
RUN rm -rf ./*

# Copy built distribution files and custom Nginx configuration
COPY --from=builder /app/dist .
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
