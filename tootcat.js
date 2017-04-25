#!/usr/bin/env node

const transform = transform => new require("stream").Transform({
    objectMode: true,
    transform: function(chunk, encoding, callback) {
        this.push(transform(chunk));
        callback();
    }
});

const filter = test => new require("stream").Transform({
    objectMode: true,
    transform: function(chunk, encoding, callback) {
        if (test(chunk)) {
            this.push(chunk);
        }
        callback();
    }
});

const createWebSocket = (host, access_token, stream, output) => {
    const ws = new (require("ws"))(
        "ws://" + host + "/api/v1/streaming/" +
            "?access_token=" + access_token +
            "&stream=" + stream
    );
    ws.on("open", () => console.error("s:open"));
    ws.on("close", (code, reason) => {
        console.error("s:close " + code)
        if (code === 1006) {
            createWebSocket(host, access_token, stream, output);
        }
    });
    ws.on("error", error => console.error(error));
    ws.on("message", (data, flags) => {
        const json = JSON.parse(data);
        if (json.event === "update") {
            output.write(json.payload);
        }
    });
};

const createStream = (host, access_token, stream = "public") => {
    const output = transform(JSON.parse);
    createWebSocket(host, access_token, stream, output);
    return output;
};

const contentToText = () => transform(toot => {
    const htmlToText = require("html-to-text");
    toot.content = htmlToText
        .fromString(toot.content, { wordwrap: false })
        .replace(/\n/g, "\r\n");
    return toot;
});

const format = () => transform(toot => {
    return [
        "\033[100m",
        "\r\n" + toot.created_at + " " + toot.account.url,
        "\033[0m",
        "\r\n" + toot.content
    ].join("");
});

const stringify = () => transform(JSON.stringify);

const PassThrough = require("stream").PassThrough;

require("util").inherits(SafetyValve, PassThrough);

function SafetyValve() {
    PassThrough.call(this);
};

SafetyValve.prototype.pause = function() {
    this.unpipe().resume();
    console.error("unpipe");
};

const createServer = (stream, port) => {
    const net = require("net");
    const server = net.createServer(socket => {
        console.error("c:connect " + socket.remoteAddress);
        const valve = new SafetyValve();
        stream.pipe(valve).pipe(socket);
        socket.on("close", () => {
            console.error("c:close " + socket.remoteAddress);
            stream.unpipe(valve).resume();
        });
        socket.on("error", err => console.error(err));
    });
    stream.resume();
    server.listen(port);
    console.error("s:listen " + port);
};

if (require.main === module) {
    const access_token = process.env.ACCESS_TOKEN;
    const argv = require('minimist')(process.argv.slice(2), {
        alias: {
            l: "listen",
            s: "stream",
            a: "authority"
        }
    });
    const host = argv._;
    var stream = createStream(host, access_token, argv.stream);
    if (argv.authority) {
        const test = toot => toot.uri.startsWith("tag:" + argv.authority + ",");
        stream = stream.pipe(filter(test));
    }
    stream = stream.pipe(contentToText()).pipe(format());
    if (argv.listen) {
        createServer(stream, argv.listen);
    } else {
        stream.pipe(process.stdout);
    }
}

module.exports = {
    transform: transform,
    filter: filter,
    createStream: createStream,
    contentToText: contentToText,
    format: format,
    stringify: stringify,
    createServer: createServer
};

