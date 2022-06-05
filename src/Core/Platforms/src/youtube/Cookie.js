"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCookie = exports.getCookies = void 0;
const node_fs_1 = require("node:fs");
function getCookies() {
    try {
        if (!(0, node_fs_1.existsSync)(`./DataBase/Cookie.json`))
            return null;
        let youtubeData = JSON.parse((0, node_fs_1.readFileSync)(`./DataBase/Cookie.json`, 'utf8'));
        return youtubeData.cookie;
    }
    catch {
        return null;
    }
}
exports.getCookies = getCookies;
function uploadCookie(Cookie) {
    if (!(0, node_fs_1.existsSync)(`./DataBase/Cookie.json`))
        return null;
    let youtubeData = JSON.parse((0, node_fs_1.readFileSync)(`./DataBase/Cookie.json`, 'utf8'));
    let EndCookieString;
    if (typeof Cookie === "string") {
        let CookieJson = ParsingCookieToJson(youtubeData.cookie);
        let newCookieJson = ParsingCookieToJson([Cookie]);
        let EndCookieJson = { ...CookieJson, ...newCookieJson };
        EndCookieString = { cookie: ParsingCookieToString(EndCookieJson) };
    }
    else {
        let CookieJson = ParsingCookieToJson(youtubeData.cookie);
        let newCookieJson = ParsingCookieToJson(Cookie);
        let EndCookieJson = { ...CookieJson, ...newCookieJson };
        EndCookieString = { cookie: ParsingCookieToString(EndCookieJson) };
    }
    return (0, node_fs_1.writeFile)('./DataBase/Cookie.json', JSON.stringify(EndCookieString, null, `\t`), () => null);
}
exports.uploadCookie = uploadCookie;
function ParsingCookieToJson(headCookie) {
    let Json;
    if (typeof headCookie === "string") {
        headCookie.split(';').forEach((z) => {
            const arr = z.split('=');
            if (arr.length <= 1)
                return;
            const key = arr.shift()?.trim();
            const value = arr.join('=').trim();
            Json = { ...Json, [key]: value };
        });
    }
    else {
        headCookie.forEach((x) => {
            x.split(';').forEach((z) => {
                const arr = z.split('=');
                if (arr.length <= 1)
                    return;
                const key = arr.shift()?.trim();
                const value = arr.join('=').trim();
                Json = { ...Json, [key]: value };
            });
        });
    }
    return Json;
}
function ParsingCookieToString(JsonCookie) {
    let result = [];
    for (const [key, value] of Object.entries(JsonCookie))
        result.push(`${key}=${value}`);
    return result.join("; ");
}
