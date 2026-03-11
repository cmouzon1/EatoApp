FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx vite build --debug 2>&1 | tail -50

RUN ls -la dist/public/

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
