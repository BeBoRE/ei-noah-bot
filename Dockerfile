FROM node:current-alpine
WORKDIR /usr/src/app

RUN apk --no-cache --virtual .build-deps add \
        python3 \
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
        librsvg-dev

RUN mkdir ~/.fonts
RUN wget -qO- http://plasmasturm.org/code/vistafonts-installer/vistafonts-installer | bash

COPY package*.json ./
COPY . .
COPY tsconfig.json ./
COPY entrypoint.sh ./

RUN npm i
RUN chmod 500 entrypoint.sh

RUN sed -i 's/\r//g' entrypoint.sh

CMD [ "./entrypoint.sh" ]
