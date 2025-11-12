# Use a Node.js image as the base for building the application
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json to install dependencies
COPY package.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

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
COPY --from=builder /app/package.json /app/package.json

# Install only production dependencies
RUN npm install --omit=dev --ignore-scripts

# Set environment variables for API key
ENV LISTENHUB_API_KEY=""

# Expose default ports for HTTP transports
EXPOSE 3000 8080

# Specify the command to run the application
ENTRYPOINT ["node", "distribution/start-server.js"]

