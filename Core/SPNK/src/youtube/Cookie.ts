import { writeFile, readFileSync } from 'node:fs';

export function getCookies(): undefined | string {
    try {
        let youtubeData = JSON.parse(readFileSync(`./db/Cookie.json`, 'utf8'));
        return youtubeData.cookie;
    } catch {
        return null;
    }
}
export async function uploadCookie(Cookie: string | string[]) {
    let youtubeData = JSON.parse(readFileSync(`./db/Cookie.json`, 'utf8'));
    let EndCookieString = null;

    if (typeof Cookie === "string") {
        let CookieJson = await ParsingCookieToJson(youtubeData.cookie);
        let newCookieJson = await ParsingCookieToJson([Cookie]);

        let EndCookieJson = {...CookieJson, ...newCookieJson};
        EndCookieString = {cookie: await ParsingCookieToString(EndCookieJson)};
    } else {
        let CookieJson = await ParsingCookieToJson(youtubeData.cookie);

        let newCookieJson = await ParsingCookieToJson(Cookie);
        let EndCookieJson = {...CookieJson, ...newCookieJson};
        EndCookieString = {cookie: await ParsingCookieToString(EndCookieJson)};
    }

    writeFile('./db/Cookie.json', JSON.stringify(EndCookieString, null, `\t`), () => null);
    return;
}
async function ParsingCookieToJson(headCookie: string[] | string) {
    let Json = {}
    if (typeof headCookie === "string") {
        headCookie.split(';').forEach((z) => {
            const arr = z.split('=');
            if (arr.length <= 1) return;
            const key = arr.shift()?.trim() as string;
            const value = arr.join('=').trim();

            Json = {...Json, [key]: value};
        });
    } else {
        headCookie.forEach((x: string) => {
            x.split(';').forEach((z) => {
                const arr = z.split('=');
                if (arr.length <= 1) return;
                const key = arr.shift()?.trim() as string;
                const value = arr.join('=').trim();

                Json = {...Json, [key]: value};
            });
        });
    }
    return Json;
}
async function ParsingCookieToString(JsonCookie: object) {
    let result = '', num = 1;

    for (const [key, value] of Object.entries(JsonCookie)) {
        if (num === Object.keys(JsonCookie).length) result += `${key}=${value}`;
        else result += `${key}=${value}; `;

        num++;
    }
    return result;
}