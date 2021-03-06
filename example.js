#!/usr/bin/env node

const tc = require("./tootcat.js");

const host = "friends.nico";
const username = process.env.TC_USERNAME;
const password = process.env.TC_PASSWORD;

const federated = tc
    .createStream(host, username, password)
    .pipe(tc.contentToText());

const filteredStream = authority => {
    const prefix = `tag:${authority},`;
    return federated.pipe(tc.filter(toot => toot.uri.startsWith(prefix)));
};

const truncateContent = () => tc.transform(toot => {
    let content = toot.content.split("\r\n");
    const lines = 10;
    const truncated = content.length - lines;
    if (truncated > 1) {
        content = content.slice(0, lines);
        content.push("\033[90m" + `... ${truncated} more lines` + "\033[0m");
        toot.content = content.join("\r\n");
    }
    return toot;
});

const formatStream = stream =>
    stream.pipe(truncateContent()).pipe(tc.format());

const server = (stream, title, port) => {
    tc.createServer(formatStream(stream), port, socket => {
        socket.write("\033]0;" + title + "\7");
    });
};

const filteredServer = (authority, port) =>
    server(filteredStream(authority), authority, port);

tc.createServer(federated.pipe(tc.stringify()), 7006);
server(federated, "federated", 7007);
filteredServer("friends.nico", 7008);
filteredServer("mstdn.jp", 7009);
filteredServer("pawoo.net", 7010);

