import {BrotliDecompress, createBrotliDecompress, createDeflate, createGunzip, Deflate, Gunzip} from 'node:zlib';
import {IncomingMessage} from "http";
import {request, RequestOptions} from "https";
import {getCookies, uploadCookie} from "../Platforms/src/youtube/Cookie";
import UserAgents from "./UserAgents.json";

export const httpsClient = {Request, parseBody, parseJson};

/**
 * @description Создаем запрос по ссылке, модифицируем по необходимости
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function Request(url: string, options?: httpsClientOptions): Promise<IncomingMessage> {
    if (options) ChangeReqOptions(options);

    return new Promise((resolve, reject) => {
        const Link = new URL(url);
        const Options: RequestOptions = {
            host: Link.hostname,
            path: Link.pathname + Link.search,
            headers: options.request?.headers ?? {},
            method: options.request?.method ?? "GET"
        };

        const Requesting = request(Options, resolve);
        Requesting.on("error", reject);
        if (options.request?.method === "POST") Requesting.write(options.request?.body);
        Requesting.end();
    });
}
function AutoRedirect(url: string, options?: httpsClientOptions): Promise<IncomingMessage> {
    return Request(url, options).then((res) => {
        if (res instanceof Error) return res;

        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location !== undefined) return AutoRedirect(res.headers.location, options);
        return res;
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем страницу в формате string
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function parseBody(url: string, options?: httpsClientOptions): Promise<string> {
    return new Promise((resolve) => {
        AutoRedirect(url, options).then((res) => {
            const encoding = res.headers["content-encoding"];
            let decoder: BrotliDecompress | Gunzip | Deflate | null = null;
            let data: string[] = [];

            if (encoding === "gzip") decoder = createGunzip();
            else if (encoding === "br") decoder = createBrotliDecompress();
            else if (encoding === "deflate") decoder = createDeflate();

            if (options.options?.cookie && res.headers && res.headers["set-cookie"]) uploadCookie(res.headers["set-cookie"]);

            if (decoder) {
                res.pipe(decoder);
                decoder.setEncoding("utf-8");
                decoder.on("data", (c) => data.push(c));
                decoder.once("end", () => resolve(data.join("")));
            } else {
                res.setEncoding("utf-8");
                res.on("data", (c) => data.push(c));
                res.once("end", () => resolve(data.join("")));
            }
        });
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем со страницы JSON (Работает только тогда когда все страница JSON)
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function parseJson(url: string, options?: httpsClientOptions): Promise<null | any> {
    return parseBody(url, options).then((body) => {
        if (!body) return null;

        try {
            return JSON.parse(body);
        } catch (e) {
            console.log(`Invalid json response body at ${url} reason: ${e.message}`);
            return null;
        }
    });
}

//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ===============| OTHER FUNCTION |============ ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Получаем рандомный user-agent и его версию
 */
function GetUserAgent(): {Agent: string, Version: string} {
    const MinAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents.length - 1);

    //Сам агент
    const Agent = UserAgents[Math.floor(Math.random() * (MaxAgents - MinAgents + 1)) + MinAgents];
    //Версия агента
    const Version = Agent.split("Chrome/")[1].split(" ")[0];

    return { Agent, Version };
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем свои аргументы запроса
 * @param options {httpsClientOptions} Настройки запроса
 */
function ChangeReqOptions(options: httpsClientOptions): void {
    if (!options.request || !options.request?.headers) options.request = {...options.request, headers: {}};

    if (options.request?.headers) {
        if (options.options?.userAgent) {
            const {Agent, Version} = GetUserAgent();
            options.request.headers = {...options.request.headers, "user-agent": Agent};
            if (Version) options.request.headers = {...options.request.headers, "sec-ch-ua-full-version": Version};
        }
        if (options.options?.cookie) {
            const cookie = getCookies();
            if (cookie) options.request.headers = {...options.request.headers, "cookie": cookie};
        }
    }
}
//====================== ====================== ====================== ======================
// @ts-ignore
interface ReqOptions extends RequestOptions {
    path?: string,
    body?: string
}
export interface httpsClientOptions {
    request?: ReqOptions;
    options?: {
        userAgent?: boolean;
        cookie?: boolean;
    };
}