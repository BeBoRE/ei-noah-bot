FROM node:20-alpine
WORKDIR /usr/src/app

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

COPY . .

RUN npm install -g pnpm@latest-10
RUN pnpm install --config.platform=linux --config.architecture=x64

ENV NODE_ENV=production
RUN pnpm build

RUN chmod 500 entrypoint.sh

RUN sed -i 's/\r//g' entrypoint.sh

CMD [ "./entrypoint.sh" ]
