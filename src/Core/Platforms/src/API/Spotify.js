"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spotify = void 0;
const httpsClient_1 = require("../../../httpsClient");
const Config_json_1 = __importDefault(require("../../../../../DataBase/Config.json"));
const ApiLink = "https://accounts.spotify.com/api";
const GetApi = "https://api.spotify.com/v1";
const DefaultUrlSpotify = 'https://open.spotify.com';
const SpotifyStr = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const clientID = Config_json_1.default.spotify.clientID;
const clientSecret = Config_json_1.default.spotify.clientSecret;
let Token = null;
let TokenTime = null;
exports.Spotify = { getTrack, getAlbum, getPlaylist, SearchTracks };
function getToken() {
    return httpsClient_1.httpsClient.parseJson(`${ApiLink}/token`, {
        request: {
            method: 'POST',
            headers: {
                'Accept': "application/json",
                'Authorization': `Basic ${Buffer.from(clientID + ':' + clientSecret).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: "grant_type=client_credentials"
        },
        options: { zLibEncode: true }
    }).then((result) => {
        TokenTime = Date.now() + result.expires_in;
        Token = result.access_token;
    });
}
function RequestSpotify(method) {
    return new Promise(async (resolve) => {
        await login();
        return httpsClient_1.httpsClient.parseJson(`${GetApi}/${method}`, {
            request: {
                method: "GET",
                headers: {
                    'Accept': "application/json",
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': "Bearer " + Token
                }
            },
            options: { zLibEncode: true }
        }).then((d) => {
            return resolve(d);
        });
    });
}
function getTrack(url) {
    return new Promise(async (resolve) => {
        const id = getID(url);
        const result = await RequestSpotify(`tracks/${id}`);
        if (!result || !result?.name)
            return resolve(null);
        return resolve({
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
        });
    });
}
function getPlaylist(url, options = { limit: 101 }) {
    return new Promise(async (resolve) => {
        try {
            const id = getID(url);
            const result = await RequestSpotify(`playlists/${id}?offset=0&limit=${options.limit}`);
            if (!result || !result?.name)
                return resolve(null);
            return resolve({
                id: id,
                url: url,
                title: result.name,
                items: await Promise.all(result.tracks.items.map(async ({ track }) => {
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
                    };
                })),
                image: result.images[0],
                author: (await Promise.all([getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.owner.id}`, result?.owner?.type !== "artist")]))[0]
            });
        }
        catch (e) {
            console.log(e);
            return resolve(null);
        }
    });
}
function getAlbum(url, options = { limit: 101 }) {
    return new Promise(async (resolve) => {
        try {
            const id = getID(url);
            const result = (await Promise.all([RequestSpotify(`albums/${id}?offset=0&limit=${options.limit}`)]))[0];
            if (!result || !result?.name)
                return resolve(null);
            return resolve({
                id: id,
                url: url,
                title: result.name,
                items: await Promise.all(result.tracks.items.map(async (track) => {
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
                    };
                })),
                image: result?.images[0],
                author: (await Promise.all([getAuthorTrack(`${DefaultUrlSpotify}/artist/${result.artists[0].id}`, result?.artists[0]?.type !== "artist")]))[0]
            });
        }
        catch (e) {
            console.log(e);
            return resolve(null);
        }
    });
}
function SearchTracks(search, options = { limit: 15 }) {
    return new Promise(async (resolve) => {
        try {
            const result = (await Promise.all([RequestSpotify(`search?q=${search}&type=track&limit=${options.limit}`)]))[0];
            if (!result)
                return resolve(null);
            return resolve({
                items: await Promise.all(result.tracks.items.map(async (track) => {
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
            });
        }
        catch (e) {
            console.log(e);
            return resolve(null);
        }
    });
}
function getAuthorTrack(url, isUser = false) {
    return new Promise(async (resolve) => {
        const id = getID(url);
        const result = (await Promise.all([RequestSpotify(`${isUser ? "users" : "artists"}/${id}`)]))[0];
        return resolve({
            id, title: result?.name ?? result?.display_name, url,
            image: result.images[0],
            isVerified: result.followers.total >= 500
        });
    });
}
function login() {
    return !isLoggedIn() ? getToken() : null;
}
function isLoggedIn() {
    return Token !== undefined && TokenTime > Date.now() + 2;
}
function getID(url) {
    if (typeof url !== 'string')
        return undefined;
    if (!url.match(SpotifyStr))
        return undefined;
    return new URL(url).pathname.split('/')[2];
}
