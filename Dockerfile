FROM node:19-alpine

ARG _WORKDIR=/home/node/app
ARG PORT=3001

USER root
RUN apk add git

WORKDIR ${_WORKDIR}

ADD . ${_WORKDIR}
RUN npm install

USER node
EXPOSE ${PORT}

CMD npm start