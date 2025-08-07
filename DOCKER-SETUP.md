# Docker Setup for Mada Dashboard

This project is configured with Docker for easy development with live code reloading.

## Prerequisites

- Docker Desktop installed on your machine
- Docker Compose (usually comes with Docker Desktop)

## Getting Started

1. **Build and start the container:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

3. **Live reloading:**
   - Any changes to files in `/src`, `/public`, or configuration files will automatically trigger a rebuild
   - The browser will refresh automatically when changes are detected

## Common Commands

- **Start the container (after initial build):**
  ```bash
  docker-compose up
  ```

- **Stop the container:**
  ```bash
  docker-compose down
  ```

- **Rebuild the container (if you change package.json):**
  ```bash
  docker-compose up --build
  ```

- **View logs:**
  ```bash
  docker-compose logs -f
  ```

- **Access container shell:**
  ```bash
  docker-compose exec app sh
  ```

## Troubleshooting

1. **Port already in use:**
   If port 3000 is already in use, either stop the other service or change the port mapping in `docker-compose.yml`:
   ```yaml
   ports:
     - "3001:3000"  # Change 3001 to your preferred port
   ```

2. **Changes not reflecting:**
   - Ensure the file you're editing is in a mounted volume (check docker-compose.yml)
   - Try restarting the container: `docker-compose restart`

3. **Slow performance on Windows/Mac:**
   - This is due to file system mounting overhead
   - Consider using WSL2 on Windows for better performance