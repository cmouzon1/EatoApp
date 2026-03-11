FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npx vite build
RUN npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
