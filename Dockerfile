# Dockerfile

# 1. Install dependencies
FROM oven/bun:1.3-alpine AS deps

WORKDIR /app

# Copy package.json and lock file
COPY package.json bun.lock yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN \
  if [ -f bun.lock ]; then bun install --frozen-lockfile; \ 
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 2. Build the app
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js app for static export
RUN bun run build

# 3. Production image with Caddy
FROM caddy:2-alpine

WORKDIR /app

# Copy the static files from the builder stage
COPY --from=builder /app/out ./out

# Copy the Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Expose the port Caddy listens on
EXPOSE 8080

# Start Caddy
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]
