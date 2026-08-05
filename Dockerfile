# ---- Base image ----
# Use a small, official Node.js LTS image (Alpine = smaller footprint)
FROM node:20-alpine

# ---- Set working directory inside the container ----
WORKDIR /usr/src/app

# ---- Install dependencies first (better layer caching) ----
# Copying only package*.json before the rest of the source means Docker
# can reuse this layer on rebuilds as long as dependencies haven't changed.
COPY package*.json ./
RUN npm install --omit=dev

# ---- Copy application source and externalized config ----
COPY src ./src
COPY config ./config

# ---- Run as a non-root user for security ----
USER node

# ---- Expose the port the app listens on ----
EXPOSE 3000

# ---- Set environment ----
ENV NODE_ENV=production
ENV PORT=3000

# ---- Start the app ----
CMD ["node", "src/server.js"]
