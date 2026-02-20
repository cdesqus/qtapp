# Dockerfile for IDE ERP System
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files
COPY . .

# Exposure
EXPOSE 3020

# Start command
CMD ["node", "server/server.js"]
