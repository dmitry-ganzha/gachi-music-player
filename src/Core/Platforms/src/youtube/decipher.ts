import querystring from "node:querystring";
import {Utils} from "./Utils";
import vm from "vm";
import {httpsClient} from "../../../httpsClient";

export interface YouTubeFormat {
    url: string;
    other?: boolean | string;
    protocol?: string;
    signatureCipher?: string;
    cipher?: string
    sp?: string;
    s?: string;
    work?: boolean;
    duration?: number;
    targetDurationSec?: number;
}

/**
 * @author ytdl-core (https://github.com/fent/node-ytdl-core)
 */

/**
 * @description vm<Script>
 */
// @ts-ignore
interface Script extends vm<Script> {
    runInNewContext(param: { sig?: string, ncode?: string }): string;
}
//====================== ====================== ====================== ======================
/**
 * @description Применяет преобразование параметра расшифровки и n ко всем URL-адресам формата.
 * @param formats {YouTubeFormat[]} Зашифрованные форматы
 * @param html5player {string} Ссылка на html5player
 */
export function Decipher(formats: YouTubeFormat[], html5player: string): Promise<YouTubeFormat[]> {
    return getFunctions(html5player).then((functions: string[] | null) => {
        const decipherScript = functions.length ? new vm.Script(functions[0]) : null;
        const nTransformScript = functions.length > 1 ? new vm.Script(functions[1]) : null;
        formats.forEach((format: YouTubeFormat) => setDownloadURL(format, decipherScript, nTransformScript));
        return formats;
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Извлечь функции расшифровки подписи и преобразования n параметров из файла html5player.
 * @param html5player {string} Ссылка на html5player
 */
function getFunctions(html5player: string): Promise<null | string[]> {
    return httpsClient.parseBody(html5player, {
        request: { method: "GET" },
        options: { zLibEncode: true, userAgent: true }
    }).then((body: string) => {
        const functions = extractFunctions(body);

        return !functions || !functions.length ? null : functions;
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Применить расшифровку и n-преобразование к индивидуальному формату
 * @param format {YouTubeFormat} Формат youtube
 * @param decipherScript {Script} vm.Script
 * @param nTransformScript {Script} vm.Script
 */
function setDownloadURL(format: YouTubeFormat, decipherScript: Script, nTransformScript: Script) {
    const url = format.url ?? format.signatureCipher ?? format.cipher;

    format.url = !format.url ? EncodeCode(_decipher(url, decipherScript), nTransformScript) : EncodeCode(url, nTransformScript);
    delete format.signatureCipher;
    delete format.cipher;
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем в url signature
 * @param url {string} Ссылка
 * @param decipherScript {Script} vm.Script
 */
function _decipher(url: string, decipherScript: Script): string {
    const args = querystring.parse(url) as { url: string, sp: string, s: string };

    if (!args.s || !decipherScript) return args.url;

    const components = new URL(decodeURIComponent(args.url));
    components.searchParams.set(args.sp ? args.sp : 'signature', decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));
    return components.toString();
}
function EncodeCode(url: string, nTransformScript: Script): string {
    const components = new URL(decodeURIComponent(url));
    const n = components.searchParams.get('n');

    if (!n || !nTransformScript) return url;

    components.searchParams.set('n', nTransformScript.runInNewContext({ ncode: n }));
    return components.toString();
}
//====================== ====================== ====================== ======================
/**
 * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
 * @param body {string} Страничка
 */
function extractFunctions(body: string): string[] {
    const functions: string[] = [];

    extractDecipher(body, functions);
    extractNCode(body, functions);
    return functions;
}
//====================== ====================== ====================== ======================
/**
 * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
 * @param caller {string} Данные
 * @param body {string} Страничка
 */
function extractManipulations(caller: string, body: string): string {
    const functionName = new Utils().between(caller, `a=a.split("");`, `.`);
    if (!functionName) return '';

    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);

    if (ndx < 0) return '';

    const subBody = body.slice(ndx + functionStart.length - 1);
    return `var ${functionName}=${new Utils().cutAfterJSON(subBody)}`;
}
//====================== ====================== ====================== ======================
/**
 * @description Вырезаем Decipher
 * @param body {string} Страничка
 * @param functions {string[]} данные youtube htmlPlayer
 */
function extractDecipher(body: string, functions: string[]): void {
    const functionName = new Utils().between(body, `a.set("alr","yes");c&&(c=`, `(decodeURIC`);

    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);

        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            let functionBody = `var ${functionStart}${new Utils().cutAfterJSON(subBody)}`;
            functionBody = `${extractManipulations(functionBody, body)};${functionBody};${functionName}(sig);`;
            functions.push(functionBody);
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Вырезаем параметр n
 * @param body {string} Страничка
 * @param functions {string[]} данные youtube htmlPlayer
 */
function extractNCode(body: string, functions: string[]): void {
    let functionName = new Utils().between(body, `&&(b=a.get("n"))&&(b=`, `(b)`);

    if (functionName.includes('[')) functionName = new Utils().between(body, `${functionName.split('[')[0]}=[`, `]`);
    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);

        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            const functionBody = `var ${functionStart}${new Utils().cutAfterJSON(subBody)};${functionName}(ncode);`;
            functions.push(functionBody);
        }
    }
}