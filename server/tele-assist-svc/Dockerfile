# syntax=docker/dockerfile:1

# English comments only
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests explicitly (avoid glob/cache pitfalls)
COPY app/package.json /app/package.json
COPY app/package-lock.json /app/package-lock.json

# Install production deps with cache
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy the rest of source code
COPY app/ /app/

ENV NODE_ENV=production
ENV PORT=8300

EXPOSE 8300

# Start service (index.js is now at /app/index.js)
CMD ["node", "index.js"]
