FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssh-client

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["npm", "start"]
