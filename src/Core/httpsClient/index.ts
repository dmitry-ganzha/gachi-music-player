import { BrotliDecompress, Deflate, Gunzip, createGunzip, createBrotliDecompress, createDeflate } from 'node:zlib';
import {request} from "undici";
import {IncomingMessage} from "http";
import {RequestOptions, ResponseData} from "undici/types/dispatcher";
import {getCookies, uploadCookie} from "../Platforms/src/youtube/Cookie";
import UserAgents from "./UserAgents.json";

// @ts-ignore
interface ReqOptions extends RequestOptions {
    path?: string
}

interface httpsClientOptions {
    request?: ReqOptions;
    options?: {
        cookie?: boolean;
        userAgent?: boolean;
        zLibEncode?: boolean;
        english?: boolean;
    }
}
type IncomingHttpHeaders = IncomingMessage['headers'];

export class httpsClient {
    /**
     * @description Чистый запрос
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     */
    public Request = (url: string, options?: httpsClientOptions): Promise<ResponseData> => {
        if (options) EditRequestOptions(options);
        return request(url, options?.request);
    };
    /**
     * @description Получаем страницу в формате string
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     */
    public parseBody = (url: string, options?: httpsClientOptions): Promise<string> => new Promise<string>(async (resolve) => {
        const req = (await Promise.all([this.Request(url, options)]))[0];

        if (!req.body) return resolve(null);
        const data: string[] = [];

        let decoder: BrotliDecompress | Gunzip | Deflate | null = null;
        const encoding = req.headers['content-encoding'];

        if (encoding === 'gzip') decoder = createGunzip();
        else if (encoding === 'br') decoder = createBrotliDecompress();
        else if (encoding === 'deflate') decoder = createDeflate();

        setImmediate(() => EditCookie(req.headers, url));

        if (decoder) {
            req.body.pipe(decoder);
            decoder.setEncoding('utf-8');
            decoder.on('data', (c) => data.push(c));
            decoder.once('end', () => resolve(data.join('')));
        } else {
            req.body.setEncoding('utf-8');
            req.body.on('data', (c) => data.push(c));
            req.body.once('end', () => resolve(data.join('')));
        }
    });

    /**
     * @description Получаем со страницы JSON (Работает только тогда когда все страница JSON)
     * @param url {string} Ссылка
     * @param options {httpsClientOptions} Настройки запроса
     */
    public parseJson = (url: string, options?: httpsClientOptions): Promise<any> => new Promise<any>(async (resolve) => {
        const body = (await Promise.all([this.parseBody(url, options)]))[0];
        if (!body) return null;

        try {
            return resolve(JSON.parse(body));
        } catch (e) {
            console.log(`Invalid json response body at ${url} reason: ${e.message}`);
            return null;
        }
    });
}

//====================== ====================== ====================== ======================
/**
 * @description Получаем рандомный user-agent
 */
function UserAgent(): string {
    const minAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents.length - 1);
    return UserAgents[Math.floor(Math.random() * (MaxAgents - minAgents + 1)) + minAgents];
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем свои аргументы запроса
 * @param options {httpsClientOptions} Настройки запроса
 */
function EditRequestOptions(options: httpsClientOptions): void {
    if (!options.request?.headers) options.request = {...options.request, headers: {}};

    if (options.request?.headers) {
        if (options.options?.userAgent) options.request.headers = {...options.request.headers, 'user-agent': UserAgent()};
        if (options.options?.cookie) {
            const cookie = getCookies();

            if (cookie) {
                options.request.headers = {...options.request.headers, 'cookie': cookie};
            }
        }
        if (options.options?.zLibEncode) options.request.headers = {...options.request.headers, 'accept-encoding': 'gzip, deflate, br'};
        if (options.options?.english) options.request.headers = {...options.request.headers, 'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7'};
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем данные которые надо заменить в куки для работоспособности
 * @param headers {IncomingHttpHeaders} Заголовки
 * @param url {string} Ссылка
 * @constructor
 */
function EditCookie(headers: IncomingHttpHeaders, url: string): void {
    if (headers && headers['set-cookie'] && url.match(/watch/)) {
        setImmediate(() => uploadCookie(headers['set-cookie']));
    }
}