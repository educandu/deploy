FROM node:20.17.0-alpine3.20

ENV NODE_ENV "production"

WORKDIR /app

COPY package.json yarn.lock /app/

RUN yarn install --non-interactive --frozen-lockfile --check-files --production=true

COPY . /app/

ENTRYPOINT ["node", "./src/index.js"]
