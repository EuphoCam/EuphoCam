# Dockerfile

# 1. Install dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package.json and lock file
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# 2. Build the app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from the previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js app for static export
RUN npm run build

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
