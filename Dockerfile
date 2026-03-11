FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build 2>&1 || echo "BUILD FAILED"

RUN ls -la dist/ || echo "NO DIST FOLDER"
RUN ls -la dist/public/ || echo "NO DIST/PUBLIC FOLDER"

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
