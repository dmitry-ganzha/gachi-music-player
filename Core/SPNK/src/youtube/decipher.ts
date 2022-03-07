import querystring from "node:querystring";
import {Utils} from "./Utils";
import vm from "node:vm";
import {httpsClient} from "../../../httpsClient";

export interface YouTubeFormat {
    url: string;
    other?: boolean | string;
    protocol?: string;
    signatureCipher?: string;
    cipher?: string
    sp?: string;
    s?: string
}
//vm.Script
interface Script {
    runInNewContext(param: { sig?: string, ncode?: string }): string;
}

export class Decipher {
    /**
     * @description Применяет преобразование параметра расшифровки и n ко всем URL-адресам формата.
     * @param formats {YouTubeFormat[]}
     * @param html5player {string} Ссылка на html5player
     */
    public _formats = async (formats: YouTubeFormat[], html5player: string): Promise<YouTubeFormat[]> => {
        let functions = await this.getFunctions(html5player);

        const decipherScript = functions.length ? new vm.Script(functions[0]) : null;
        const nTransformScript = functions.length > 1 ? new vm.Script(functions[1]) : null;
        formats.forEach((format: YouTubeFormat) => this.setDownloadURL(format, decipherScript, nTransformScript));
        return formats;
    };
    /**
     * @description Извлечь функции расшифровки подписи и преобразования n параметров из файла html5player.
     * @param html5player {string} Ссылка на html5player
     */
    protected getFunctions = async (html5player: string): Promise<null | string[]> => {
        const body = await new httpsClient().parseBody(html5player, {
            options: {zLibEncode: true, userAgent: true}
        });
        const functions = await this.extractFunctions(body);

        return !functions || !functions.length ? null : functions;
    };
    /**
     * @description Применить расшифровку и n-преобразование к индивидуальному формату
     * @param format {YouTubeFormat} Формат youtube
     * @param decipherScript {Script} vm.Script
     * @param nTransformScript {Script} vm.Script
     */
    protected setDownloadURL = async (format: YouTubeFormat, decipherScript: Script, nTransformScript: Script) => {
        const url = format.url ?? format.signatureCipher ?? format.cipher;

        format.url = !format.url ? await this.EncodeCode(await this._decipher(url, decipherScript), nTransformScript) : await this.EncodeCode(url, nTransformScript);
        delete format.signatureCipher;
        delete format.cipher;
    };
    /**
     * @description Добавляем в url signature
     * @param url {string} Ссылка
     * @param decipherScript {Script} vm.Script
     */
    protected _decipher = async (url: string, decipherScript: Script): Promise<string> => {
        const args = querystring.parse(url) as { url: string, sp: string, s: string };

        if (!args.s || !decipherScript) return args.url;

        const components = new URL(decodeURIComponent(args.url));
        components.searchParams.set(args.sp ? args.sp : 'signature', decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));
        return components.toString();
    };
    protected EncodeCode = async (url: string, nTransformScript: Script): Promise<string> => {
        const components = new URL(decodeURIComponent(url));
        const n = components.searchParams.get('n');

        if (!n || !nTransformScript) return url;

        components.searchParams.set('n', nTransformScript.runInNewContext({ ncode: n }));
        return components.toString();
    };
    /**
     * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
     * @param body {string} Страничка
     */
    protected extractFunctions = async (body: string): Promise<string[]> => {
        const functions: string[] = [];

        await this.extractDecipher(body, functions);
        await this.extractNCode(body, functions);
        return functions;
    };
    /**
     * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
     * @param caller {string} Данные
     * @param body {string} Страничка
     */
    protected extractManipulations = async (caller: string, body: string): Promise<"" | string> => {
        const functionName = await new Utils().between(caller, `a=a.split("");`, `.`);
        if (!functionName) return '';

        const functionStart = `var ${functionName}={`;
        const ndx = body.indexOf(functionStart);

        if (ndx < 0) return '';

        const subBody = body.slice(ndx + functionStart.length - 1);
        return `var ${functionName}=${await new Utils().cutAfterJSON(subBody)}`;
    };
    /**
     * @description Вырезаем Decipher
     * @param body {string} Страничка
     * @param functions {any[]} данные youtube htmlPlayer
     */
    protected extractDecipher = async (body: string, functions: string[]): Promise<void> => {
        const functionName = await new Utils().between(body, `a.set("alr","yes");c&&(c=`, `(decodeURIC`);

        if (functionName && functionName.length) {
            const functionStart = `${functionName}=function(a)`;
            const ndx = body.indexOf(functionStart);

            if (ndx >= 0) {
                const subBody = body.slice(ndx + functionStart.length);
                let functionBody = `var ${functionStart}${await new Utils().cutAfterJSON(subBody)}`;
                functionBody = `${await this.extractManipulations(functionBody, body)};${functionBody};${functionName}(sig);`;
                functions.push(functionBody);
            }
        }
    };
    /**
     * @description Вырезаем параметр n
     * @param body {string} Страничка
     * @param functions {any[]} данные youtube htmlPlayer
     */
    protected extractNCode = async (body: string, functions: any[]): Promise<void> => {
        let functionName = await new Utils().between(body, `&&(b=a.get("n"))&&(b=`, `(b)`);

        if (functionName.includes('[')) functionName = await new Utils().between(body, `${functionName.split('[')[0]}=[`, `]`);
        if (functionName && functionName.length) {
            const functionStart = `${functionName}=function(a)`;
            const ndx = body.indexOf(functionStart);

            if (ndx >= 0) {
                const subBody = body.slice(ndx + functionStart.length);
                const functionBody = `var ${functionStart}${await new Utils().cutAfterJSON(subBody)};${functionName}(ncode);`;
                functions.push(functionBody);
            }
        }
    };
}