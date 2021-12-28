import fetch from 'node-fetch';

const ApiLink = "https://accounts.spotify.com/api"; //token
const GetApi = "https://api.spotify.com/v1"; //type/id/params
const SpotifyStr = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;

let clientID, clientSecret;

export default class SpotifyApi {
    private ClientToken: string;
    private TokenTime: number;

    public Settings = (ClientID, ClientSecret) => {
        clientID = ClientID;
        clientSecret = ClientSecret;
    }

    public getTrack = async (url: string): Promise<OutTrack | null> => {
        const id = this.getID(url);
        const result = await this.AutoLogin(`${GetApi}/tracks/${id}`) as SpotifyTrack & FailResult;

        if (result?.error) return null;

        return {
            id: result.id,
            title: `${result.artists[0].name} - ${result.name}`,
            url: `https://open.spotify.com/track/${result.id}`,
            author: await this.getAuthorTrack(`https://open.spotify.com/artist/${result.artists[0].id}`),
            duration: {
                seconds: result.duration_ms / 1000
            },
            thumbnails: result.album.images[0],
            isValid: true,
            PrevFile: result.preview_url
        }
    };
    public getPlaylistTracks = async (url): Promise<OutPlaylist | null> => {
        try {
            const id = this.getID(url);
            const result = await this.AutoLogin(`${GetApi}/playlists/${id}`) as SpotifyPlaylist & FailResult;

            return {
                id: id,
                url: `https://open.spotify.com/playlist/${id}`,
                title: result.name,
                items: await Promise.all(result.tracks.items.map(async ({track}) => {
                    return {
                        id: track.id,
                        title: `${track.artists[0].name} - ${track.name}`,
                        url: `https://open.spotify.com/track/${track.id}`,
                        author: await this.getAuthorTrack(`https://open.spotify.com/artist/${track.artists[0].id}`),
                        duration: {
                            seconds: track.duration_ms / 1000
                        },
                        thumbnails: track.album.images[0],
                        isValid: true,
                        PrevFile: track.preview_url
                    }
                })),
                thumbnails: result.images[0],
                author: await this.getAuthorTrack(`https://open.spotify.com/artist/${result.owner.id}`, true)
            };
        } catch (e) {
            console.log(e)
            return null;
        }
    };
    private getAuthorTrack = async (url, isUser: boolean = false): Promise<OutAuthor> => {
        const id = this.getID(url);
        const result = await this.AutoLogin(`${GetApi}/${isUser ? "users" : "artists"}/${id}`) as (SpotifyArtist | SpotifyUser) & FailResult

        return {
            id: result.id,
            // @ts-ignore
            title: result.name || result.display_name,
            url: url,
            thumbnails: result.images[0],
            isVerified: result.followers.total > 2e3
        }
    };

    private getToken = async (): Promise<void> => {
        const body = new URLSearchParams();
        body.append('grant_type', 'client_credentials');

        const response = await fetch(`${ApiLink}/token`, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + this.encode(clientID + ':' + clientSecret)
            },body
        })
        const result = await response.json();
        this.TokenTime = Date.now() + result['expires_in'];
        this.ClientToken = result['access_token'];
    };
    private AutoLogin = async (url: string): Promise<SpotifyPlaylist & FailResult | SpotifyTrack & FailResult | SpotifyArtist & FailResult | SpotifyUser & FailResult> => {
        await this.login();
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + this.ClientToken
            }
        })
        return await response.json();
    };
    private login = async () => !this.isLoggedIn() ? await this.getToken() : null;
    private isLoggedIn = () => this.ClientToken !== undefined && this.TokenTime > Date.now() + 2;
    private encode = (str: any): string => Buffer.from(str).toString('base64');

    private getID = (url: string): string => {
        if (!url.match(SpotifyStr)) return undefined;
        if (typeof url !== 'string') return undefined;

        return new URL(url).pathname.split('/')[2];
    };
}

type SpotifyType = "track" | "playlist" | "album" | "artist" | "user";
type AlbumType = "single";

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
/*   interface Out   */
interface OutTrack {
    id: string,
    title: string,
    url: string,
    author: OutAuthor,
    duration: {
        seconds: number
    },
    thumbnails: AlbumImage,
    isValid: boolean,
    PrevFile: string
}
/* interface OutPlaylist */
interface OutPlaylist {
    id: string,
    url: string,
    title: string,
    items: OutTrack[],
    thumbnails: AlbumImage
    author: OutAuthor
}
/* interface OutAuthor */
interface OutAuthor {
    id: string,
    title: string,
    url: string,
    thumbnails: AlbumImage,
    isVerified: boolean
}