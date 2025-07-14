FROM node:lts

COPY ./src /app

WORKDIR /app

RUN npm i

ENTRYPOINT [ "node", "app.js" ]