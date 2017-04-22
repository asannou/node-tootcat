#!/usr/bin/env node

module.exports = (host, access_token) => {

    const htmlToText = require("html-to-text");
    const WebSocket = require("ws");

    const stream = require("stream");

    const formatToot = toot => {
        const content = htmlToText
            .fromString(toot.content, { wordwrap: false })
            .replace(/\n/g, "\r\n");
        return [
            "\033[100m",
            "\r\n" + toot.created_at + " " + toot.account.url,
            "\033[0m",
            "\r\n" + content
        ].join("");
    };

    const output = new stream.PassThrough();

    const ws = new WebSocket(
        "ws://" + host + "/api/v1/streaming/" +
            "?access_token=" + access_token +
            "&stream=public"
    );

    ws.on("open", () => console.error("s:open"));
    ws.on("error", err => console.error(err));

    ws.on("message", (data, flags) => {
        try {
            const json = JSON.parse(data);
            if (json.event === "update") {
                const toot = JSON.parse(json.payload);
                output.write(formatToot(toot));
            }
        } catch (err) {
            console.error(err);
        }
    });

    return output;

};

const createServer = (stream, port) => {
    const net = require("net");
    const server = net.createServer(socket => {
        console.error("c:connect " + socket.remoteAddress);
        stream.resume();
        stream.pipe(socket);
        socket.on("close", () => console.error("c:close " + socket.remoteAddress));
        socket.on("error", err => console.error(err));
    });
    stream.resume();
    server.listen(port);
};

if (require.main === module) {
    const access_token = process.env.ACCESS_TOKEN;
    const host = process.argv[2];
    const port = process.argv[3];
    const stream = module.exports(host, access_token);
    if (port) {
        createServer(stream, port);
    } else {
        stream.pipe(process.stdout);
    }
}

