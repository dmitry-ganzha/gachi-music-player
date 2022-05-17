import {httpsClient} from "../../../httpsClient";
import cfg from '../../../../../DataBase/Config.json';
import {InputPlaylist, InputTrack} from "../../../Utils/TypeHelper";

const vkApiLink = "https://api.vk.com/method/";
const connectString = `?access_token=${cfg.vk.token}`;

type requestType = "get" | "getById" | "search" | "getPlaylistById" | "getPlaylist";
type methodType = "audio" | "execute" | "catalog";

export const VK = {getTrack, getPlaylist, SearchTracks};

/**
 * @description Делаем запрос к VK API (через account), получаем данные о треке
 * @param url {string} Ссылка
 */
function getTrack(url: string): Promise<null | InputTrack> {
    return new Promise<InputTrack | null>(async (resolve) => {
        const TrackID = getID(url);
        let res = await RequestVK('audio', 'getById', `&audios=${TrackID}`) as VK_track;
        if (!res.response) return resolve(null);

        const track = res.response[0];
        const image = track?.album?.thumb;

        return resolve({
            id: track.id,
            url: `https://vk.com/audio${TrackID}`,
            title: track.title,
            author: {
                id: track.owner_id,
                url: ReplaceAuthorUrl(track.artist),
                title: track.artist,
                image: {url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined},
                isVerified: track.is_licensed
            },
            image: undefined,
            duration: {
                seconds: track.duration.toFixed(0)
            },
            format: {
                url: track.url,
                work: true
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
function SearchTracks(str: string, options: {limit: number} = {limit: 15}): Promise<null | {items: InputTrack[]}> {
    return new Promise(async (resolve) => {
        let items: InputTrack[] = [], num = 0;

        let res = await RequestVK('audio','search', `&q=${str}`) as VK_Search;

        if (!res.response) return null;

        for (let i in res.response.items) {
            const track = res.response.items[i];

            if (options.limit <= num) break;
            num++;

            items.push({
                id: track.id,
                url: `https://vk.com/audio${track.owner_id}_${track.id}`,
                title: track.title,
                author: {
                    id: track.owner_id,
                    url: ReplaceAuthorUrl(track.artist),
                    title: track.artist,
                    isVerified: track.is_licensed
                },
                duration: {
                    seconds: track.duration.toFixed(0)
                }
            });
        }

        return resolve({items});
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Делаем запрос к VK API (через account), получаем данные о плейлисте
 * @param url {string} Ссылка
 * @param options {{limit: number}}
 */
function getPlaylist(url: string, options = {limit: 50}): Promise<null | InputPlaylist> {
    return new Promise<InputPlaylist | null>(async (resolve) => {
        const PlaylistFullID = getID(url).split("_");
        const playlist_id = PlaylistFullID[1];
        const owner_id = PlaylistFullID[0];
        const key = PlaylistFullID[2];

        const res = await RequestVK('audio', 'getPlaylistById', `&owner_id=${owner_id}&playlist_id=${playlist_id}&access_key=${key}`) as VK_playlist;
        const itemsPlaylist = await RequestVK('audio', 'get', `&owner_id=${owner_id}&album_id=${playlist_id}&access_key=${key}&count=${options.limit}`) as VK_Search;

        if (!res.response || !itemsPlaylist.response) return resolve(null);

        const PlaylistData = res.response;
        const PlaylistImage = PlaylistData?.thumbs?.length > 0 ? PlaylistData?.thumbs[0] : null;

        return resolve({
            id: playlist_id, url,
            title: PlaylistData.title,
            items: itemsPlaylist.response.items.map((track) => {
                const image = track?.album?.thumb ?? undefined;

                return {
                    id: track.id,
                    url: `https://vk.com/audio${track.owner_id}_${track.id}`,
                    title: track.title,
                    author: {
                        id: track.owner_id,
                        url: ReplaceAuthorUrl(track.artist),
                        title: track.artist,
                        image: {url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined},
                        isVerified: track.is_licensed
                    },
                    image: undefined,
                    duration: {seconds: track.duration.toFixed(0)},
                };
            }),
            image: {url: PlaylistImage?.photo_1200 ?? PlaylistImage?.photo_600 ?? PlaylistImage?.photo_300 ?? PlaylistImage?.photo_270 ?? undefined}
        });
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Делаем запрос к VK API
 * @param method {string} Метод, к примеру audio.getById (где audio метод, getById тип)
 * @param type {string} Тип запроса
 * @param options {string} Параметры через &
 */
function RequestVK(method: methodType, type: requestType, options: string): Promise<any> {
    return httpsClient.parseJson(CreateUrl(method, type, options), { options: { zLibEncode: true } });
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
    if (url.match(/\/audio/)) return url.split('/audio')[1];
    return url.split('playlist/')[1];
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