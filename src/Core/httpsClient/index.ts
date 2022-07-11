import {BrotliDecompress, createBrotliDecompress, createDeflate, createGunzip, Deflate, Gunzip} from 'node:zlib';
import {IncomingMessage} from "http";
import {request, RequestOptions} from "https";
import {getCookies, uploadCookie} from "../Platforms/src/youtube/Cookie";
import UserAgents from "./UserAgents.json";

export const httpsClient = {Request, parseBody, parseJson};
let Cookie = getCookies(); //Получаем куки если он был указан в файле

/**
 * @description Создаем запрос по ссылке, модифицируем по необходимости
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function Request(url: string, options?: httpsClientOptions): Promise<IncomingMessage> {
    ChangeReqOptions(options);

    return new Promise((resolve, reject) => {
        const Link = new URL(url);
        const Options: RequestOptions = {
            host: Link.hostname,
            path: Link.pathname + Link.search,
            headers: options?.request?.headers ?? {},
            method: options?.request?.method ?? "GET"
        };
        const Requesting = request(Options, resolve);

        //Если возникла ошибка
        Requesting.on("error", reject);

        //Если запрос POST, отправляем ответ на сервер
        if (options?.request?.method === "POST") Requesting.write(options.request?.body);

        //Заканчиваем запрос
        Requesting.end();
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Автоматическая переадресация
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 * @constructor
 */
function AutoRedirect(url: string, options?: httpsClientOptions): Promise<IncomingMessage> {
    return new Promise((resolve) => {
        return Request(url, options).then((res: IncomingMessage) => {
            if (res instanceof Error) {
                resolve(res);
                return;
            }

            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location !== undefined) return AutoRedirect(res.headers.location, options);
            resolve(res);
        });
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
        return AutoRedirect(url, options).then((res: IncomingMessage) => {
            const encoding = res.headers["content-encoding"];
            const data: string[] = [];
            let decoder: BrotliDecompress | Gunzip | Deflate | null = null;

            if (encoding === "gzip") decoder = createGunzip();
            else if (encoding === "br") decoder = createBrotliDecompress();
            else if (encoding === "deflate") decoder = createDeflate();

            //Нужно ли использовать декодер (без декодера могут быть символы вместо букв или цифр)
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

            //Обновляем куки в конце
            setImmediate(() => {
                if (options?.options?.cookie && res.headers && res.headers["set-cookie"]) {
                    uploadCookie(res.headers["set-cookie"]);

                    //Обновляем куки вне запроса что-бы снизить задержки!
                    if (Cookie) Cookie = getCookies();
                }
            });
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
    return parseBody(url, options).then((body: string) => {
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
    if (!options?.request) options = {...options, request: {headers: {}}};
    if (!options?.options) options = {...options, options: {}};

    //Добавляем User-Agent
    if (options.options?.userAgent) {
        const {Agent, Version} = GetUserAgent();
        options.request.headers = {...options.request.headers, "user-agent": Agent};
        if (Version) options.request.headers = {...options.request.headers, "sec-ch-ua-full-version": Version};
    }

    //Добавляем куки
    if (options.options?.cookie) {
        if (Cookie) options.request.headers = {...options.request.headers, "cookie": Cookie};
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