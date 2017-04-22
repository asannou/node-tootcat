#!/usr/bin/env node

const createStream = (host, access_token, stream = "public") => {
    const ws = new (require("ws"))(
        "ws://" + host + "/api/v1/streaming/" +
            "?access_token=" + access_token +
            "&stream=" + stream
    );
    const output = new require("stream").Transform({
        objectMode: true,
        transform: function(payload, encoding, callback) {
            this.push(JSON.parse(payload));
            callback();
        }
    });
    ws.on("open", () => console.error("s:open"));
    ws.on("error", err => console.error(err));
    ws.on("message", (data, flags) => {
        const json = JSON.parse(data);
        if (json.event === "update") {
            output.write(json.payload);
        }
    });
    return output;
};

const formatToot = toot => {
    const htmlToText = require("html-to-text");
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
            s: "stream",
            a: "authority"
        }
    });
    const transform = new require("stream").Transform({
        objectMode: true,
        transform: function(toot, encoding, callback) {
            const authority = argv.authority;
            if (authority && !toot.uri.startsWith("tag:" + authority + ",")) {
                this.push("");
            } else {
                this.push(formatToot(toot));
            }
            callback();
        }
    });
    const stream = createStream(argv.host, access_token, argv.stream).pipe(transform);
    if (argv.port) {
        createServer(stream, argv.port);
    } else {
        stream.pipe(process.stdout);
    }
}

module.exports = createStream;

