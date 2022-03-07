import { BrotliDecompress, Deflate, Gunzip, createGunzip, createBrotliDecompress, createDeflate } from 'node:zlib';
import {request} from "undici";
import {IncomingMessage} from "http";
import {RequestOptions, ResponseData} from "undici/types/dispatcher";
import {getCookies, uploadCookie} from "../SPNK/src/youtube/Cookie";
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
    public Request = async (url: string, options?: httpsClientOptions): Promise<ResponseData> => {
        await EditRequestOptions(options);
        return request(url, options.request);
    };

    public parseBody = async (url: string, options?: httpsClientOptions): Promise<string> => new Promise(async (resolve) => this.Request(url, options).then(async (req) => {
        if (!req.body) return resolve(null);
        const data: string[] = [];

        let decoder: BrotliDecompress | Gunzip | Deflate | null = null;
        const encoding = req.headers['content-encoding'];

        if (encoding === 'gzip') decoder = createGunzip();
        else if (encoding === 'br') decoder = createBrotliDecompress();
        else if (encoding === 'deflate') decoder = createDeflate();

        await EditCookie(req.headers, url);

        if (decoder) {
            req.body.pipe(decoder);
            decoder.setEncoding('utf-8');
            decoder.on('data', async (c) => data.push(c));
            decoder.once('end', async () => resolve(data.join('')));
        } else {
            req.body.setEncoding('utf-8');
            req.body.on('data', async (c) => data.push(c));
            req.body.once('end', async () => resolve(data.join('')));
        }
    }));

    public parseJson = async (url: string, options?: httpsClientOptions) => this.parseBody(url, options).then(async (body) => {
        if (!body) return null;

        return JSON.parse(body);
    }).catch(async (e: Error) => `Invalid json response body at ${url} reason: ${e.message}`);
}

//Получаем рандомный user-agent
function UserAgent(): string {
    const minAgents = Math.ceil(0);
    const MaxAgents = Math.floor(UserAgents.length - 1);
    return UserAgents[Math.floor(Math.random() * (MaxAgents - minAgents + 1)) + minAgents];
}

async function EditRequestOptions(options: httpsClientOptions): Promise<void> {
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
async function EditCookie(req: IncomingHttpHeaders, url: string) {
    if (req && req['set-cookie'] && url.match(/watch/)) {
        setImmediate(async () => uploadCookie(req['set-cookie']));
    }
}