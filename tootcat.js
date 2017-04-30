#!/usr/bin/env node
"use strict";

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

const postJson = (hostname, path, json, callback) => {
    const request = require("https").request({
        hostname: hostname,
        path: path,
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }, (res) => {
        res.on("data", chunk => callback(JSON.parse(chunk)));
    });
    request.write(JSON.stringify(json));
    request.end();
};

const createApp = (host, callback) => {
    const json = {
        client_name: "tootcat",
        redirect_uris: "urn:ietf:wg:oauth:2.0:oob",
        scopes: "read"
    };
    postJson(host, "/api/v1/apps", json, callback);
};

const getApp = (host, callback) => {
    const fs = require("fs");
    const file = "app.json";
    try {
        const app = JSON.parse(fs.readFileSync(file));
        callback(app);
    } catch (e) {
        createApp(host, (app) => {
            fs.writeFileSync(file, JSON.stringify(app), { mode: 0o400 });
            callback(app);
        });
    }
};

const getToken = (host, username, password, callback) => {
    getApp(host, app => {
        const req = {
            client_id: app.client_id,
            client_secret: app.client_secret,
            grant_type: "password",
            username: username,
            password: password
        };
        postJson(host, "/oauth/token", req, res => callback(res.access_token));
    });
};

const createWebSocket = (host, token, stream, output, callback) => {
    const url = new (require("url").URL)("ws://host/api/v1/streaming/");
    url.host = host;
    url.search = require("querystring").stringify({
        access_token: token,
        stream: stream
    });
    const ws = new (require("ws"))(url.toString());
    ws.on("open", () => console.error("s:open"));
    ws.on("close", (code, reason) => {
        console.error(`s:close ${code}`)
        if (code === 1006) {
            callback();
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

const promisify = func => (...args) =>
    new Promise(resolve => func(...args, resolve));

const createStream = (host, username, password, stream = "public") => {
    const output = transform(JSON.parse);
    const keepWebSocket = async () => {
        const token = await promisify(getToken)(host, username, password);
        await promisify(createWebSocket)(host, token, stream, output);
        keepWebSocket();
    };
    keepWebSocket();
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
        "\x1b[100m\r\n",
        `${toot.created_at} ${toot.account.url}`,
        "\x1b[0m\r\n",
        toot.content
    ].join("");
});

const stringify = () => transform(JSON.stringify);

class SafetyValve extends require("stream").PassThrough {
    constructor() {
        super();
    }
    pause() {
        this.unpipe().resume();
        console.error("unpipe");
    }
}

const createServer = (stream, port, connectionListener) => {
    const net = require("net");
    const server = net.createServer(socket => {
        console.error(`c:connect ${socket.remoteAddress}`);
        if (connectionListener) {
            connectionListener(socket);
        }
        const valve = new SafetyValve();
        stream.pipe(valve).pipe(socket);
        socket.on("unpipe", () => {
            console.error(`c:unpipe ${socket.remoteAddress}`);
            socket.destroy();
        });
        socket.on("close", () => {
            console.error(`c:close ${socket.remoteAddress}`);
            stream.unpipe(valve).resume();
        });
        socket.on("error", err => console.error(err));
    });
    stream.resume();
    server.listen(port);
    console.error(`s:listen ${port}`);
};

if (require.main === module) {
    const argv = require("minimist")(process.argv.slice(2), {
        alias: {
            l: "listen",
            s: "stream",
            a: "authority"
        }
    });
    const host = argv._[0];
    const username = process.env.TC_USERNAME;
    const password = process.env.TC_PASSWORD;
    let stream = createStream(host, username, password, argv.stream);
    if (argv.authority) {
        const test = toot => toot.uri.startsWith(`tag:${argv.authority},`);
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

