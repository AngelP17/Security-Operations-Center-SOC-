# SOC Dashboard - Docker Image
FROM python:3.11-slim

# Install system dependencies for network scanning
RUN apt-get update && apt-get install -y \
    net-tools \
    iputils-ping \
    iproute2 \
    arp-scan \
    samba-common-bin \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY soc_app.py .
COPY firebase-config.json* ./

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Expose ports
EXPOSE 5001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5001/api/security/stats || exit 1

# Run Flask backend
CMD ["python", "-u", "soc_app.py"]
