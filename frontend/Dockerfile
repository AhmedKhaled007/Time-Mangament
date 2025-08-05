FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source code
COPY . .

# Expose the port
EXPOSE 5173

# Start the development server using Vite directly since netlify dev doesn't support host/port options in Docker
CMD ["npm", "run", "dev:vite", "--", "--host", "0.0.0.0", "--port", "5173"]