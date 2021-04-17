FROM node:14.16-alpine3.10

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 8000

ENTRYPOINT [ "npm" ]

CMD [ "start-https" ]