FROM node:lts as build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i

COPY . .

RUN npx tsc
RUN npm ci --prod

FROM node:lts-alpine
WORKDIR /usr/src/app

RUN npm ci --prod

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY ./ormconfig.json ./
COPY ./.env ./

CMD ["npm", "start"]
