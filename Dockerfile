# Use a Node.js image as the base for building the application
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy manifests to install dependencies
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the application using TypeScript
RUN npm run build

# Use a smaller Node.js image for the final image
FROM node:18-slim AS release

# Set the working directory inside the container
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/distribution /app/distribution
COPY --from=builder /app/package.json /app/package-lock.json /app/

# Install only production dependencies
RUN npm ci --omit=dev --ignore-scripts

# Set environment variables for API key and HTTP-mode auth token
ENV LISTENHUB_API_KEY=""
ENV MCP_AUTH_TOKEN=""

# Inside a container the HTTP listener must bind all interfaces to be
# published; the token gate above is what protects it.
ENV HOST=0.0.0.0

# Expose default ports for HTTP transports
EXPOSE 3000 8080

# Specify the command to run the application
ENTRYPOINT ["node", "distribution/start-server.js"]

