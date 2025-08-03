FROM python:3.12-slim-bookworm

WORKDIR /app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy application code
COPY . .

# Make entrypoint script executable
RUN chmod +x entrypoint.sh

# Create data directory for JSON storage
RUN mkdir -p data

# Set Python path to include app directory
ENV PYTHONPATH=/app

# Expose the port the app runs on
EXPOSE 8000

# Use entrypoint script to start the application
ENTRYPOINT ["./entrypoint.sh"]
