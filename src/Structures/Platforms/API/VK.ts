import {httpsClient} from "../../../Core/httpsClient";
import {InputPlaylist, InputTrack} from "../../../AudioPlayer/Structures/Queue/Song";
import {FileSystem} from "../../../Core/FileSystem";

const vkApiLink = "https://api.vk.com/method/";
const connectString = `?access_token=${FileSystem.env("VK_TOKEN")}`;

type requestType = "get" | "getById" | "search" | "getPlaylistById" | "getPlaylist";
type methodType = "audio" | "execute" | "catalog";

/**
 * Все доступные взаимодействия с VK-API
 */
export namespace VK {
    /**
     * @description Делаем запрос к VK API (через account), получаем данные о треке
     * @param url {string} Ссылка
     */
    export function getTrack(url: string): Promise<null | InputTrack> {
        return new Promise<InputTrack | null>(async (resolve) => {
            const TrackID = getID(url);
            let Request = await RequestVK("audio", "getById", `&audios=${TrackID}`) as VK_track;

            if (!Request || !Request?.response) return resolve(null);

            const track = Request?.response[0];
            const image = track?.album?.thumb;

            return resolve({
                url: `https://vk.com/audio${TrackID}`,
                title: track.title,
                author: {
                    url: ReplaceAuthorUrl(track.artist),
                    title: track.artist,
                    image: null,
                    isVerified: track.is_licensed
                },
                image: {url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined},
                duration: {
                    seconds: track.duration.toFixed(0)
                },
                format: {
                    url: track.url
                }
            });
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем запрос к VK API (через account), получаем данные о поиске
     * @param str {string} Что ищем
     * @param options {{limit: number}}
     */
    export function SearchTracks(str: string, options: {limit: number} = {limit: 15}): Promise<null | InputTrack[]> {
        return new Promise(async (resolve) => {
            const items: InputTrack[] = [];
            const Request = await RequestVK("audio","search", `&q=${str}`) as VK_Search;
            let NumberTrack = 0;

            if (!Request || !Request?.response) return null;

            for (let i in Request.response.items) {
                const track = Request.response.items[i];

                if (options.limit <= NumberTrack) break;
                NumberTrack++;

                items.push({
                    url: `https://vk.com/audio${track.owner_id}_${track.id}`,
                    title: track.title,
                    author: {
                        url: ReplaceAuthorUrl(track.artist),
                        title: track.artist,
                        isVerified: track.is_licensed
                    },
                    duration: {
                        seconds: track.duration.toFixed(0)
                    }
                });
            }

            return resolve(items);
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем запрос к VK API (через account), получаем данные о плейлисте
     * @param url {string} Ссылка
     * @param options {{limit: number}}
     */
    export function getPlaylist(url: string, options = {limit: 50}): Promise<null | InputPlaylist> {
        return new Promise<InputPlaylist | null>(async (resolve) => {
            const PlaylistFullID = getID(url).split("_");
            const playlist_id = PlaylistFullID[1];
            const owner_id = PlaylistFullID[0];
            const key = PlaylistFullID[2];

            const Request = await RequestVK("audio", "getPlaylistById", `&owner_id=${owner_id}&playlist_id=${playlist_id}&access_key=${key}`) as VK_playlist;
            const itemsPlaylist = await RequestVK("audio", "get", `&owner_id=${owner_id}&album_id=${playlist_id}&access_key=${key}&count=${options.limit}`) as VK_Search;

            if (!Request.response || !itemsPlaylist.response || !Request || !itemsPlaylist) return resolve(null);

            const PlaylistData = Request.response;
            const PlaylistImage = PlaylistData?.thumbs?.length > 0 ? PlaylistData?.thumbs[0] : null;

            return resolve({
                url, title: PlaylistData.title,
                items: itemsPlaylist.response.items.map((track) => {
                    const image = track?.album?.thumb ?? undefined;

                    return {
                        url: `https://vk.com/audio${track.owner_id}_${track.id}`,
                        title: track.title,
                        author: {
                            url: ReplaceAuthorUrl(track.artist),
                            title: track.artist,
                            image: null,
                            isVerified: track.is_licensed
                        },
                        image: {url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined},
                        duration: {seconds: track.duration.toFixed(0)},
                    };
                }),
                image: {url: PlaylistImage?.photo_1200 ?? PlaylistImage?.photo_600 ?? PlaylistImage?.photo_300 ?? PlaylistImage?.photo_270 ?? undefined}
            });
        });
    }
    //====================== ====================== ====================== ======================
}
/**
 * @description Делаем запрос к VK API
 * @param method {string} Метод, к примеру audio.getById (где audio метод, getById тип)
 * @param type {string} Тип запроса
 * @param options {string} Параметры через &
 */
function RequestVK(method: methodType, type: requestType, options: string): Promise<any> {
    return httpsClient.parseJson(CreateUrl(method, type, options), {
        request: {
            headers: {
                "accept-encoding": "gzip, deflate, br"
            }
        }
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Подготавливаем ссылку
 * @param method {string} Метод, к примеру audio.getById (где audio метод, getById тип)
 * @param type {string} Тип запроса
 * @param options {string} Параметры через &
 */
function CreateUrl(method: methodType, type: requestType, options: string): string {
    return `${vkApiLink}${method}.${type}${connectString}${options}&v=5.95`;
}

//Получаем ID
function getID(url: string): string {
    if (url.match(/\/audio/)) return url.split("/audio")[1];
    return url.split("playlist/")[1];
}

//Убираем пропуск между словами
function ReplaceAuthorUrl(AuthorName: string): string {
    return `https://vk.com/audio&q=${AuthorName.replaceAll(" ", "").toLowerCase()}`;
}


//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

interface VK_Search {
    response: {
        count: number,
        items: VK_track["response"][0][]
    }
}

interface VK_playlist {
    response: {
        id: number,
        owner_id: number,
        type: number,
        title: string,
        description: string,
        count: number,
        followers: number,
        plays: number,
        create_time: number,
        update_time: number,
        genres: [],
        is_following: boolean,
        thumbs: VK_images[],
        access_key: string,
        album_type: string
    }
}

interface VK_track {
    response:
        [
            {
                artist: string,
                id: number,
                owner_id: number,
                title: string,
                duration: number,
                access_key: string,
                ads: {
                    content_id: string,
                    duration: string,
                    account_age_type: string,
                    puid22: string
                },
                is_explicit: boolean,
                is_licensed: boolean,
                track_code: string,
                url: string,
                date: number,
                no_search: number,
                is_hq: boolean,
                album: {
                    id: number,
                    title: string,
                    owner_id: number,
                    access_key: string,
                    thumb: VK_images
                },
                main_artists: [
                    {
                        name: string,
                        domain: string,
                        id: string
                    }
                ],
                featured_artists: [
                    {
                        name: string,
                        domain: string,
                        id: string
                    }
                ],
                short_videos_allowed: boolean,
                stories_allowed: boolean,
                stories_cover_allowed: boolean
            }
        ]
}

interface VK_images {
    width: number,
    height: number,
    photo_34: string,
    photo_68: string,
    photo_135: string,
    photo_270: string,
    photo_300: string,
    photo_600: string,
    photo_1200: string
}