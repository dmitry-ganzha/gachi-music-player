import { RequestOptions, request as httpsRequest } from 'node:https';
import {IncomingMessage} from "http";
import { BrotliDecompress, Deflate, Gunzip, createGunzip, createBrotliDecompress, createDeflate } from 'node:zlib';
import UserAgents from "./UserAgents.json";
import https from "https";
import {getCookies, uploadCookie} from "../SPNK/src/youtube/Cookie";

export interface httpsClientOptions {
    url: string;
    request?: { body?: string;  method?: "GET" | "POST" | "HEAD"; } & RequestOptions;
    options?: {
        cookie?: boolean;
        userAgent?: boolean;
        zLibEncode?: boolean;
        english?: boolean;
    };
}
type ReqOptions = httpsClientOptions["request"];

//Получаем рандомный user-agent
function UserAgent(): string {
    const minAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents.length - 1);
    return UserAgents[Math.floor(Math.random() * (MaxAgents - minAgents + 1)) + minAgents];
}
//Создаем Request
function Request(url: string, options: ReqOptions): Promise<IncomingMessage> {
    return new Promise((resolve) => {
        const DecodeLink = new URL(url);
        let ReqOptions: RequestOptions = {
            host: DecodeLink.hostname,
            path: DecodeLink.pathname + DecodeLink.search,
            headers: options?.headers ?? {},
            method:  options?.method ?? "GET"
        };
        const request = httpsRequest(ReqOptions, resolve);

        request.once('error', (err: Error) => {
            console.log(`[httpsClient]: [${options?.method}]: [Error]: `, err);
            return resolve(null);
        });
        if (options?.method === 'POST') request.write(options.body);
        request.end();
        // Через 10 сек уничтожаем request (чтоб не засирать память)
        setTimeout(() => request.destroy(), 10e3);
    });
}

/**
 * Клиент умеет создавать get, post, head запросы. Может переходить по ссылкам до скольки надо, параметр {redirect}. Может декодировать с помощью zlib. Изменять название клиента {user-agent}.
 * Так-же может парсануть страничку или парсануть в JSON формат (если страница JSON FORMAT)
 */
export class httpsClient {
    protected redirect: number = 0;
    /**
     * @description Создаем запрос
     * @param options {httpsClientOptions}
     */
    public Request = async (options: httpsClientOptions): Promise<IncomingMessage | null> => new Promise(async (resolve) => {
        let cookies_added = false;

        if (!options.request?.headers) options.request = {...options.request, headers: {}};

        if (options.request?.headers) {
            if (options.options?.userAgent) options.request.headers = {...options.request.headers, 'user-agent': UserAgent()};
            if (options.options?.cookie) {
                const cookie = getCookies();

                if (cookie) {
                    options.request.headers = {...options.request.headers, 'cookie': cookie};
                    cookies_added = true;
                }
            }
            if (options.options?.zLibEncode) options.request.headers = {...options.request.headers, 'accept-encoding': 'gzip, deflate, br'};
            if (options.options?.english) options.request.headers = {...options.request.headers, 'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7'};
        }

        return Request(options.url, options.request).then(async (req: IncomingMessage) => {
            if (req.headers && req.headers['set-cookie'] && options.url.match(/watch/) && cookies_added) {
                setImmediate(async () => uploadCookie(req.headers['set-cookie']));
            }

            if ((req.statusCode >= 400 && req.statusCode < 510) || this.redirect === 8) return resolve(null);

            // Делаем переход {req.headers.location}
            else if (req.statusCode >= 300 && req.statusCode < 400) {
                this.redirect++;
                return resolve(this.Request({...options, url: req.headers.location}));
            }
            // Удаляем кол-во переходов
            delete this.redirect;
            return resolve(req);
        });
    });
    /**
     * @description Парсит указанную страничку
     * @param options {httpsClientOptions}
     */
    public parseBody = async (options: httpsClientOptions): Promise<string | null> => new Promise(async (resolve) => this.Request(options).then(async (req: IncomingMessage | null) => {
        if (!req) return resolve(null);
        const data: string[] = [];

        let decoder: BrotliDecompress | Gunzip | Deflate | null = null;
        const encoding = req.headers['content-encoding'];

        if (encoding === 'gzip') decoder = createGunzip();
        else if (encoding === 'br') decoder = createBrotliDecompress();
        else if (encoding === 'deflate') decoder = createDeflate();

        if (decoder) {
            req.pipe(decoder);
            decoder.setEncoding('utf-8');
            decoder.on('data', async (c) => data.push(c));
            decoder.once('end', async () => resolve(data.join('')));
        } else {
            req.setEncoding('utf-8');
            req.on('data', async (c) => data.push(c));
            req.once('end', async () => resolve(data.join('')));
        }
    }));
    /**
     * @description Создаем Json (не всегда работает)
     * @param options {httpsClientOptions}
     */
    public parseJson = async (options: httpsClientOptions): Promise<{error: boolean, message: string} | any> => this.parseBody(options).then(async (body: string | null) => {
        if (!body) return null;

        return JSON.parse(body);
    }).catch(async (e: Error) => `Invalid json response body at ${options.url} reason: ${e.message}`);
    /**
     * @description Создаем простой get запрос (Использовать только в Streamer.ts)
     * @param url {string} Ссылка на ресурс
     */
    public static get = async (url: string): Promise<IncomingMessage> => new Promise(async (resolve) => https.get(url, (req) => {
            if ((req.statusCode >= 400 && req.statusCode < 510)) return resolve(null);
            return resolve(req);
        })
    );
}