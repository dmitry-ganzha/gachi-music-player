import {httpsClient} from "../../httpsClient";
import * as vm from "vm";
import querystring from "node:querystring";

/**
 * @author ytdl-core (https://github.com/fent/node-ytdl-core)
 * @description Немного изменил под свои нужны
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

        formats.forEach((format: YouTubeFormat, index: number) => {
            //Если нет decipherScript или nTransformScript, то этот формат невозможно расшифровать
            if (!decipherScript || !nTransformScript) {
                formats.splice(index, 1);
                return;
            }
            setDownloadURL(format, decipherScript, nTransformScript); //Расшифровываем формат
        });

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
            headers: {
                "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                "accept-encoding": "gzip, deflate, br"
            }
        }
    }).then((body: string) => {
        const functions = extractFunctions(body);

        if (!functions || !functions?.length) return null;
        return functions;
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
    const decipher = () => {
        const args = querystring.parse(url) as { url: string, sp: string, s: string };
        if (!args.s || !decipherScript) return args.url;

        const components = new URL(decodeURIComponent(args.url));
        components.searchParams.set(args.sp ?? "signature", decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));

        return components.toString();
    };
    const EncodeCode = (url: string) => {
        const components = new URL(decodeURIComponent(url));
        const n = components.searchParams.get("n");

        if (!n || !nTransformScript) return url;

        components.searchParams.set("n", nTransformScript.runInNewContext({ ncode: n }));
        return components.toString();
    };

    format.url = !format.url ? EncodeCode(decipher()) : EncodeCode(url);
    delete format.signatureCipher;
    delete format.cipher;
}
//====================== ====================== ====================== ======================
/**
 * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
 * @param body {string} Страничка
 */
function extractFunctions(body: string): string[] {
    const functions: string[] = [];
    const extractDecipher = () => {
        const functionName = body.split("a.set(\"alr\",\"yes\");c&&(c=")[1].split("(decodeURIC")[0];

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
    };
    const extractNCode = () => {
        let functionName = body.split("&&(b=a.get(\"n\"))&&(b=")[1].split("(b)")[0];

        if (functionName.includes('[')) functionName = body.split(`${functionName.split("[")[0]}=[`)[1].split("]")[0];
        if (functionName && functionName.length) {
            const functionStart = `${functionName}=function(a)`;
            const ndx = body.indexOf(functionStart);

            if (ndx >= 0) {
                const subBody = body.slice(ndx + functionStart.length);
                functions.push(`var ${functionStart}${cutAfterJSON(subBody)};${functionName}(ncode);`);
            }
        }
    };

    extractDecipher();
    extractNCode();
    return functions;
}
//====================== ====================== ====================== ======================
/**
 * @description Извлекает действия, которые необходимо предпринять для расшифровки подписи и преобразования параметра n.
 * @param caller {string} Данные
 * @param body {string} Страничка
 */
function extractManipulations(caller: string, body: string): string {
    const functionName = caller.split("a=a.split(\"\");")[1].split(".")[0];
    if (!functionName) return '';

    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);

    if (ndx <= 0) return "";

    const subBody = body.slice(ndx + functionStart.length - 1);
    return `var ${functionName}=${cutAfterJSON(subBody)}`;
}
//====================== ====================== ====================== ======================
/**
 * @description Функция ytdl-core
 * @param mixedJson {string[] | string} точно не понял
 */
function cutAfterJSON(mixedJson: string) {
    let open, close;
    if (mixedJson[0] === '[') {open = "["; close = "]"}
    else if (mixedJson[0] === '{') {open = "{"; close = "}"}
    if (!open) throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);

    let isString = false, isEscaped = false, counter = 0;

    for (let i = 0; i < mixedJson.length; i++) {
        if (mixedJson[i] === '"' && !isEscaped) {
            isString = !isString;
            continue;
        }

        isEscaped = mixedJson[i] === '\\' && !isEscaped;

        if (isString) continue;

        if (mixedJson[i] === open) counter++;
        else if (mixedJson[i] === close) counter--;

        if (counter === 0) return mixedJson.substring(0, i + 1);
    }

    // We ran through the whole string and ended up with an unclosed bracket
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
interface Script extends vm["Script"] {
    runInNewContext(param: { sig?: string, ncode?: string }): string;
}