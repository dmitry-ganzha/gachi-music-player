"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCookie = exports.getCookies = void 0;
const node_fs_1 = require("node:fs");
function getCookies() {
    try {
        if (!(0, node_fs_1.existsSync)(`./DataBase/Cookie.json`))
            return null;
        return JSON.parse((0, node_fs_1.readFileSync)(`./DataBase/Cookie.json`, "utf8")).cookie;
    }
    catch {
        return null;
    }
}
exports.getCookies = getCookies;
function uploadCookie(Cookie) {
    if (!(0, node_fs_1.existsSync)(`./DataBase/Cookie.json`))
        return null;
    try {
        const CookieFile = JSON.parse((0, node_fs_1.readFileSync)(`./DataBase/Cookie.json`, "utf8"));
        const newCookie = ParsingCookieToString({ ...ParsingCookieToJson(CookieFile.cookie), ...ParsingCookieToJson(Cookie) });
        (0, node_fs_1.writeFile)('./db/Cookie.json', JSON.stringify({ cookie: newCookie }, null, `\t`), () => null);
    }
    catch (err) {
        throw new Error("Cookie file has damaged!");
    }
}
exports.uploadCookie = uploadCookie;
function ParsingCookieToJson(headCookie) {
    let Json = {};
    const filteredCookie = (cook) => cook.split(";").forEach((cookie) => {
        const arrayCookie = cookie.split("=");
        if (arrayCookie.length <= 1)
            return;
        const key = arrayCookie.shift()?.trim();
        const value = arrayCookie.join("=").trim();
        Json = { ...Json, [key]: value };
    });
    if (typeof headCookie === "string")
        filteredCookie(headCookie);
    else
        headCookie.forEach(filteredCookie);
    return Json;
}
function ParsingCookieToString(JsonCookie) {
    let result = [];
    for (const [key, value] of Object.entries(JsonCookie))
        result.push(`${key}=${value}`);
    return result.join("; ");
}
