import { writeFile, readFileSync, existsSync } from 'node:fs';

//====================== ====================== ====================== ======================
/**
 * @description Получаем куки из json файла
 */
export function getCookies(): null | string {
    try {
        if (!existsSync(`./DataBase/Cookie.json`)) return null;
        let youtubeData = JSON.parse(readFileSync(`./DataBase/Cookie.json`, "utf8"));
        return youtubeData.cookie;
    } catch {
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Сохраняем куки в json файл
 * @param Cookie {string | string[]} Что нужно добавить к текущему куки
 */
export function uploadCookie(Cookie: string | string[]): void {
    if (!existsSync(`./DataBase/Cookie.json`)) return null;

    let youtubeData = JSON.parse(readFileSync(`./DataBase/Cookie.json`, "utf8"));
    let EndCookieString: {};

    if (typeof Cookie === "string") {
        let CookieJson = ParsingCookieToJson(youtubeData.cookie);
        let newCookieJson = ParsingCookieToJson([Cookie]);

        let EndCookieJson = {...CookieJson, ...newCookieJson};
        EndCookieString = {cookie: ParsingCookieToString(EndCookieJson)};
    } else {
        let CookieJson = ParsingCookieToJson(youtubeData.cookie);

        let newCookieJson = ParsingCookieToJson(Cookie);
        let EndCookieJson = {...CookieJson, ...newCookieJson};
        EndCookieString = {cookie: ParsingCookieToString(EndCookieJson)};
    }

    return writeFile('./DataBase/Cookie.json', JSON.stringify(EndCookieString, null, `\t`), () => null);
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем из строки json
 * @param headCookie {string[] | string} Что нужно добавить к текущему куки
 * @constructor
 */
function ParsingCookieToJson(headCookie: string[] | string): {} {
    let Json = {};
    if (typeof headCookie === "string") {
        headCookie.split(';').forEach((z) => {
            const arr = z.split("=");
            if (arr.length <= 1) return;
            const key = arr.shift()?.trim() as string;
            const value = arr.join("=").trim();

            Json = {...Json, [key]: value};
        });
    } else {
        headCookie.forEach((x: string) => {
            x.split(";").forEach((z) => {
                const arr = z.split("=");
                if (arr.length <= 1) return;
                const key = arr.shift()?.trim() as string;
                const value = arr.join("=").trim();

                Json = {...Json, [key]: value};
            });
        });
    }
    return Json;
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем из json формата строку
 * @param JsonCookie {object} Json куки
 * @constructor
 */
function ParsingCookieToString(JsonCookie: {}) {
    let result = [];

    for (let [key, value] of Object.entries(JsonCookie)) result.push(`${key}=${value}`);
    return result.join("; ");
}