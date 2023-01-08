import {InputPlaylist, InputTrack} from "@Queue/Song";
import {DurationUtils} from "@Managers/DurationUtils";
import {httpsClient} from "@httpsClient";

/**
 * @description У yandex.music странная система времени делаем ее нормальной
 * @param duration {string} Исходное время yandex.music
 */
function parseDuration(duration: string): string { //duration PT00H03M48S
    const parsedDuration = duration.split("PT")[1].replace(/[H,M]/gi, ":").split("S")[0];
    return `${DurationUtils.ParsingTimeToNumber(parsedDuration)}`;
}

namespace API {
    /**
     * @description Делаем запрос на сайт yandex.music, и парсим страницу
     * @param url {string} Ссылка на объект
     * @param isFull {boolean} Нужны полные данные (используется только в SearchTracks)
     * @constructor
     */
    export function Request(url: string, isFull: boolean = false): Promise<Error | any> {
        return new Promise(async (resolve) => {
            const body = await httpsClient.parseBody(url, { request: { headers: { "accept-encoding": "gzip, deflate, br" }}});

            if (!isFull) {
                const LightInfo = body.split("/><script class=\"light-data\" type=\"application/ld+json\" nonce=\"")[1].split("\" >")[1].split("</script><link href=\"/index.css?v=")[0];

                if (!LightInfo) return resolve(Error("Not found information"));
                return resolve(JSON.parse(LightInfo));
            }
            const Full = body.split("\">var Mu=")[1]?.split(";</script><script src=\"https:")[0];

            if (!Full) return resolve(Error("Not found information"));
            return resolve(JSON.parse(Full).pageData);
        });
    }
}

export namespace YandexMusic {
    /**
     * @description Получаем данные о треке на YM
     * @param url {string} Ссылка на yandex music track
     */
    export function getTrack(url: string): Promise<InputTrack> {
        return new Promise(async (resolve) => {
            const result = await API.Request(url);

            if (result instanceof Error) return resolve(null);

            return resolve({
                url, title: result.name,
                author: await getAuthor(result.byArtist.url),
                image: {url: result.inAlbum?.image},
                duration: { seconds: parseDuration(result.duration) }
            });
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем данные об альбоме
     * @param url {string} Ссылка на альбом
     */
    export function getAlbum(url: string): Promise<InputPlaylist> {
        return new Promise(async (resolve) => {
            const result = await API.Request(url);

            if (result instanceof Error) return resolve(null);

            const Image = result?.image;
            const MainArtist = await getAuthor(result.byArtist.url)

            return resolve({
                url, title: result.name,
                image: {url: Image},
                author: MainArtist,
                items: result.track.map((track: any) => {
                    return {
                        url: track.url,
                        title: track.name,
                        author: MainArtist,
                        image: {url: Image},
                        duration: {seconds: parseDuration(track.duration)}
                    }
                })
            })
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Ищем треки на yandex music
     * @param str {string} Что надо искать
     * @constructor
     */
    export function SearchTracks(str: string): Promise<InputTrack[]> {
        return new Promise(async (resolve) => {
            const result = await API.Request(`https://music.yandex.ru/search?text=${str.split(" ").join("%20")}&type=tracks`, true);
            const tracks: InputTrack[] = [];
            let NumberTrack = 1;

            if (result instanceof Error) return resolve(null);

            for (const track of result.result.tracks.items) {
                if (NumberTrack === 15) break;
                const Author = track.artists[0];

                NumberTrack++;
                tracks.push({
                    url: `https://music.yandex.ru/album/${track.albums.id}/track/${track.id}`,
                    title: track.title,
                    author: {
                        title: Author.name,
                        url: `https://music.yandex.ru/artist/${Author.id}`
                    },
                    duration: {seconds: (track.durationMs / 1000).toFixed(0)}
                })
            }

            return resolve(tracks);
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем данные об авторе трека
     * @param url {string} Ссылка на автора
     */
    function getAuthor(url: string): Promise<InputTrack["author"]> {
        return new Promise(async (resolve) => {
            const result = await API.Request(url);

            if (result instanceof Error) return resolve(null);

            return resolve({
                url, title: result.name,
                image: {url: result.image },
                isVerified: true
            });
        });
    }
}