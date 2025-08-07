# Development Dockerfile for Next.js with live reload
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for better compatibility
RUN apk add --no-cache libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all files
COPY . .

# Expose the development port
EXPOSE 3000

# Start the development server with turbopack
CMD ["npm", "run", "dev"]