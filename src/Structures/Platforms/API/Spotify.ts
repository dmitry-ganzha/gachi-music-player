import {httpsClient} from "../../../Core/httpsClient";
import {InputAuthor, InputPlaylist, InputTrack} from "../../../AudioPlayer/Structures/Queue/Song";
import {FileSystem} from "../../../Core/FileSystem";

const AccountUrl = "https://accounts.spotify.com/api"; //token
const ApiUrl = "https://api.spotify.com/v1"; //type/id/params
const SpotifyUrl = 'https://open.spotify.com';
const aut = FileSystem.env("SPOTIFY_ID") + ":" + FileSystem.env("SPOTIFY_SECRET");

const SpotifyRes = {
    Token: "",
    Time: 0
};

/**
 * Все доступные взаимодействия с Spotify-API
 */
export namespace Spotify {
    /**
     * @description Получаем данные о треке
     * @param url {string} Ссылка на трек
     */
    export async function getTrack(url: string): Promise<InputTrack | null> {
        return new Promise<InputTrack | null>(async (resolve) => {
            const id = getID(url);
            const result = (await Promise.all([RequestSpotify(`tracks/${id}`)]))[0] as SpotifyTrack & FailResult;

            if (!result || !result?.name) return resolve(null);

            return resolve({
                title: result.name,
                url: url,
                author: (await Promise.all([getAuthorTrack(result.artists[0].external_urls.spotify, result?.artists[0]?.type !== "artist")]))[0],
                duration: {
                    seconds: (result.duration_ms / 1000).toFixed(0)
                },
                image: result.album.images.pop(),
                //PrevFile: result.preview_url
            });
        });
    }

