import * as https from "node:https";
import {IncomingMessage} from "node:http";
import * as Buffer from "buffer";
const YouTubeParameters = {
    timeout: 10000,
    headers: {
        'x-youtube-client-name': '1',
        'x-youtube-client-version': '2.20201021.03.00',
        'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7',
    }
}
const redirectCodes = new Set([301, 302, 303, 307, 308]);

export class httpsClient {
    private url: string;
    private redirect: number;
    constructor(url: string) {
        this.url = url;
        this.redirect = 0
    }
    public getRes = async (options: any = {}) => new Promise(async (res: any) => https.get(this.url, {...YouTubeParameters, ...options}, async (req: IncomingMessage) => res(this.AutoRedirect(options, req))));
    public _parseBody = async (options?: any, body: string = null): Promise<string> => new Promise(async (res: any) => this.getRes(options).then(async (req: IncomingMessage) => {
        // @ts-ignore
        if (req.error) return res(null);
        req.on('data', async (chunk: Buffer) => body += chunk);
        req.on('end', () => {
            req?.destroy();
            return res(body);
        });
    }));
    public _parseToJson = async (options: any): Promise<JSON> => this._parseBody(options).then(async (body: string) => {
        if (!body) return {error: true, message: 'Body is null'};
        return JSON.parse(body.split('null')[1]) ?? JSON.parse(body.split('undefined')[1]) ?? JSON.stringify(body);
    }).catch(async (e: Error) => `invalid json response body at ${this.url} reason: ${e.message}`);

    private AutoRedirect = async (options: any, req: IncomingMessage) => {
        if (req.statusCode === 200 || this.redirect >= 4) return req;
        else if (redirectCodes.has(req.statusCode)) {
            this.redirect++;
            this.url = req.headers.location ? req.headers.location : this.url;
            return this.getRes(options);
        } return {error: true};
    };
}