FROM node:lts as build
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm i

COPY . .

RUN npm ci --prod

FROM node:lts-alpine
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package*.json ./
COPY --from=build /usr/src/app/src ./src
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY ./tsconfig.json ./

CMD ["npm", "start"]
