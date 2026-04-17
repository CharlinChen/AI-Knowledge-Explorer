FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/

RUN npm install

COPY client/ client/
COPY server/ server/

RUN cd client && npm run build
RUN cd server && npm run build

RUN mkdir -p /app/data

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server/dist/index.js"]
