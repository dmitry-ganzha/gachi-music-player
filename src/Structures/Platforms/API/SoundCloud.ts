import {httpsClient} from "../../../Core/httpsClient";
import {InputPlaylist, InputTrack} from "../../../AudioPlayer/Structures/Queue/Song";
import {FFmpeg} from "../../../AudioPlayer/Structures/Media/FFmpeg";
import {FileSystem} from "../../../Core/FileSystem";
import FFmpegFormat = FFmpeg.Format;

const APiLink = "https://api-v2.soundcloud.com";
const clientID = FileSystem.env("SOUNDCLOUD");

/**
 * @description Делаем запрос с привязкой ClientID
 * @param url {string} Ссылка
 */
function parseJson(url: string): Promise<{ result: any, ClientID: string }> {
    return new Promise(async (resolve) => {
        const ClientID = await getClientID();
        const result = await httpsClient.parseJson(`${url}&client_id=${ClientID}`);

        return resolve({
            result, ClientID
        });
    });
}

/**
 * @description Получаем ClientID
 */
function getClientID(): Promise<string> {
    return new Promise<string>(async (resolve) => {
        if (clientID) return resolve(clientID);

        const body = await httpsClient.parseBody("https://soundcloud.com/", {
            options: {userAgent: true},
            request: {
                headers: {
                    "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        });
        const BodySplit = body.split("<script crossorigin src=\"");
        const urls: string[] = [];
        BodySplit.forEach((r) => {
            if (r.startsWith("https")) urls.push(r.split("\"")[0]);
        });

        const body2 = await httpsClient.parseBody(urls.pop());
        return resolve(body2.split(",client_id:\"")[1].split("\"")[0]);
    });
}

/**
 * Все доступные взаимодействия с SoundCloud-API
 */
export namespace SoundCloud {
    /**
     * @description Получаем трек
     * @param url {string} Ссылка на трек
     */
    export function getTrack(url: string): Promise<InputTrack> {
        return new Promise<InputTrack>(async (resolve) => {
            const {result, ClientID} = await parseJson(`${APiLink}/resolve?url=${url}`);

            if (!result?.id || !result) return resolve(null);

            return resolve({
                url,
                title: result.title,
                author: {
                    url: result.user.permalink_url,
                    title: result.user.username,
                    image: ParseImageToFull(result.user.avatar_url),
                    isVerified: result.user.verified
                },
                image: ParseImageToFull(result.artwork_url),
                duration: {
                    seconds: (result.duration / 1e3).toFixed(0)
                },
                format: await getFormat(result.media.transcodings, ClientID),
            });
        });
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Получаем плейлист
     * @param url {string} Ссылка на плейлист
     */
    export function getPlaylist(url: string): Promise<InputPlaylist | InputTrack> {
        return new Promise(async (resolve) => {
            const {result} = await parseJson(`${APiLink}/resolve?url=${url}`);
            const PlaylistItems: InputTrack[] = [];

            if (!result?.id || !result) return resolve(null);

            //Если SoundCloud нас обманул со ссылкой, есть нет <result>.tracks, то это просто трек!
            if (result.tracks === undefined) return getTrack(url).then(resolve);

            for (let i in result.tracks) {
                const track = result.tracks[i];

                if (!track.user) continue;

                PlaylistItems.push(CreateInfoTrack(track));
            }

            return resolve({
                url,
                title: result.title,
                author: {
                    url: result.user.permalink_url,
                    title: result.user.username,
                    image: ParseImageToFull(result.user.avatar_url),
                    isVerified: result.user.verified
                },
                image: ParseImageToFull(result.artwork_url),
                items: PlaylistItems
            });
        });
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Ищем треки в soundcloud
     * @param search {string} Что ищем
     * @param options {limit: number} Кол-во выдаваемых треков
     * @constructor
     */
    export function SearchTracks(search: string, options = {limit: 15}): Promise<InputTrack[]> {
        return new Promise<InputTrack[]>(async (resolve) => {
            const {result} = await parseJson(`${APiLink}/search/tracks?q=${search}&limit=${options.limit}`)
            const Items: InputTrack[] = [];

            if (!result) return resolve(null);

            for (let i in result.collection) {
                const track = result.collection[i];

                if (!track.user) continue;

                Items.push(CreateInfoTrack(track));
            }

            return resolve(Items);
        });
    }
}

//====================== ====================== ====================== ======================
/**
 * @description Пример данных на выходе
 * @param result {any} Данные полученные от soundcloud
 * @constructor
 */
function CreateInfoTrack(result: any): InputTrack {
    return {
        url: result.permalink_url,
        title: result.title,
        author: {
            url: result.user.permalink_url,
            title: result.user.username,
            image: ParseImageToFull(result.user.avatar_url),
            isVerified: result.user.verified
        },
        image: ParseImageToFull(result.artwork_url),
        duration: {
            seconds: (result.duration / 1e3).toFixed(0)
        }
    }
}

//====================== ====================== ====================== ======================
/**
 * @description Проходим все этапы для получения ссылки на поток трека
 * @param formats {SoundCloudFormat[]} Зашифрованные форматы аудио
 * @param ClientID {string} ID клиента
 */
function getFormat(formats: SoundCloudFormat[], ClientID: string): Promise<FFmpegFormat> {
    return new Promise<FFmpegFormat>(async (resolve) => {
        const FilterFormats = formats.filter((d) => d.format.protocol === "progressive").pop() ?? formats[0];
        const EndFormat = await httpsClient.parseJson(`${FilterFormats.url}?client_id=${ClientID}`);

        return resolve({
            url: EndFormat.url
        });
    });
}

//====================== ====================== ====================== ======================
/**
 * @description Получаем картинку в исходном качестве
 * @param image {string} Ссылка на картинку
 * @constructor
 */
function ParseImageToFull(image: string): { url: string } {
    if (!image) return {url: image};

    const imageSplit = image.split("-");
    const FormatImage = image.split(".").pop();

    imageSplit[imageSplit.length - 1] = "original";

    return {url: `${imageSplit.join("-")}.${FormatImage}`};
}

interface SoundCloudFormat {
    url: string,
    preset: "mp3_0_0" | "opus_0_0",
    duration: number,
    snipped: boolean,
    format: {
        protocol: "hls" | "progressive",
        mime_type: "audio/mpeg"
    },
    quality: "sq"
}