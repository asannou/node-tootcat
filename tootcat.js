#!/usr/bin/env node

module.exports = (host, access_token, stream = "public") => {

    const htmlToText = require("html-to-text");
    const WebSocket = require("ws");

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

    const output = new require("stream").PassThrough();

    const ws = new WebSocket(
        "ws://" + host + "/api/v1/streaming/" +
            "?access_token=" + access_token +
            "&stream=" + stream
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
    const parseArgs = require('minimist');
    const argv = parseArgs(process.argv.slice(2), {
        alias: {
            h: "host",
            p: "port",
            s: "stream"
        }
    });
    const stream = module.exports(argv.host, access_token, argv.stream);
    if (argv.port) {
        createServer(stream, argv.port);
    } else {
        stream.pipe(process.stdout);
    }
}

