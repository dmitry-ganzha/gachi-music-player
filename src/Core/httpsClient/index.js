"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpsClient = void 0;
const node_zlib_1 = require("node:zlib");
const Cookie_1 = require("../Platforms/src/youtube/Cookie");
const UserAgents_json_1 = __importDefault(require("./UserAgents.json"));
const undici_1 = require("undici");
exports.httpsClient = { Request, parseBody, parseJson };
function Request(url, options) {
    if (options)
        ChangeReqOptions(options);
    return (0, undici_1.request)(url, options?.request);
}
function parseBody(url, options) {
    return Request(url, options).then((res) => {
        let decoder = null;
        const encoding = res.headers["content-encoding"];
        if (encoding === "gzip")
            decoder = (0, node_zlib_1.createGunzip)();
        else if (encoding === "br")
            decoder = (0, node_zlib_1.createBrotliDecompress)();
        else if (encoding === "deflate")
            decoder = (0, node_zlib_1.createDeflate)();
        setImmediate(() => EditCookie(res.headers, url));
        if (decoder) {
            res.body.pipe(decoder);
            return DecodePage(decoder);
        }
        return DecodePage(res.body);
    });
}
function parseJson(url, options) {
    return parseBody(url, options).then((body) => {
        if (!body)
            return;
        try {
            return JSON.parse(body);
        }
        catch (e) {
            console.log(`Invalid json response body at ${url} reason: ${e.message}`);
            return;
        }
    });
}
function GetUserAgent() {
    const MinAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents_json_1.default.length - 1);
    const Agent = UserAgents_json_1.default[Math.floor(Math.random() * (MaxAgents - MinAgents + 1)) + MinAgents];
    const Version = Agent.split("Chrome/")[1].split(" ")[0];
    return { Agent, Version };
}
function ChangeReqOptions(options) {
    if (!options.request?.headers)
        options.request = { ...options.request, headers: {} };
    if (options.request?.headers) {
        if (options.options?.userAgent) {
            const { Agent, Version } = GetUserAgent();
            options.request.headers = { ...options.request.headers, "user-agent": Agent };
            if (Version)
                options.request.headers = { ...options.request.headers, "sec-ch-ua-full-version": Version };
        }
        if (options.options?.zLibEncode)
            options.request.headers = { ...options.request.headers, "accept-encoding": "gzip, deflate, br" };
        if (options.options?.english)
            options.request.headers = { ...options.request.headers, "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7" };
        if (options.options?.cookie || options.Token) {
            const cookie = (0, Cookie_1.getCookies)();
            if (cookie)
                options.request.headers = { ...options.request.headers, "cookie": cookie };
        }
        if (options.options?.YouTubeClient || options.Token) {
            if (options.Token)
                options.request.headers = { 'x-youtube-identity-token': options.Token?.split('\\')[0], ...options.request.headers };
            options.request.headers = {
                'x-youtube-client-name': '1',
                'x-youtube-client-version': '2.20201021.03.00',
                ...options.request.headers,
            };
        }
    }
}
function EditCookie(headers, url) {
    if (headers && headers["set-cookie"] && url.match(/watch/)) {
        setImmediate(() => (0, Cookie_1.uploadCookie)(headers["set-cookie"]));
    }
}
function DecodePage(decoder) {
    let data = [];
    return new Promise((resolve) => {
        decoder.setEncoding("utf-8");
        decoder.on("data", (c) => data.push(c));
        decoder.once("end", () => resolve(data.join('')));
    });
}
