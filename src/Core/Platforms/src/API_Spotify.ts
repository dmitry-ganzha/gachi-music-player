import {httpsClient} from "../../httpsClient";
import cfg from "../../../../DataBase/Config.json";
import {InputAuthor, InputPlaylist, InputTrack} from "../../Utils/TypeHelper";

const ApiLink = "https://accounts.spotify.com/api"; //token
const GetApi = "https://api.spotify.com/v1"; //type/id/params
const DefaultUrlSpotify = 'https://open.spotify.com';
const SpotifyStr = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;

const clientID: string = cfg.spotify.clientID
const clientSecret: string = cfg.spotify.clientSecret;

let Token: any = null;
let TokenTime: any = null;

export const Spotify = {getTrack, getAlbum, getPlaylist, SearchTracks};

/**
 * @description Получаем токен
 */
async function getToken(): Promise<void> {
    const result = (await Promise.all([new httpsClient().parseJson(`${ApiLink}/token`, {
        request: {
            method: 'POST',
            headers: {
                'Accept': "application/json",
                'Authorization': `Basic ${Buffer.from(`${clientID}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: "grant_type=client_credentials"
        },
        options: {zLibEncode: true}
    })]))[0] as getToken;

    TokenTime = Date.now() + result.expires_in;
    Token = result.access_token;
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем запрос к SPOTIFY API и обновляем токен
 * @param method {string} Ссылка api
 */
async function RequestSpotify(method: string): Promise<SpotifyPlaylist & FailResult | SpotifyTrack & FailResult | SpotifyArtist & FailResult | SpotifyUser & FailResult | SpotifyAlbumFull & FailResult | SearchTracks & FailResult> {
    await login();
    return new httpsClient().parseJson(`${GetApi}/${method}`, {
        request: {
            method: "GET",
            headers: {
                'Accept': "application/json",
                'Authorization': 'Bearer ' + Token,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        },
        options: {zLibEncode: true}
    })
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные о треке
 * @param url {string} Ссылка на трек
 */
async function getTrack(url: string): Promise<InputTrack | null> {
    const id = getID(url);
    const result = (await Promise.all([RequestSpotify(`tracks/${id}`)]))[0] as SpotifyTrack & FailResult;

    if (!result || !result?.name) return null;

    return {
        id: id,
        title: result.name,
        url: url,
        author: (await Promise.all([getAuthorTrack(result.artists[0].external_urls.spotify, result?.artists[0]?.type !== "artist")]))[0],
        duration: {
            seconds: (result.duration_ms / 1000).toFixed(0)
        },
        image: result.album.images[0],
        isValid: true,
        PrevFile: result.preview_url
    }
}
//====================== ====================== ====================== ======================
/**
 * @description получаем данные о плейлисте + треки
 * @param url {string} Ссылка на плейлист
 * @param options {limit: number} Настройки
 */
async function getPlaylist(url: string, options: {limit: number} = {limit: 101}): Promise<InputPlaylist | null> {
    try {
        const id = getID(url);
        const result = await RequestSpotify(`playlists/${id}?offset=0&limit=${options.limit}`) as SpotifyPlaylist & FailResult;

        if (!result || !result?.name) return null;

        return {
            id: id,
            url: url,
            title: result.name,
            items: await Promise.all(result.tracks.items.map(async ({track}) => {
                return {
                    id: track?.id,
                    title: track?.name,
                    url: `${DefaultUrlSpotify}/track/${track?.id}`,
                    author: (await Promise.all([getAuthorTrack(track.artists[0].external_urls.spotify)]))[0],
                    duration: {
                        seconds: (track.duration_ms / 1000).toFixed(0)
                    },
                    image: track.album.images[0] ?? result?.images[0],
                    isValid: true,
                    PrevFile: track?.preview_url
                }
            })),
            image: result.images[0],
            author: (await Promise.all([getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.owner.id}`, result?.owner?.type !== "artist")]))[0]
        };
    } catch (e) {
        console.log(e);
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные на альбом + треки
 * @param url {string} Ссылка на альбом
 * @param options {limit: number} Настройки
 */
async function getAlbum(url: string, options: {limit: number} = {limit: 101}): Promise<InputPlaylist | null> {
    try {
        const id = getID(url);
        const result = (await Promise.all([RequestSpotify(`albums/${id}?offset=0&limit=${options.limit}`)]))[0] as SpotifyAlbumFull & FailResult;

        if (!result || !result?.name) return null;

        return {
            id: id,
            url: url,
            title: result.name,
            items: await Promise.all(result.tracks.items.map(async (track: SpotifyTrack) => {
                return {
                    id: track.id,
                    title: track.name,
                    url: `${DefaultUrlSpotify}/track/${track.id}`,
                    author: (await Promise.all([getAuthorTrack(track.artists[0].external_urls.spotify)]))[0],
                    duration: {
                        seconds: (track.duration_ms / 1000).toFixed(0)
                    },
                    image: track?.album?.images[0] ?? result?.images[0],
                    isValid: true,
                    PrevFile: track.preview_url
                }
            })),
            image: result?.images[0],
            author: (await Promise.all([getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.artists[0].id}`, result?.artists[0]?.type !== "artist")]))[0]
        };
    } catch (e) {
        console.log(e);
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем треки в базах spotify
 * @param search {string} Что ищем
 * @param options {limit: number} Настройки поиска
 */
async function SearchTracks(search: string, options: {limit: number} = {limit: 15}): Promise<{ items: InputTrack[] } | null> {
    try {
        const result = (await Promise.all([RequestSpotify(`search?q=${search}&type=track&limit=${options.limit}`)]))[0] as SearchTracks & FailResult;

        if (!result) return null;

        return {
            items: await Promise.all(result.tracks.items.map(async (track: SpotifyTrack) => {
                return {
                    id: track.id,
                    title: track.name,
                    url: `${DefaultUrlSpotify}/track/${track.id}`,
                    author: {
                        id: track.artists[0].id,
                        url: `${DefaultUrlSpotify}/artist/${track.artists[0].id}`,
                        title: track.artists[0].name,
                        image: null,
                        isVerified: track.artists[0].popularity >= 500
                    },
                    duration: {
                        seconds: (track.duration_ms / 1000).toFixed(0),
                    },
                    image: track.album.images[0],
                    isValid: true,
                    PrevFile: track.preview_url
                };
            }))
        };
    } catch (e) {
        console.log(e);
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные об авторе или пользователе
 * @param url {string} ссылка на автора или пользователя
 * @param isUser {boolean} Это пользователь
 */
async function getAuthorTrack(url: string, isUser: boolean = false): Promise<InputAuthor> {
    const id = getID(url);
    const result = (await Promise.all([RequestSpotify(`${isUser ? "users" : "artists"}/${id}`)]))[0] as (SpotifyArtist | SpotifyUser) & FailResult

    return { //@ts-ignore
        id, title: result?.name ?? result?.display_name, url, image: result.images[0], isVerified: result.followers.total >= 500
    }
}

//Проверяем надо ли обновлять токен
function login() {
    return !isLoggedIn() ? getToken() : null;
}

//Вышел ли токен из строя (timeout)
function isLoggedIn() {
    return Token !== undefined && TokenTime > Date.now() + 2;
}

//Получаем ID трека, плейлиста, альбома
function getID(url: string): string {
    if (typeof url !== 'string') return undefined;
    if (!url.match(SpotifyStr)) return undefined;

    return new URL(url).pathname.split('/')[2];
}


//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

type SpotifyType = "track" | "playlist" | "album" | "artist" | "user";
type AlbumType = "single";

interface FailResult {
    error: boolean
}
interface getToken {
    expires_in: number,
    access_token: string
}
/*   interface global   */
interface SpotifyTrack {
    album: SpotifyAlbum,
    artists: SpotifyArtist[],
    available_markets: string[],
    disc_number: number,
    duration_ms: number,
    episode: boolean,
    explicit: boolean,
    external_ids: { isrc: string },
    external_urls: { spotify: string },
    href: string,
    id: string,
    is_local: boolean,
    name: string,
    popularity: number,
    preview_url: string,
    track: boolean,
    track_number: number,
    type: SpotifyType,
    uri: string
}
interface AlbumImage {
    height: number,
    url: string,
    width: number
}

/*   interface Playlist    */
interface SpotifyPlaylist {
    collaborative: boolean,
    description: string,
    external_urls: {
        spotify: string
    },
    followers: { href: null, total: number },
    href: string,
    id: string,
    images: AlbumImage[],
    name: string,
    owner: {
        display_name: string,
        external_urls: {
            spotify: string
        },
        href: string,
        id: string,
        type: SpotifyType,
        uri: string
    },
    primary_color: null,
    public: boolean,
    snapshot_id: string,
    tracks: {
        href: string,
        items: {
            track: SpotifyTrack
        }[],
        limit: number,
        next: null,
        offset: number,
        previous: null,
        total: number
    },
    type: SpotifyType,
    uri: string
}

/*   interface Album    */
interface SpotifyAlbumFull {
    album_type: AlbumType,
    artists: SpotifyArtist[],
    available_markets: string[],
    copyrights: [
        {
            text: string,
            type: string
        }
    ],
    external_ids: {
        "upc": string
    },
    external_urls: {
        spotify: string
    },
    genres: [],
    href: string,
    id: string,
    images: AlbumImage[],
    label: string,
    name: string,
    popularity: number,
    release_date: string,
    release_date_precision: string,
    total_tracks: number,
    tracks: {
        href: string,
        items: SpotifyTrack[],
        limit: number,
        next: null,
        offset: number,
        previous: null,
        total: number
    },
    type: SpotifyType,
    uri: string

}
interface SpotifyAlbum {
    album_type: AlbumType,
    artists: SpotifyArtist[],
    available_markets: string[],
    external_urls: {
        spotify: string
    },
    href: string,
    id: string,
    images: AlbumImage[],
    name: string,
    release_date: Date,
    release_date_precision: string,
    total_tracks: number,
    type: SpotifyType,
    uri: string
}

/*   interface SearchTracks   */
interface SearchTracks {
    "tracks": {
        "href": string,
        "items": SpotifyTrack[]
        "limit": number,
        "next": string,
        "offset": number,
        "previous": null,
        "total": number
    }
}

/*   interface Artist   */
interface SpotifyArtist {
    external_urls: {
        spotify: string
    },
    followers: {
        href: null,
        total: number
    },
    genres: string[],
    href: string,
    id: string,
    images: AlbumImage[],
    name: string,
    popularity: number,
    type: SpotifyType,
    uri: string
}

interface SpotifyUser {
    display_name: string,
    external_urls: {
        spotify: string
    },
    followers: {
        href: null,
        total: number
    },
    href: string,
    id: string,
    images: AlbumImage[],
    type: SpotifyType,
    uri: string
}