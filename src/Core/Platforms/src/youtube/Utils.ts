export class Utils {
    /**
     * @description Получаем ID
     * @param url {string} Ссылка
     * @param isPlaylist {boolean} Это плейлист
     */
    public getID = (url: string, isPlaylist = false) => {
        if (typeof url !== 'string') return 'Url is not string';
        let _parseUrl = new URL(url);

        if (_parseUrl.searchParams.get('list') && isPlaylist) return _parseUrl.searchParams.get('list');
        else if (_parseUrl.searchParams.get('v') && !isPlaylist) return _parseUrl.searchParams.get('v');
        return _parseUrl.pathname.split('/')[1];
    };
    /**
     * @description Функция ytdl-core
     * @param haystack {string} точно не понял
     * @param left {string | RegExpConstructor} точно не понял
     * @param right {string} точно не понял
     */
    public between = (haystack: string, left: string | RegExpConstructor, right: string) => {
        let pos;

        if (left instanceof RegExp) {
            const match = haystack.match(left);
            if (!match) return '';
            pos = match.index + match[0].length;
        } else {
            pos = haystack.indexOf(left as string);
            if (pos === -1) return '';
            pos += left.length;
        }

        haystack = haystack.slice(pos);
        pos = haystack.indexOf(right);

        if (pos === -1) return '';

        haystack = haystack.slice(0, pos);
        return haystack;
    };
    /**
     * @description Функция ytdl-core
     * @param mixedJson {string[] | string} точно не понял
     */
    public cutAfterJSON = (mixedJson: string[] | string) => {
        let open, close, isString, isEscaped, counter = 0;

        if (mixedJson[0] === '[') {
            open = '[';
            close = ']';
        }
        else if (mixedJson[0] === '{') {
            open = '{';
            close = '}';
        }

        if (!open) throw new Error(`Can't cut unsupported JSON (need to begin with [ or { ) but got: ${mixedJson[0]}`);

        for (let i = 0; i < mixedJson.length; i++) {
            if (mixedJson[i] === '"' && !isEscaped) {
                isString = !isString;
                continue;
            }
            isEscaped = mixedJson[i] === '\\' && !isEscaped;

            if (isString) continue;

            if (mixedJson[i] === open) counter++;
            else if (mixedJson[i] === close) counter--;
            if (counter === 0) return (mixedJson as string).substring(0, i + 1);
        }
        throw Error("Can't cut unsupported JSON (no matching closing bracket found)");
    };
}