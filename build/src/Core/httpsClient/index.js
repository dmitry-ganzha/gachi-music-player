"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpsClient = void 0;
const tslib_1 = require("tslib");
const node_zlib_1 = require("node:zlib");
const https_1 = require("https");
const http_1 = require("http");
const Cookie_1 = require("./Cookie");
const UserAgents_json_1 = tslib_1.__importDefault(require("@db/UserAgents.json"));
const decoderBase = {
    "gzip": node_zlib_1.createGunzip,
    "br": node_zlib_1.createBrotliDecompress,
    "deflate": node_zlib_1.createDeflate
};
const protocols = {
    "http": http_1.request,
    "https": https_1.request
};
var httpsClient;
(function (httpsClient) {
    function Request(url, options = { request: { headers: {}, method: "GET" }, options: {} }) {
        if (options.options?.userAgent) {
            const { Agent, Version } = GetUserAgent();
            if (Agent)
                options.request.headers = { ...options.request.headers, "user-agent": Agent };
            if (Version)
                options.request.headers = { ...options.request.headers, "sec-ch-ua-full-version": Version };
        }
        if (options.options?.cookie) {
            const cookie = (0, Cookie_1.getCookies)();
            options.request.headers = { ...options.request.headers, "cookie": cookie };
        }
        return new Promise((resolve, reject) => {
            const { hostname, pathname, search, port } = new URL(url);
            const request = protocols[url.split("://")[0]]({ host: hostname, path: pathname + search, port, ...options.request }, (res) => {
                if ((res.statusCode >= 300 && res.statusCode < 400) && res.headers?.location)
                    return resolve(Request(res.headers.location, options));
                if (options?.options?.cookie && res.headers && res.headers["set-cookie"])
                    setImmediate(() => (0, Cookie_1.uploadCookie)(res.headers["set-cookie"]));
                return resolve(res);
            });
            request.on("error", reject);
            if (options?.request?.method === "POST")
                request.write(options.request?.body);
            request.end();
            setTimeout(() => {
                if (!request.destroyed) {
                    request.removeAllListeners();
                    request.destroy();
                }
            }, 5e3);
        });
    }
    httpsClient.Request = Request;
    function parseBody(url, options) {
        return Request(url, options).then((res) => {
            const encoding = res.headers["content-encoding"];
            const decoder = decoderBase[encoding] ? decoderBase[encoding]() : null;
            if (!decoder)
                return extractPage(res);
            return extractPage(res.pipe(decoder));
        });
    }
    httpsClient.parseBody = parseBody;
    function parseJson(url, options) {
        return parseBody(url, options).then((body) => {
            if (!body)
                return null;
            try {
                return JSON.parse(body);
            }
            catch (e) {
                console.log(`[httpsClient]: Invalid json response body at ${url} reason: ${e.message}`);
                return null;
            }
        });
    }
    httpsClient.parseJson = parseJson;
    function checkLink(url) {
        if (!url)
            return "Fail";
        return Request(url, { request: { method: "HEAD" } }).then((resource) => {
            if (resource instanceof Error)
                return "Fail";
            if (resource.statusCode >= 200 && resource.statusCode < 400)
                return "OK";
            return "Fail";
        });
    }
    httpsClient.checkLink = checkLink;
})(httpsClient = exports.httpsClient || (exports.httpsClient = {}));
function GetUserAgent() {
    const MinAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents_json_1.default.length - 1);
    const Agent = UserAgents_json_1.default[Math.floor(Math.random() * (MaxAgents - MinAgents + 1)) + MinAgents];
    const Version = Agent?.split("Chrome/")[1]?.split(" ")[0];
    return { Agent, Version };
}
function extractPage(decoder) {
    const data = [];
    return new Promise((resolve) => {
        decoder.setEncoding("utf-8");
        decoder.on("data", (c) => data.push(c));
        decoder.once("end", () => {
            return resolve(data.join(""));
        });
    });
}
