"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSignature = void 0;
const tslib_1 = require("tslib");
const node_url_1 = require("node:url");
const Queue_1 = require("@Queue/Queue");
const querystring = tslib_1.__importStar(require("querystring"));
const _httpsClient_1 = require("@httpsClient");
const vm = tslib_1.__importStar(require("vm"));
function extractSignature(formats, html5player) {
    const sortingQuality = formats.filter((format) => (format.mimeType?.match(/opus/) || format?.mimeType?.match(/audio/)) && format.bitrate > 100);
    return new Promise(async (resolve) => {
        if (sortingQuality?.length && sortingQuality[0]?.url)
            return resolve(sortingQuality[0]);
        try {
            const functions = await extractFunctions(html5player);
            const decipherScript = functions.length ? new vm.Script(functions[0]) : null;
            const nTransformScript = functions.length > 1 ? new vm.Script(functions[1]) : null;
            for (const format of sortingQuality) {
                const url = setDownloadURL(format, decipherScript, nTransformScript);
                if (!url)
                    sortingQuality.shift();
                else {
                    format.url = url;
                    break;
                }
            }
        }
        catch (e) {
            const tokens = parseTokens(await _httpsClient_1.httpsClient.parseBody(html5player));
            for (const format of sortingQuality) {
                const url = setDownload(format, tokens);
                if (!url)
                    sortingQuality.shift();
                else {
                    format.url = url;
                    break;
                }
            }
        }
        return resolve(sortingQuality[0]);
    });
}
exports.extractSignature = extractSignature;
async function extractFunctions(html5Link) {
    const body = await _httpsClient_1.httpsClient.parseBody(html5Link), functions = [];
    if (!body)
        return;
    const decipherName = body.split(`a.set("alr","yes");c&&(c=`)[1].split(`(decodeURIC`)[0];
    let ncodeName = body.split(`&&(b=a.get("n"))&&(b=`)[1].split(`(b)`)[0];
    if (decipherName && decipherName.length) {
        const functionStart = `${decipherName}=function(a)`;
        const ndx = body.indexOf(functionStart);
        if (ndx >= 0) {
            let functionBody = `var ${functionStart}${cutAfterJS(body.slice(ndx + functionStart.length))}`;
            functions.push(`${extractManipulations(functionBody, body)};${functionBody};${decipherName}(sig);`);
        }
    }
    if (ncodeName.includes('['))
        ncodeName = body.split(`${ncodeName.split('[')[0]}=[`)[1].split(`]`)[0];
    if (ncodeName && ncodeName.length) {
        const functionStart = `${ncodeName}=function(a)`;
        const ndx = body.indexOf(functionStart);
        if (ndx >= 0)
            functions.push(`var ${functionStart}${cutAfterJS(body.slice(ndx + functionStart.length))};${ncodeName}(ncode);`);
    }
    if (!functions || !functions.length)
        return;
    return functions;
}
function extractManipulations(caller, body) {
    const functionName = caller.split(`a=a.split("");`)[1].split(".")[0];
    if (!functionName)
        return '';
    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);
    if (ndx < 0)
        return '';
    return `var ${functionName}=${cutAfterJS(body.slice(ndx + functionStart.length - 1))}`;
}
function setDownloadURL(format, decipherScript, nTransformScript) {
    const url = format.signatureCipher || format.cipher;
    if (url && decipherScript && !format.url) {
        const decipher = _decipher(url, decipherScript);
        if (nTransformScript)
            return _ncode(decipher, nTransformScript);
        return decipher;
    }
    else {
        if (nTransformScript)
            return _ncode(format.url, nTransformScript);
    }
}
function _decipher(url, decipherScript) {
    const extractUrl = querystring.parse(url);
    return `${decodeURIComponent(extractUrl.url)}&${extractUrl.sp}=${decipherScript.runInNewContext({ sig: decodeURIComponent(extractUrl.s) })}`;
}
function _ncode(url, nTransformScript) {
    const components = new node_url_1.URL(url);
    const n = components.searchParams.get('n');
    if (!n)
        return url;
    components.searchParams.set('n', nTransformScript.runInNewContext({ ncode: n }));
    return components.toString();
}
function cutAfterJS(mixedJson) {
    let open, close;
    if (mixedJson[0] === '[') {
        open = '[';
        close = ']';
    }
    else if (mixedJson[0] === '{') {
        open = '{';
        close = '}';
    }
    if (!open)
        throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);
    let counter = 0, isEscaped = false, isEscapedObject = null;
    for (let i = 0; i < mixedJson.length; i++) {
        if (!isEscaped && isEscapedObject !== null && mixedJson[i] === isEscapedObject.end) {
            isEscapedObject = null;
            continue;
        }
        else if (!isEscaped && isEscapedObject === null) {
            for (const escaped of ESCAPING_SEGMENT) {
                if (mixedJson[i] !== escaped.start)
                    continue;
                if (!escaped.startPrefix || mixedJson.substring(i - 10, i).match(escaped.startPrefix)) {
                    isEscapedObject = escaped;
                    break;
                }
            }
            if (isEscapedObject !== null)
                continue;
        }
        isEscaped = mixedJson[i] === '\\' && !isEscaped;
        if (isEscapedObject !== null)
            continue;
        if (mixedJson[i] === open)
            counter++;
        else if (mixedJson[i] === close)
            counter--;
        if (counter === 0)
            return mixedJson.substring(0, i + 1);
    }
    throw Error("Can't cut unsupported JSON (no matching closing bracket found)");
}
const var_js = '[a-zA-Z_\\$]\\w*';
const singleQuote = `'[^'\\\\]*(:?\\\\[\\s\\S][^'\\\\]*)*'`;
const duoQuote = `"[^"\\\\]*(:?\\\\[\\s\\S][^"\\\\]*)*"`;
const quote_js = `(?:${singleQuote}|${duoQuote})`;
const key_js = `(?:${var_js}|${quote_js})`;
const prop_js = `(?:\\.${var_js}|\\[${quote_js}\\])`;
const empty_js = `(?:''|"")`;
const reverse_function = ':function\\(a\\)\\{' + '(?:return )?a\\.reverse\\(\\)' + '\\}';
const slice_function = ':function\\(a,b\\)\\{' + 'return a\\.slice\\(b\\)' + '\\}';
const splice_function = ':function\\(a,b\\)\\{' + 'a\\.splice\\(0,b\\)' + '\\}';
const swap_function = ':function\\(a,b\\)\\{' +
    'var c=a\\[0\\];a\\[0\\]=a\\[b(?:%a\\.length)?\\];a\\[b(?:%a\\.length)?\\]=c(?:;return a)?' +
    '\\}';
