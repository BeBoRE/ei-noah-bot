FROM node:lts-alpine
WORKDIR /usr/src/app

COPY package*.json ./
COPY . .
COPY tsconfig.json ./
COPY entrypoint.sh ./

RUN apk --no-cache --virtual .build-deps add \
        python \
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
    && apk --no-cache add \
        pixman \
        cairo \
        pango \
        giflib \
        libjpeg

CMD [ "./entrypoint.sh" ]
