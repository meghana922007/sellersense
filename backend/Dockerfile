# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install package dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Generate Prisma Client structure
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm install -g typescript && tsc

EXPOSE 5001

CMD ["npm", "start"]
