import {BrotliDecompress, createBrotliDecompress, createDeflate, createGunzip, Deflate, Gunzip} from 'node:zlib';
import {IncomingMessage} from "http";
import {request, RequestOptions} from "https";
import {getCookies, uploadCookie} from "./Cookie";
import UserAgents from "./UserAgents.json";

let Cookie = getCookies(); //Получаем куки если он был указан в файле
const decoderBase = {
    "gzip": (): Gunzip => createGunzip(),
    "br": (): BrotliDecompress => createBrotliDecompress(),
    "deflate": (): Deflate => createDeflate()
}

export namespace httpsClient {
    /**
     * @description Создаем запрос по ссылке, модифицируем по необходимости
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     * @requires {ChangeReqOptions}
     */
    export function Request(url: string, options?: httpsClientOptions): Promise<IncomingMessage> {
        ChangeReqOptions(options);

        return new Promise((resolve, reject) => {
            const Link = new URL(url);
            const Options: RequestOptions = {
                host: Link.hostname,
                path: Link.pathname + Link.search,
                headers: options?.request?.headers ?? {},
                method: options?.request?.method ?? "GET"
            };
            const httpsRequest = request(Options, (res) => {
                //Автоматическое перенаправление
                if (res.statusCode >= 300 && res.statusCode < 400) {
                    if (res.headers?.location) return resolve(Request(res.headers.location, options));
                }
                //Обновляем куки
                if (options?.options?.cookie && res.headers && res.headers["set-cookie"]) setImmediate(() => {
                    uploadCookie(res.headers["set-cookie"]);
                    if (Cookie) Cookie = getCookies();
                });

                return resolve(res);
            });

            //Если возникла ошибка
            httpsRequest.on("error", reject);

            //Если запрос POST, отправляем ответ на сервер
            if (options?.request?.method === "POST") httpsRequest.write(options.request?.body);

            //Заканчиваем запрос
            httpsRequest.end();
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем страницу в формате string
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     * @requires {uploadCookie, getCookies}
     */
    export function parseBody(url: string, options?: httpsClientOptions): Promise<string> {
        return new Promise((resolve) => Request(url, options).then((res: IncomingMessage) => {
            const encoding = res.headers["content-encoding"] as "br" | "gzip" | "deflate";
            const data: string[] = [];
            const decoder: Decoder | null = decoderBase[encoding] ? decoderBase[encoding]() : null;
            const runDecode = (decoder: Decoder | IncomingMessage) => {
                decoder.setEncoding("utf-8");
                decoder.on("data", (c) => data.push(c));
                decoder.once("end", () => {
                    if (!decoder.destroyed) res.destroy();

                    return resolve(data.join(""));
                });
            };

            if (!decoder) return runDecode(res);
            return runDecode(res.pipe(decoder));
        }));
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем со страницы JSON (Работает только тогда когда все страница JSON)
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     * @requires {parseBody}
     */
    export function parseJson(url: string, options?: httpsClientOptions): Promise<null | any> {
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
    /**
     * @description Проверяем ссылку на работоспособность
     * @param url {string} Ссылка
     * @requires {Request}
     */
    export function checkLink(url: string): Promise<"OK" | "Fail"> | "Fail" {
        if (!url) return "Fail";

        return Request(url, {request: {method: "HEAD"}}).then((resource: IncomingMessage) => {
            if (resource instanceof Error) return "Fail"; //Если есть ошибка
            if (resource.statusCode >= 200 && resource.statusCode < 400) return "OK"; //Если возможно скачивать ресурс
            return "Fail"; //Если прошлые варианты не подходят, то эта ссылка не рабочая
        });
    }
}
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
    const Version = Agent?.split("Chrome/")[1]?.split(" ")[0];

    return { Agent, Version };
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем свои аргументы запроса
 * @param options {httpsClientOptions} Настройки запроса
 * @requires {GetUserAgent}
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
    if (options.options?.cookie && Cookie) options.request.headers = {...options.request.headers, "cookie": Cookie};
}
//====================== ====================== ====================== ======================
type Decoder = BrotliDecompress | Gunzip | Deflate;
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