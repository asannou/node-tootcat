#!/usr/bin/env node

const tc = require("./tootcat.js");

const host = "friends.nico";
const access_token = process.env.ACCESS_TOKEN;

const stream = tc.createStream(host, access_token);

const filteredStream = authority => {
    const prefix = "tag:" + authority + ",";
    return stream.pipe(tc.filter(toot => toot.uri.startsWith(prefix)));
};

const friends_nico = filteredStream("friends.nico");
const mstdn_jp = filteredStream("mstdn.jp");
const pawoo_net = filteredStream("pawoo.net");

const createServer = (stream, port) => {
    const formated = stream.pipe(tc.contentToText()).pipe(tc.format());
    tc.createServer(formated, port);
};

createServer(stream, 7007);
createServer(friends_nico, 7008);
createServer(mstdn_jp, 7009);
createServer(pawoo_net, 7010);

