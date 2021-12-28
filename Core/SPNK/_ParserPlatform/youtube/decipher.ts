import * as querystring from "node:querystring";
import {Utils} from "./Utils";
import * as vm from "node:vm";
import {httpsClient} from "./https";

interface formatOptions {
    url?: string;
    sp?: string;
    signatureCipher?: string;
    cipher?: string;
    s?: string;
}

/**
 * @param html5player {string} link player
 */
async function getFunctions(html5player: string) {
    const body = await new httpsClient(html5player)._parseBody();
    const functions = await extractFunctions(body);

    return !functions || !functions.length ? null : functions;
}
/**
 * @param body {string} page
 */
async function extractFunctions (body: string) {
    const functions = [];
    const extractManipulations = async (caller: any) => {
        const functionName = new Utils().between(caller, `a=a.split("");`, `.`);
        if (!functionName) return '';
        const functionStart = `var ${functionName}={`;
        const ndx = body.indexOf(functionStart);
        if (ndx < 0) return '';
        const subBody = body.slice(ndx + functionStart.length - 1);
        return `var ${functionName}=${new Utils().cutAfterJSON(subBody)}`;
    };
    const extractDecipher = async () => {
        const functionName = new Utils().between(body, `a.set("alr","yes");c&&(c=`, `(decodeURIC`);
        if (functionName && functionName.length) {
            const functionStart = `${functionName}=function(a)`;
            const ndx = body.indexOf(functionStart);
            if (ndx >= 0) {
                const subBody = body.slice(ndx + functionStart.length);
                let functionBody = `var ${functionStart}${new Utils().cutAfterJSON(subBody)}`;
                functionBody = `${await extractManipulations(functionBody)};${functionBody};${functionName}(sig);`;
                functions.push(functionBody);
            }
        }
    };
    const extractNCode = async () => {
        const functionName = new Utils().between(body, `&&(b=a.get("n"))&&(b=`, `(b)`);
        if (functionName && functionName.length) {
            const functionStart = `${functionName}=function(a)`;
            const ndx = body.indexOf(functionStart);
            if (ndx >= 0) {
                const subBody = body.slice(ndx + functionStart.length);
                const functionBody = `var ${functionStart}${new Utils().cutAfterJSON(subBody)};${functionName}(ncode);`;
                functions.push(functionBody);
            }
        }
    };
    await extractDecipher();
    await extractNCode();
    return functions;
}

/**
 * @param format {formatOptions} youtube format
 * @param decipherScript {vm.Script}
 * @param nTransformScript {vm.Script}
 */
async function setDownloadURL (format: formatOptions, decipherScript: any, nTransformScript: any) {
    const decipher = async (url: string) => {
        const args = querystring.parse(url) as { url: string, sp: string, s: string };
        if (!args.s || !decipherScript) return args.url;

        const components = new URL(decodeURIComponent(args.url));
        components.searchParams.set(args.sp ? args.sp : 'signature', decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));
        return components.toString();
    };
    const EncodeCode = async (url: string | any) => {
        const components = new URL(decodeURIComponent(url));
        const n = components.searchParams.get('n');
        if (!n || !nTransformScript) return url;
        components.searchParams.set('n', nTransformScript.runInNewContext({ ncode: n }));
        return components.toString();
    };
    const url = format.url || format.signatureCipher || format.cipher;
    format.url = !format.url ? await EncodeCode(await decipher(url)) : await EncodeCode(url);
    delete format.signatureCipher;
    delete format.cipher;
}

/**
 * @param formats {Array.<Object>} all formats
 * @param html5player {string} link player
 */
export async function decipherFormats(formats: formatOptions[], html5player: string) {
    let functions = await getFunctions(html5player);

    const decipherScript = functions.length ? new vm.Script(functions[0]) : null;
    const nTransformScript = functions.length > 1 ? new vm.Script(functions[1]) : null;
    formats.forEach((format: formatOptions) => setDownloadURL(format, decipherScript, nTransformScript));
    return formats;
}