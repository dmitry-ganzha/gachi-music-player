import {URL, URLSearchParams} from 'node:url';
import {httpsClient} from "../../../Core/httpsClient";

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

// RegExp for various js functions
const var_js = '[a-zA-Z_\\$]\\w*';
const singleQuote = `'[^'\\\\]*(:?\\\\[\\s\\S][^'\\\\]*)*'`;
const duobleQuote = `"[^"\\\\]*(:?\\\\[\\s\\S][^"\\\\]*)*"`;
const quote_js = `(?:${singleQuote}|${duobleQuote})`;
const key_js = `(?:${var_js}|${quote_js})`;
const prop_js = `(?:\\.${var_js}|\\[${quote_js}\\])`;
const empty_js = `(?:''|"")`;
const reverse_function = ':function\\(a\\)\\{' + '(?:return )?a\\.reverse\\(\\)' + '\\}';
const slice_function = ':function\\(a,b\\)\\{' + 'return a\\.slice\\(b\\)' + '\\}';
const splice_function = ':function\\(a,b\\)\\{' + 'a\\.splice\\(0,b\\)' + '\\}';
const swap_function =
    ':function\\(a,b\\)\\{' +
    'var c=a\\[0\\];a\\[0\\]=a\\[b(?:%a\\.length)?\\];a\\[b(?:%a\\.length)?\\]=c(?:;return a)?' +
    '\\}';
const obj_regexp = new RegExp(
    `var (${var_js})=\\{((?:(?:${key_js}${reverse_function}|${key_js}${slice_function}|${key_js}${splice_function}|${key_js}${swap_function}),?\\r?\\n?)+)};`
);
const function_regexp = new RegExp(
    `${
        `function(?: ${var_js})?\\(a\\)\\{` + `a=a\\.split\\(${empty_js}\\);\\s*` + `((?:(?:a=)?${var_js}`
    }${prop_js}\\(a,\\d+\\);)+)` +
    `return a\\.join\\(${empty_js}\\)` +
    `\\}`
);
const reverse_regexp = new RegExp(`(?:^|,)(${key_js})${reverse_function}`, 'm');
const slice_regexp = new RegExp(`(?:^|,)(${key_js})${slice_function}`, 'm');
const splice_regexp = new RegExp(`(?:^|,)(${key_js})${splice_function}`, 'm');
const swap_regexp = new RegExp(`(?:^|,)(${key_js})${swap_function}`, 'm');


export namespace Decipher {
    /**
     * @description Изменение форматов перед их использованием
     * @param formats {YouTubeFormat[]} YouTube форматы
     * @param html5player {string} Страница html5player
     */
    export async function parseFormats(formats: YouTubeFormat[], html5player: string) {
        const body = await httpsClient.parseBody(html5player); //Берем html5player страницу
        const tokens = parseTokens(body);

        formats.forEach((format) => {
            const cipher = format.signatureCipher || format.cipher;

            if (cipher) {
                const params = Object.fromEntries(new URLSearchParams(cipher));
                Object.assign(format, params);
                delete format.signatureCipher;
                delete format.cipher;
            }

            if (tokens && format.s && format.url) {
                const signature = DecodeSignature(tokens, format.s);
                const Url = new URL(decodeURIComponent(format.url));
                Url.searchParams.set('ratebypass', 'yes');

                if (signature) Url.searchParams.set(format.sp || 'signature', signature);
                format.url = Url.toString();

                delete format.s;
                delete format.sp;
            } else {
                const index = formats.indexOf(format);
                if (index > 0) formats.splice(index, 1);
            }
        });

        return formats;
    }
}

/**
 * @description Проводим некоторые манипуляции с signature
 * @param tokens {string[]}
 * @param signature {string}
 */
function DecodeSignature(tokens: string[], signature: string) {
    let sig = signature.split("");

    tokens.forEach((token) => {
        let pos: number;

        switch (token.slice(0, 2)) {
            case 'sw':
                pos = parseInt(token.slice(2));
                swapPositions(sig, pos);
                break;
            case 'rv':
                sig.reverse();
                break;
            case 'sl':
                pos = parseInt(token.slice(2));
                sig = sig.slice(pos);
                break;
            case 'sp':
                pos = parseInt(token.slice(2));
                sig.splice(0, pos);
                break;
        }
    });
    return sig.join("");
}

function swapPositions(array: string[], position: number) {
    const first = array[0];
    array[0] = array[position];
    array[position] = first;
}

/**
 * @description Берем данные с youtube html5player
 * @param page {string} Страница html5player
 */
function parseTokens(page: string): string[] {
    const funAction = function_regexp.exec(page);
    const objAction = obj_regexp.exec(page);

    if (!funAction || !objAction) return null;

    const object = objAction[1].replace(/\$/g, '\\$');
    const objPage = objAction[2].replace(/\$/g, '\\$');
    const funPage = funAction[1].replace(/\$/g, '\\$');

    let result: RegExpExecArray, tokens: string[] = [], keys: string[] = [];

    [reverse_regexp, slice_regexp, splice_regexp, swap_regexp].forEach((res) => (result = res.exec(objPage), keys.push(replacer(result))));

    const parsedKeys = `(${keys.join('|')})`;
    const tokenizeRegexp = new RegExp(`(?:a=)?${object}(?:\\.${parsedKeys}|\\['${parsedKeys}'\\]|\\["${parsedKeys}"\\])` + `\\(a,(\\d+)\\)`, 'g');

    while ((result = tokenizeRegexp.exec(funPage)) !== null) {
        (() => {
            const key = result[1] || result[2] || result[3];
            switch (key) {
                case keys[3]:
                    return tokens.push(`sw${result[4]}`);
                case keys[0]:
                    return tokens.push('rv');
                case keys[1]:
                    return tokens.push(`sl${result[4]}`);
                case keys[2]:
                    return tokens.push(`sp${result[4]}`);
            }
        })();
    }
    return tokens;
}

/**
 * @description Уменьшаем кол-во кода
 * @param res {RegExpExecArray}
 */
function replacer(res: RegExpExecArray) {
    return res && res[1].replace(/\$/g, '\\$').replace(/\$|^'|^"|'$|"$/g, '');
}