import {httpsClient} from "./https";

export class Utils {
    public RequestExp = async (url: string, options: object = {}) => new httpsClient(url)._parseBody({...options, ...(process.env.YTcookie !== undefined ? {headers: {'cookie': process.env.YTcookie}} : {})}).then(async (body: string) => !body ? null : body);
    public _FindOpusFormat = async (formats: any[]) => formats.length >= 1 ? formats.filter(f => f.acodec === 'opus' || !f.fps)[0] : null;
    public FindPlayer = (body: string) => body.split('var ytInitialPlayerResponse = ')?.[1]?.split(';</script>')[0].split(/;\s*(var|const|let)/)[0];
    public getID = (url: string) => {
        if (typeof url !== 'string') return 'Url is not string';
        let _parseUrl = new URL(url);

        if (_parseUrl.searchParams.get('v')) return _parseUrl.searchParams.get('v');
        else if (_parseUrl.searchParams.get('list')) return _parseUrl.searchParams.get('list');
        return new URL(url).pathname.split('/')[1];
    }


    public between = (haystack: string, left: any, right: any) => {
        let pos;
        if (left instanceof RegExp) {
            const match = haystack.match(left);
            if (!match) { return ''; }
            pos = match.index + match[0].length;
        } else {
            pos = haystack.indexOf(left);
            if (pos === -1) { return ''; }
            pos += left.length;
        }
        haystack = haystack.slice(pos);
        pos = haystack.indexOf(right);
        if (pos === -1) { return ''; }
        haystack = haystack.slice(0, pos);
        return haystack;
    };
    public cutAfterJSON = (mixedJson: string) => {
        let open, close;
        if (mixedJson[0] === '[') {
            open = '[';
            close = ']';
        } else if (mixedJson[0] === '{') {
            open = '{';
            close = '}';
        }

        if (!open) throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);

        let isString = false;
        let isEscaped = false;
        let counter = 0;

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
        throw Error("Can't cut unsupported JSON (no matching closing bracket found)");    }
}