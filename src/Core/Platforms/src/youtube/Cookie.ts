import { writeFile, readFileSync, existsSync } from 'node:fs';

export function getCookies(): null | string {
    try {
        if (!existsSync(`./DataBase/Cookie.json`)) return null;
        let youtubeData = JSON.parse(readFileSync(`./DataBase/Cookie.json`, 'utf8'));
        return youtubeData.cookie;
    } catch {
        return null;
    }
}
export async function uploadCookie(Cookie: string | string[]): Promise<void | any> {
    let youtubeData = JSON.parse(readFileSync(`./DataBase/Cookie.json`, 'utf8'));
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
function ParsingCookieToJson(headCookie: string[] | string) {
    let Json: {};
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
function ParsingCookieToString(JsonCookie: object) {
    let result = '', num = 1;

    for (const [key, value] of Object.entries(JsonCookie)) {
        if (num === Object.keys(JsonCookie).length) result += `${key}=${value}`;
        else result += `${key}=${value}; `;

        num++;
    }
    return result;
}