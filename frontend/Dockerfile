FROM node:18-alpine

WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy application source code
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE 5173

# Start the preview server on the correct port
CMD ["npm", "run", "preview", "--", "--port", "5000", "--host", "0.0.0.0"]