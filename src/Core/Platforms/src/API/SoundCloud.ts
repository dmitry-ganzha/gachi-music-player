import {httpsClient} from "../../../httpsClient";
import {FFmpegFormat, InputPlaylist, InputTrack} from "../../../Utils/TypeHelper";

const APiLink = "https://api-v2.soundcloud.com";
const clientID = '';
export const SoundCloud = {getTrack, getPlaylist, SearchTracks};

/**
 * @description Получаем трек
 * @param url {string} Ссылка на трек
 */
function getTrack(url: string): Promise<InputTrack> {
    return new Promise<InputTrack>(async (resolve) => {
        const ClientID = await getClientID();
        const result = await httpsClient.parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);

        if (!result?.id || !result) return resolve(null);

        return resolve({
            id: result.id, url,
            title: result.title,
            author: {
                id: result.user.id,
                url: result.user.permalink_url,
                title: result.user.username,
                image: {
                    url: ParseImageToFull(result.user.avatar_url)
                },
                isVerified: result.user.verified
            },
            image: {
                url: ParseImageToFull(result.artwork_url)
            },
            duration: {
                seconds: (result.duration / 1e3).toFixed(0)
            },
            format: await getFormat(result.media.transcodings, ClientID),
        });
    });
}

/**
 * @description Получаем плейлист
 * @param url {string} Ссылка на плейлист
 */
function getPlaylist(url: string): Promise<InputPlaylist> {
    return new Promise<InputPlaylist>(async (resolve) => {
        const ClientID = await getClientID();
        const result = await httpsClient.parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);
        const PlaylistItems: InputTrack[] = [];

        if (!result?.id || !result) return resolve(null);

        for (let i in result.tracks) {
            const track = result.tracks[i];

            if (!track.user) continue;

            PlaylistItems.push(CreateInfoTrack(track));
        }

        return resolve({
            id: result.id, url,
            title: result.title,
            author: {
                id: result.user.id,
                url: result.user.permalink_url,
                title: result.user.username,
                image: {
                    url: ParseImageToFull(result.user.avatar_url)
                },
                isVerified: result.user.verified
            },
            image: {
                url: ParseImageToFull(result.artwork_url)
            },
            items: PlaylistItems
        });
    });
}

/**
 * @description Ищем треки в soundcloud
 * @param search {string} Что ищем
 * @param options {limit: number} Кол-во выдаваемых треков
 * @constructor
 */
function SearchTracks(search: string, options = {limit: 15}): Promise<InputTrack[]> {
    return new Promise<InputTrack[]>(async (resolve) => {
        const result = await httpsClient.parseJson(`${APiLink}/search/tracks?q=${search}&client_id=${await getClientID()}&limit=${options.limit}`);
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

/**
 * @description Получаем ClientID, без регистрации
 */
function getClientID(): Promise<string> {
    return new Promise<string>(async (resolve) => {
        if (clientID) return resolve(clientID);

        const body = await httpsClient.parseBody(`https://soundcloud.com/`, {
            options: {
                english: true,
                zLibEncode: true
            }
        });
        const BodySplit = body.split("<script crossorigin src=\"");
        const urls: string[] = [];
        BodySplit.forEach((r) => {
            if (r.startsWith("https")) {
                urls.push(r.split("\"")[0]);
            }
        });
        const body2 = await httpsClient.parseBody(urls.pop());
        return resolve(body2.split(",client_id:\"")[1].split("\"")[0]);
    });
}


/**
 * @description Пример данных на выходе
 * @param result {any} Данные полученные от soundcloud
 * @constructor
 */
function CreateInfoTrack(result: any): InputTrack {
    return {
        id: result.id,
        url: result.permalink_url,
        title: result.title,
        author: {
            id: result.user.id,
            url: result.user.permalink_url,
            title: result.user.username,
            image: {
                url: ParseImageToFull(result.user.avatar_url)
            },
            isVerified: result.user.verified
        },
        image: {
            url: ParseImageToFull(result.artwork_url)
        },
        duration: {
            seconds: (result.duration / 1e3).toFixed(0)
        }
    }
}

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
            url: EndFormat.url,
            work: undefined
        });
    });
}

/**
 * @description Получаем картинку в исходном качестве
 * @param image {string} Ссылка на картинку
 * @constructor
 */
function ParseImageToFull(image: string) {
    if (!image) return image;

    const imageSplit = image.split("-");
    const FormatImage = image.split(".").pop();

    imageSplit[imageSplit.length - 1] = "original";

    return `${imageSplit.join("-")}.${FormatImage}`;
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