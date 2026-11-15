# Use lightweight Node.js 20 Alpine Linux image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Install curl for container healthcheck
RUN apk add --no-cache curl

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev

# Copy application source code
COPY . .

# Ensure upload directory exists
RUN mkdir -p uploads

# Default environment configuration
ENV NODE_ENV=production
ENV PORT=5050

# Expose application port
EXPOSE 5050

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5050}/api/health || exit 1

# Start Node.js Express server
CMD ["node", "server.js"]
