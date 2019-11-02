FROM asannou/library-node:alpine
WORKDIR /usr/src/app
COPY package.json .
RUN npm install
COPY tootcat.js .
ENTRYPOINT ["node", "tootcat.js"]
