import {httpsClient} from "../../httpsClient";
import {InputAuthor, InputPlaylist, InputTrack} from "../../Utils/TypesHelper";

const ApiLink = "https://accounts.spotify.com/api"; //token
const GetApi = "https://api.spotify.com/v1"; //type/id/params
const DefaultUrlSpotify = 'https://open.spotify.com';
const SpotifyStr = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;

let clientID: string, clientSecret: string;

export class Spotify {
    protected ClientToken: string;
    protected TokenTime: number;

    /**
     * @description Добавляем ClientID, ClientSecret для получения токена
     * @param ClientID {string}
     * @param ClientSecret {string}
     */
    public Settings = (ClientID: string, ClientSecret: string) => {
        clientID = ClientID;
        clientSecret = ClientSecret;
    };
    /**
     * @description Получаем данные о треке
     * @param url {string} Ссылка на трек
     */
    public getTrack = async (url: string): Promise<InputTrack | null> => {
        const id = this.getID(url);
        const result = await this.get(`tracks/${id}`) as SpotifyTrack & FailResult;

        if (!result || !result?.name) return null;

        return {
            id: id,
            title: result.name,
            url: url,
            author: await this.getAuthorTrack(result.artists[0].external_urls.spotify, result?.artists[0]?.type !== "artist"),
            duration: {
                seconds: (result.duration_ms / 1000).toFixed(0)
            },
            image: result.album.images[0],
            isValid: true,
            PrevFile: result.preview_url
        }
    };
    /**
     * @description получаем данные о плейлисте + треки
     * @param url {string} Ссылка на плейлист
     * @param options {limit: number} Настройки
     */
    public getPlaylistTracks = async (url: string, options: {limit: number} = {limit: 101}): Promise<InputPlaylist | null> => {
        try {
            const id = this.getID(url);
            const result = await this.get(`playlists/${id}?offset=0&limit=${options.limit}`) as SpotifyPlaylist & FailResult;

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
                        author: await this.getAuthorTrack(track.artists[0].external_urls.spotify),
                        duration: {
                            seconds: (track.duration_ms / 1000).toFixed(0)
                        },
                        image: track.album.images[0] ?? result?.images[0],
                        isValid: true,
                        PrevFile: track?.preview_url
                    }
                })),
                image: result.images[0],
                author: await this.getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.owner.id}`, result?.owner?.type !== "artist")
            };
        } catch (e) {
            console.log(e);
            return null;
        }
    };
    /**
     * @description Получаем данные на альбом + треки
     * @param url {string} Ссылка на альбом
     * @param options {limit: number} Настройки
     */
    public getAlbumTracks = async (url: string, options: {limit: number} = {limit: 101}): Promise<InputPlaylist | null> => {
        try {
            const id = this.getID(url);
            const result = await this.get(`albums/${id}?offset=0&limit=${options.limit}`) as SpotifyAlbumFull & FailResult;

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
                        author: await this.getAuthorTrack(track.artists[0].external_urls.spotify),
                        duration: {
                            seconds: (track.duration_ms / 1000).toFixed(0)
                        },
                        image: track?.album?.images[0] ?? result?.images[0],
                        isValid: true,
                        PrevFile: track.preview_url
                    }
                })),
                image: result?.images[0],
                author: await this.getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.artists[0].id}`, result?.artists[0]?.type !== "artist")
            };
        } catch (e) {
            console.log(e);
            return null;
        }
    };
    /**
     * @description Ищем треки в базах spotify
     * @param search {string} Что ищем
     * @param options {limit: number} Настройки поиска
     */
    public SearchTracks = async (search: string, options: {limit: number} = {limit: 15}): Promise<{ items: InputTrack[] } | null> => {
        try {
            const result = await this.get(`search?q=${search}&type=track&limit=${options.limit}`) as SearchTracks & FailResult;

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
    };
    /**
     * @description Получаем данные об авторе или пользователе
     * @param url {string} ссылка на автора или пользователя
     * @param isUser {boolean} Это пользователь
     */
    protected getAuthorTrack = async (url: string, isUser: boolean = false): Promise<InputAuthor> => {
        const id = this.getID(url);
        const result = await this.get(`${isUser ? "users" : "artists"}/${id}`) as (SpotifyArtist | SpotifyUser) & FailResult

        return { //@ts-ignore
            id, title: result?.name ?? result?.display_name, url, image: result.images[0], isVerified: result.followers.total >= 500
        }
    };

    /**
     * @description Получаем токен
     */
    protected getToken = async (): Promise<void> => {
        const result = await new httpsClient().parseJson({
            url: `${ApiLink}/token`,
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
        }) as getToken;

        this.TokenTime = Date.now() + result.expires_in;
        this.ClientToken = result.access_token;
    };
    /**
     * @description Создаем запрос к SPOTIFY API и обновляем токен
     * @param method {string} Ссылка api
     */
    protected get = async (method: string): Promise<SpotifyPlaylist & FailResult | SpotifyTrack & FailResult | SpotifyArtist & FailResult | SpotifyUser & FailResult | SpotifyAlbumFull & FailResult | SearchTracks & FailResult> => {
        await this.login();
        return new httpsClient().parseJson({
            url: `${GetApi}/${method}`,
            request: {
                method: "GET",
                headers: {
                    'Accept': "application/json",
                    'Authorization': 'Bearer ' + this.ClientToken,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            },
            options: {zLibEncode: true}
        })
    };
    //Проверяем надо ли обновлять токен
    protected login = async () => !await this.isLoggedIn() ? await this.getToken() : null;
    //Вышел ли токен из строя (timeout)
    protected isLoggedIn = async () => this.ClientToken !== undefined && this.TokenTime > Date.now() + 2;
    //Получаем ID трека, плейлиста, альбома
    protected getID = (url: string): string => {
        if (typeof url !== 'string') return undefined;
        if (!url.match(SpotifyStr)) return undefined;

        return new URL(url).pathname.split('/')[2];
    };
}

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