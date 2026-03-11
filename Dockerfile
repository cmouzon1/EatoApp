FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN echo "=== RUNNING VITE BUILD ===" && npx vite build 2>&1 && echo "=== VITE SUCCESS ===" || echo "=== VITE FAILED ==="

RUN echo "=== RUNNING ESBUILD ===" && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 2>&1 && echo "=== ESBUILD SUCCESS ===" || echo "=== ESBUILD FAILED ==="

RUN ls -la dist/ && ls -la dist/public/ || echo "NO PUBLIC FOLDER"

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
