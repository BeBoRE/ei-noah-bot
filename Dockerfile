FROM node:lts-alpine
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
        librsvg-dev


RUN mkdir ~/.fonts
COPY vistafonts-installer.sh .
RUN chmod +x vistafonts-installer.sh
RUN bash ./vistafonts-installer.sh

COPY . .

RUN npm install -g pnpm@latest-8
RUN pnpm install --config.platform=linux --config.architecture=x64

RUN pnpm build
ENV NODE_ENV=production

RUN chmod 500 entrypoint.sh

RUN sed -i 's/\r//g' entrypoint.sh

CMD [ "./entrypoint.sh" ]