const obj_regexp = new RegExp(`var (${var_js})=\\{((?:(?:${key_js}${reverse_function}|${key_js}${slice_function}|${key_js}${splice_function}|${key_js}${swap_function}),?\\r?\\n?)+)};`);
const function_regexp = new RegExp(`${`function(?: ${var_js})?\\(a\\)\\{` + `a=a\\.split\\(${empty_js}\\);\\s*` + `((?:(?:a=)?${var_js}`}${prop_js}\\(a,\\d+\\);)+)` +
    `return a\\.join\\(${empty_js}\\)` +
    `\\}`);
const reverse_regexp = new RegExp(`(?:^|,)(${key_js})${reverse_function}`, 'm');
const slice_regexp = new RegExp(`(?:^|,)(${key_js})${slice_function}`, 'm');
const splice_regexp = new RegExp(`(?:^|,)(${key_js})${splice_function}`, 'm');
const swap_regexp = new RegExp(`(?:^|,)(${key_js})${swap_function}`, 'm');
const ESCAPING_SEGMENT = [
    { start: '"', end: '"' },
    { start: "'", end: "'" },
    { start: '`', end: '`' },
    { start: '/', end: '/', startPrefix: /(^|[[{:;,])\s?$/ }
];
function DecodeSignature(tokens, signature) {
    let sig = signature.split("");
    for (const token of tokens) {
        let position;
        const nameToken = token.slice(2);
        switch (token.slice(0, 2)) {
            case "sw": {
                position = parseInt(nameToken);
                (0, Queue_1.swapPositions)(sig, position);
                break;
            }
            case "sl": {
                position = parseInt(nameToken);
                sig = sig.slice(position);
                break;
            }
            case "sp": {
                position = parseInt(nameToken);
                sig.splice(0, position);
                break;
            }
            case "rv": {
                sig.reverse();
                break;
            }
        }
    }
    return sig.join("");
}
function parseTokens(page) {
    const funAction = function_regexp.exec(page);
    const objAction = obj_regexp.exec(page);
    if (!funAction || !objAction)
        return null;
    const object = objAction[1].replace(/\$/g, '\\$');
    const objPage = objAction[2].replace(/\$/g, '\\$');
    const funPage = funAction[1].replace(/\$/g, '\\$');
    let result, tokens = [], keys = [];
    [reverse_regexp, slice_regexp, splice_regexp, swap_regexp].forEach((res) => {
        result = res.exec(objPage);
        keys.push(replacer(result));
    });
    const parsedKeys = `(${keys.join('|')})`;
    const tokenizeRegexp = new RegExp(`(?:a=)?${object}(?:\\.${parsedKeys}|\\['${parsedKeys}'\\]|\\["${parsedKeys}"\\])` + `\\(a,(\\d+)\\)`, 'g');
    while ((result = tokenizeRegexp.exec(funPage)) !== null) {
        (() => {
            const key = result[1] || result[2] || result[3];
            switch (key) {
                case keys[0]: return tokens.push('rv');
                case keys[1]: return tokens.push(`sl${result[4]}`);
                case keys[2]: return tokens.push(`sp${result[4]}`);
                case keys[3]: return tokens.push(`sw${result[4]}`);
            }
        })();
    }
    return tokens;
}
function replacer(res) {
    return res && res[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, '');
}
function setDownload(format, tokens) {
    const cipher = format.signatureCipher || format.cipher;
    if (cipher) {
        const params = Object.fromEntries(new node_url_1.URLSearchParams(cipher));
        Object.assign(format, params);
        delete format.signatureCipher;
        delete format.cipher;
    }
    if (tokens && format.s && format.url) {
        const signature = DecodeSignature(tokens, format.s);
        const Url = new node_url_1.URL(decodeURIComponent(format.url));
        Url.searchParams.set('ratebypass', 'yes');
        if (signature)
            Url.searchParams.set(format.sp || 'signature', signature);
        return Url.toString();
    }
    return null;
}
