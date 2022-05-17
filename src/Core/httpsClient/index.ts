import {BrotliDecompress, createBrotliDecompress, createDeflate, createGunzip, Deflate, Gunzip} from 'node:zlib';
import {IncomingMessage} from "http";
import {getCookies, uploadCookie} from "../Platforms/src/youtube/Cookie";
import UserAgents from "./UserAgents.json";
import {Dispatcher, request} from "undici";
import {RequestOptions} from "undici/types/dispatcher";
import BodyReadable from "undici/types/readable";

export const httpsClient = {Request, parseBody, parseJson};

/**
 * @description Чистый запрос
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function Request(url: string, options?: httpsClientOptions) {
    if (options) ChangeReqOptions(options);
    return request(url, options?.request);
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем страницу в формате string
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function parseBody(url: string, options?: httpsClientOptions): Promise<string> {
    return Request(url, options).then((res) => {
        let decoder: BrotliDecompress | Gunzip | Deflate | null = null;
        const encoding = res.headers["content-encoding"];

        if (encoding === "gzip") decoder = createGunzip();
        else if (encoding === "br") decoder = createBrotliDecompress();
        else if (encoding === "deflate") decoder = createDeflate();

        setImmediate(() => EditCookie(res.headers, url));

        if (decoder) {
            res.body.pipe(decoder);
            return DecodePage(decoder);
        }

        return DecodePage(res.body);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем со страницы JSON (Работает только тогда когда все страница JSON)
 * @param url {string} Ссылка
 * @param options {httpsClientOptions} Настройки запроса
 */
function parseJson(url: string, options?: httpsClientOptions): Promise<null | any> {
    return new Promise<null | any>(async (resolve) => {
        const body = (await Promise.all([parseBody(url, options)]))[0];
        if (!body) return;

        try {
            return resolve(JSON.parse(body));
        } catch (e) {
            console.log(`Invalid json response body at ${url} reason: ${e.message}`);
            return;
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
    if (!options.request?.headers) options.request = {...options.request, headers: {}};

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
        if (options.options?.zLibEncode) options.request.headers = {...options.request.headers, "accept-encoding": "gzip, deflate, br"};
        if (options.options?.english) options.request.headers = {...options.request.headers, "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7"};
    }

    if (options.options?.RealisticRequest) {
        //Сделаем парсинг не таким заметным
        options.request = {
            ...options.request,
            headers: {
                ...options.request.headers,
                "sec-ch-ua-platform": "windows",
                "sec-ch-ua-arch": "x86",
                "sec-ch-ua-bitness": "64",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-model": "",
                "sec-fetch-user": "?1",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate"
            },
            responseHeader: "raw"
        };
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем данные которые надо заменить в куки для работоспособности
 * @param headers {IncomingHttpHeaders} Заголовки
 * @param url {string} Ссылка
 * @constructor
 */
function EditCookie(headers: IncomingHeaders, url: string): void {
    if (headers && headers["set-cookie"] && url.match(/watch/)) {
        setImmediate(() => uploadCookie(headers["set-cookie"]));
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Начинаем декодирование
 * @param decoder {ZlibDecoder | DefaultDecoder} Тип, из чего выгружаем данные
 * @constructor
 */
function DecodePage(decoder: ZlibDecoder | DefaultDecoder): Promise<string> {
    let data: string[] = [];

    return new Promise((resolve) => {
        decoder.setEncoding("utf-8");
        decoder.on("data", (c) => data.push(c));
        decoder.once("end", () => resolve(data.join('')));
    });
}
//====================== ====================== ====================== ======================
// @ts-ignore
interface ReqOptions extends RequestOptions {
    path?: string,
    body?: string
}
type ZlibDecoder =  BrotliDecompress | Gunzip | Deflate;
type DefaultDecoder = BodyReadable & Dispatcher.BodyMixin;

export interface httpsClientOptions {
    request?: ReqOptions;
    options?: {
        cookie?: boolean;
        userAgent?: boolean;
        zLibEncode?: boolean;
        english?: boolean;
        RealisticRequest?: boolean;
    }
}
type IncomingHeaders = IncomingMessage["headers"];