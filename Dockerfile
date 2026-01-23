FROM node:20-slim AS pruner

WORKDIR /app

RUN npm i -g pnpm

COPY . .

RUN npx turbo prune @ei/bot --docker

FROM node:20-alpine AS builder
WORKDIR /app

RUN apk --no-cache --virtual .build-deps add \
    py3-setuptools \
    make \
    g++ \
    && apk --no-cache --virtual .canvas-build-deps add \
    build-base \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    bash \
    cabextract \
    && apk --no-cache add \
    pixman \
    cairo \
    pango \
    giflib \
    libjpeg \
    librsvg-dev \
    && apk --no-cache add \
    font-noto

COPY --from=pruner /app/out/json .

RUN npm install -g pnpm@latest-10
RUN CXXFLAGS="-include cstdint" pnpm install --config.platform=linux --config.architecture=x64

COPY --from=pruner /app/out/full .

RUN pnpm build

FROM node:20-alpine
WORKDIR /app

RUN apk --no-cache add \
    pixman \
    cairo \
    pango \
    giflib \
    libjpeg \
    librsvg-dev \
    && apk --no-cache add \
    font-noto

COPY --from=builder /app .

RUN npm install -g pnpm@latest-10
ENV NODE_ENV=production

CMD ["pnpm", "start"]
