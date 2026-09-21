# ==========================================
# Full-Stack Production Container for SafeVault
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy full application source code
COPY . .

# Build the React production bundle to /app/dist
RUN npm run build

# Expose port 80 for web traffic
ENV PORT=80
ENV NODE_ENV=production
EXPOSE 80

# Start unified Node.js API + Static React Server
CMD ["node", "server/index.js"]
