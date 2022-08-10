import {httpsClient} from "../../httpsClient";
import * as vm from "vm";
import * as querystring from "querystring";

/**
 * @author ytdl-core (https://github.com/fent/node-ytdl-core)
 */
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
        options: { userAgent: true },
        request: {
            method: "GET",
            headers: {
                "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                "accept-encoding": "gzip, deflate, br"
            }
        }
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
    components.searchParams.set(args.sp ? args.sp : "signature", decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));
    return components.toString();
}
function EncodeCode(url: string, nTransformScript: Script): string {
    const components = new URL(decodeURIComponent(url));
    const n = components.searchParams.get("n");

    if (!n || !nTransformScript) return url;

    components.searchParams.set("n", nTransformScript.runInNewContext({ ncode: n }));
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
    const functionName = between(caller, "a=a.split(\"\");", ".");
    if (!functionName) return '';

    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);

    if (ndx < 0) return "";

    const subBody = body.slice(ndx + functionStart.length - 1);
    return `var ${functionName}=${cutAfterJSON(subBody)}`;
}
//====================== ====================== ====================== ======================
/**
 * @description Вырезаем Decipher
 * @param body {string} Страничка
 * @param functions {string[]} данные youtube htmlPlayer
 */
function extractDecipher(body: string, functions: string[]): void {
    const functionName = between(body, "a.set(\"alr\",\"yes\");c&&(c=", "(decodeURIC");

    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);

        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            let functionBody = `var ${functionStart}${cutAfterJSON(subBody)}`;
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
    let functionName = between(body, "&&(b=a.get(\"n\"))&&(b=", "(b)");

    if (functionName.includes('[')) functionName = between(body, `${functionName.split("[")[0]}=[`, "]");
    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);

        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            const functionBody = `var ${functionStart}${cutAfterJSON(subBody)};${functionName}(ncode);`;
            functions.push(functionBody);
        }
    }
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Функция ytdl-core
 * @param haystack {string} точно не понял
 * @param left {string | RegExpConstructor} точно не понял
 * @param right {string} точно не понял
 */
function between(haystack: string, left: string | RegExpConstructor, right: string) {
    let pos;

    if (left instanceof RegExp) {
        const match = haystack.match(left);
        if (!match) return "";
        pos = match.index + match[0].length;
    } else {
        pos = haystack.indexOf(left as string);
        if (pos === -1) return "";
        pos += left.length;
    }

    haystack = haystack.slice(pos);
    pos = haystack.indexOf(right);

    if (pos === -1) return "";

    haystack = haystack.slice(0, pos);
    return haystack;
}
//====================== ====================== ====================== ======================
/**
 * @description Функция ytdl-core
 * @param mixedJson {string[] | string} точно не понял
 */
function cutAfterJSON(mixedJson: string[] | string) {
    let open, close, isString, isEscaped, counter = 0;

    if (mixedJson[0] === "[") {
        open = "[";
        close = "]";
    }
    else if (mixedJson[0] === "{") {
        open = "{";
        close = "}";
    }

    if (!open) throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);

    for (let i = 0; i < mixedJson.length; i++) {
        if (mixedJson[i] === "\"" && !isEscaped) {
            isString = !isString;
            continue;
        }
        isEscaped = mixedJson[i] === "\\" && !isEscaped;

        if (isString) continue;

        if (mixedJson[i] === open) counter++;
        else if (mixedJson[i] === close) counter--;
        if (counter === 0) return (mixedJson as string).substring(0, i + 1);
    }
    throw Error("Can't cut unsupported JSON (no matching closing bracket found)");
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

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
    mimeType?: string;
}
/**
 * @description vm<Script>
 */
// @ts-ignore
interface Script extends vm<Script> {
    runInNewContext(param: { sig?: string, ncode?: string }): string;
}