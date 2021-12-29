FROM node:16.13.1-alpine3.12

ENV NODE_ENV "production"

WORKDIR /app

COPY package.json yarn.lock /app/

RUN yarn install --non-interactive --frozen-lockfile --check-files --production=true

COPY . /app/

ENTRYPOINT ["node", "./index.js"]
