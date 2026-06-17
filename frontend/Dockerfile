# Use official Node image for build stage
FROM node:22-alpine AS build

WORKDIR /app

# Build args for Vite env vars needed at build time
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}

# Install dependencies based on package-lock if present for reproducible builds
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Use a lightweight web server image for serving the built app
FROM node:22-alpine AS runner

WORKDIR /app

# Install a simple static server (serve) globally
RUN npm install -g serve@14 --silent

# Copy built files from build stage
COPY --from=build /app/dist ./dist

# Expose requested port
EXPOSE 4173

# Start the static server on port 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
