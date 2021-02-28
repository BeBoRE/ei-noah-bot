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
        bash \
        cabextract \
    && apk --no-cache add \
        pixman \
        cairo \
        pango \
        giflib \
        libjpeg

RUN mkdir ~/.fonts
RUN wget -qO- http://plasmasturm.org/code/vistafonts-installer/vistafonts-installer | bash

RUN npm i
RUN chmod 500 entrypoint.sh

CMD [ "./entrypoint.sh" ]
