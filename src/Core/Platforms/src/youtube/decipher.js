"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decipher = void 0;
const node_querystring_1 = __importDefault(require("node:querystring"));
const Utils_1 = require("./Utils");
const vm_1 = __importDefault(require("vm"));
const httpsClient_1 = require("../../../httpsClient");
function Decipher(formats, html5player) {
    return getFunctions(html5player).then((functions) => {
        const decipherScript = functions.length ? new vm_1.default.Script(functions[0]) : null;
        const nTransformScript = functions.length > 1 ? new vm_1.default.Script(functions[1]) : null;
        formats.forEach((format) => setDownloadURL(format, decipherScript, nTransformScript));
        return formats;
    });
}
exports.Decipher = Decipher;
function getFunctions(html5player) {
    return httpsClient_1.httpsClient.parseBody(html5player, {
        request: { method: "GET" },
        options: { zLibEncode: true, userAgent: true }
    }).then((body) => {
        const functions = extractFunctions(body);
        return !functions || !functions.length ? null : functions;
    });
}
function setDownloadURL(format, decipherScript, nTransformScript) {
    const url = format.url ?? format.signatureCipher ?? format.cipher;
    format.url = !format.url ? EncodeCode(_decipher(url, decipherScript), nTransformScript) : EncodeCode(url, nTransformScript);
    delete format.signatureCipher;
    delete format.cipher;
}
function _decipher(url, decipherScript) {
    const args = node_querystring_1.default.parse(url);
    if (!args.s || !decipherScript)
        return args.url;
    const components = new URL(decodeURIComponent(args.url));
    components.searchParams.set(args.sp ? args.sp : 'signature', decipherScript.runInNewContext({ sig: decodeURIComponent(args.s) }));
    return components.toString();
}
function EncodeCode(url, nTransformScript) {
    const components = new URL(decodeURIComponent(url));
    const n = components.searchParams.get('n');
    if (!n || !nTransformScript)
        return url;
    components.searchParams.set('n', nTransformScript.runInNewContext({ ncode: n }));
    return components.toString();
}
function extractFunctions(body) {
    const functions = [];
    extractDecipher(body, functions);
    extractNCode(body, functions);
    return functions;
}
function extractManipulations(caller, body) {
    const functionName = new Utils_1.Utils().between(caller, `a=a.split("");`, `.`);
    if (!functionName)
        return '';
    const functionStart = `var ${functionName}={`;
    const ndx = body.indexOf(functionStart);
    if (ndx < 0)
        return '';
    const subBody = body.slice(ndx + functionStart.length - 1);
    return `var ${functionName}=${new Utils_1.Utils().cutAfterJSON(subBody)}`;
}
function extractDecipher(body, functions) {
    const functionName = new Utils_1.Utils().between(body, `a.set("alr","yes");c&&(c=`, `(decodeURIC`);
    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);
        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            let functionBody = `var ${functionStart}${new Utils_1.Utils().cutAfterJSON(subBody)}`;
            functionBody = `${extractManipulations(functionBody, body)};${functionBody};${functionName}(sig);`;
            functions.push(functionBody);
        }
    }
}
function extractNCode(body, functions) {
    let functionName = new Utils_1.Utils().between(body, `&&(b=a.get("n"))&&(b=`, `(b)`);
    if (functionName.includes('['))
        functionName = new Utils_1.Utils().between(body, `${functionName.split('[')[0]}=[`, `]`);
    if (functionName && functionName.length) {
        const functionStart = `${functionName}=function(a)`;
        const ndx = body.indexOf(functionStart);
        if (ndx >= 0) {
            const subBody = body.slice(ndx + functionStart.length);
            const functionBody = `var ${functionStart}${new Utils_1.Utils().cutAfterJSON(subBody)};${functionName}(ncode);`;
            functions.push(functionBody);
        }
    }
}