    //====================== ====================== ====================== ======================
    /**
     * @description получаем данные о плейлисте + треки
     * @param url {string} Ссылка на плейлист
     * @param options {limit: number} Настройки
     */
    export function getPlaylist(url: string, options: { limit: number } = {limit: 101}): Promise<InputPlaylist | null> {
        return new Promise<InputPlaylist | null>(async (resolve) => {
            try {
                const id = getID(url);
                const result = (await Promise.all([RequestSpotify(`playlists/${id}?offset=0&limit=${options.limit}`)]))[0] as SpotifyPlaylist & FailResult;

                if (!result || !result?.name) return resolve(null);

                return resolve({
                    url, title: result.name,
                    items: await Promise.all(result.tracks.items.map(async ({track}) => {
                        return {
                            title: track?.name,
                            url: `${SpotifyUrl}/track/${track?.id}`,
                            author: (await Promise.all([getAuthorTrack(track.artists[0].external_urls.spotify)]))[0],
                            duration: {
                                seconds: (track.duration_ms / 1000).toFixed(0)
                            },
                            image: track.album.images[0] ?? result?.images[0],
                            //PrevFile: track?.preview_url
                        }
                    })),
                    image: result.images[0],
                    author: (await Promise.all([getAuthorTrack(`${SpotifyUrl}/artist/${result.owner.id}`, result?.owner?.type !== "artist")]))[0]
                });
            } catch (e) {
                console.log(e);
                return resolve(null);
            }
        });
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Получаем данные на альбом + треки
     * @param url {string} Ссылка на альбом
     * @param options {limit: number} Настройки
     */
    export function getAlbum(url: string, options: { limit: number } = {limit: 101}): Promise<InputPlaylist | null> {
        return new Promise<InputPlaylist | null>(async (resolve) => {
            try {
                const id = getID(url);
                const result = (await Promise.all([RequestSpotify(`albums/${id}?offset=0&limit=${options.limit}`)]))[0] as SpotifyAlbumFull & FailResult;

                if (!result || !result?.name) return resolve(null);

                return resolve({
                    url: url,
                    title: result.name,
                    items: await Promise.all(result.tracks.items.map(async (track: SpotifyTrack) => {
                        return {
                            title: track.name,
                            url: `${SpotifyUrl}/track/${track.id}`,
                            author: (await Promise.all([getAuthorTrack(track.artists[0].external_urls.spotify)]))[0],
                            duration: {
                                seconds: (track.duration_ms / 1000).toFixed(0)
                            },
                            image: track?.album?.images[0] ?? result?.images[0],
                            //PrevFile: track.preview_url
                        }
                    })),
                    image: result?.images[0],
                    author: (await Promise.all([getAuthorTrack(`${SpotifyUrl}/artist/${result.artists[0].id}`, result?.artists[0]?.type !== "artist")]))[0]
                });
            } catch (e) {
                console.log(e);
                return resolve(null);
            }
        });
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Ищем треки в базах spotify
     * @param search {string} Что ищем
     * @param options {limit: number} Настройки поиска
     */
    export function SearchTracks(search: string, options: { limit: number } = {limit: 15}): Promise<InputTrack[] | null> {
        return new Promise<InputTrack[] | null>(async (resolve) => {
            try {
                const result = (await Promise.all([RequestSpotify(`search?q=${search}&type=track&limit=${options.limit}`)]))[0] as SearchTracks & FailResult;

                if (!result) return resolve(null);

                return resolve(await Promise.all(result.tracks.items.map((track: SpotifyTrack) => {
                        return {
                            title: track.name,
                            url: `${SpotifyUrl}/track/${track.id}`,
                            author: {
                                url: `${SpotifyUrl}/artist/${track.artists[0].id}`,
                                title: track.artists[0].name,
                                image: null,
                                isVerified: track.artists[0].popularity >= 500
                            },
                            duration: {
                                seconds: (track.duration_ms / 1000).toFixed(0),
                            },
                            image: track.album.images[0],
                            //PrevFile: track.preview_url
                        };
                    }))
                );
            } catch (e) {
                console.log(e);
                return resolve(null);
            }
        });
    }
}

//====================== ====================== ====================== ======================
/**
 * @description Получаем токен
 */
function getToken(): Promise<void> {
    return httpsClient.parseJson(`${AccountUrl}/token`, {
        request: {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Authorization": `Basic ${Buffer.from(aut).toString("base64")}`,
                "Content-Type": "application/x-www-form-urlencoded",
                "accept-encoding": "gzip, deflate, br"
            },
            body: "grant_type=client_credentials"
        }
    }).then((result) => {
        SpotifyRes.Time = Date.now() + result.expires_in;
        SpotifyRes.Token = result.access_token;
    });
}

//====================== ====================== ====================== ======================
/**
 * @description Создаем запрос к SPOTIFY API и обновляем токен
 * @param method {string} Ссылка api
 */
function RequestSpotify(method: string): Promise<SpotifyRes> {
    return new Promise<SpotifyRes>(async (resolve) => {
        await login();
        return httpsClient.parseJson(`${ApiUrl}/${method}`, {
            request: {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + SpotifyRes.Token,
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        }).then(resolve);
    });
}

//====================== ====================== ====================== ======================
/**
 * @description Получаем данные об авторе или пользователе
 * @param url {string} ссылка на автора или пользователя
 * @param isUser {boolean} Это пользователь
 */
function getAuthorTrack(url: string, isUser: boolean = false): Promise<InputAuthor> {
    return new Promise<InputAuthor>(async (resolve) => {
        const id = getID(url);
        const result = (await Promise.all([RequestSpotify(`${isUser ? "users" : "artists"}/${id}`)]))[0] as (SpotifyArtist | SpotifyUser) & FailResult

        return resolve({ // @ts-ignore
            title: result?.name ?? result?.display_name, url,
            image: result.images[0],
            isVerified: result.followers.total >= 500
        });
    });
}

//Проверяем надо ли обновлять токен
function login() {
    return !isLoggedIn() ? getToken() : null;
}

//Вышел ли токен из строя (timeout)
function isLoggedIn() {
    return SpotifyRes.Token !== undefined && SpotifyRes.Time > Date.now() + 2;
}

//Получаем ID трека, плейлиста, альбома
function getID(url: string): string {
    if (typeof url !== "string") return undefined;

    return new URL(url).pathname.split('/')[2];
}


//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

type SpotifyType = "track" | "playlist" | "album" | "artist" | "user";
type AlbumType = "single";
type SpotifyRes =
    SpotifyPlaylist & FailResult
    | SpotifyTrack & FailResult
    | SpotifyArtist & FailResult
    | SpotifyUser & FailResult
    | SpotifyAlbumFull & FailResult
    | SearchTracks & FailResult;

interface FailResult {
    error: boolean
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
        upc: string
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
    tracks: {
        href: string,
        items: SpotifyTrack[]
        limit: number,
        next: string,
        offset: number,
        previous: null,
        total: number
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