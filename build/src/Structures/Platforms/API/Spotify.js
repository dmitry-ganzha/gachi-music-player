"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Spotify = void 0;
const _httpsClient_1 = require("@httpsClient");
const _env_1 = require("@env");
const AccountUrl = "https://accounts.spotify.com/api";
const ApiUrl = "https://api.spotify.com/v1";
const SpotifyUrl = 'https://open.spotify.com';
const aut = _env_1.env.get("SPOTIFY_ID") + ":" + _env_1.env.get("SPOTIFY_SECRET");
const SpotifyRes = { token: "", time: 0 };
function getID(url) {
    if (typeof url !== "string")
        return undefined;
    return new URL(url).pathname.split('/')[2];
}
var API;
(function (API) {
    async function Request(method) {
        const isLoggedIn = SpotifyRes.token !== undefined && SpotifyRes.time > Date.now() + 2;
        if (!isLoggedIn)
            await getToken();
        return _httpsClient_1.httpsClient.parseJson(`${ApiUrl}/${method}`, {
            request: {
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": "Bearer " + SpotifyRes.token,
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        });
    }
    API.Request = Request;
    function getToken() {
        return _httpsClient_1.httpsClient.parseJson(`${AccountUrl}/token`, {
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
            SpotifyRes.time = Date.now() + result.expires_in;
            SpotifyRes.token = result.access_token;
        });
    }
    async function constructTrack(track) {
        const sortImages = track.album.images[0].width > track.album.images.pop().width ? track.album.images[0] : track.album.images.pop();
        return {
            title: track.name,
            url: track.external_urls.spotify,
            author: (await Promise.all([Spotify.getAuthorTrack(track.artists[0].external_urls.spotify, track?.artists[0]?.type !== "artist")]))[0],
            duration: { seconds: (track.duration_ms / 1000).toFixed(0) },
            image: sortImages,
        };
    }
    API.constructTrack = constructTrack;
})(API || (API = {}));
var Spotify;
(function (Spotify) {
    function getTrack(url) {
        const id = getID(url);
        return new Promise(async (resolve, reject) => {
            const result = await API.Request(`tracks/${id}`);
            if (!result || !result?.name)
                return resolve(null);
            if (result.error)
                throw reject(new Error(result.error.message));
            return resolve(API.constructTrack(result));
        });
    }
    Spotify.getTrack = getTrack;
    function getPlaylist(url, options = { limit: 50 }) {
        const id = getID(url);
        return new Promise(async (resolve, reject) => {
            const result = await API.Request(`playlists/${id}?offset=0&limit=${options.limit}`);
            if (!result || !result?.name)
                return resolve(null);
            if (result.error)
                throw reject(new Error(result.error.message));
            return resolve({
                url, title: result.name, image: result.images[0],
                items: await Promise.all(result.tracks.items.map(({ track }) => API.constructTrack(track))),
                author: (await Promise.all([getAuthorTrack(`${SpotifyUrl}/artist/${result.owner.id}`, result?.owner?.type !== "artist")]))[0]
            });
        });
    }
    Spotify.getPlaylist = getPlaylist;
    function getAlbum(url, options = { limit: 50 }) {
        const id = getID(url);
        return new Promise(async (resolve, reject) => {
            const result = await API.Request(`albums/${id}?offset=0&limit=${options.limit}`);
            if (!result || !result?.name)
                return resolve(null);
            if (result.error)
                throw reject(new Error(result.error.message));
            return resolve({
                url, title: result.name, image: result.images[0],
                items: await Promise.all(result.tracks.items.map(API.constructTrack)),
                author: (await Promise.all([getAuthorTrack(`${SpotifyUrl}/artist/${result?.artists[0].id}`, result?.artists[0]?.type !== "artist")]))[0]
            });
        });
    }
    Spotify.getAlbum = getAlbum;
    function SearchTracks(search, options = { limit: 15 }) {
        return new Promise(async (resolve, reject) => {
            const result = await API.Request(`search?q=${search}&type=track&limit=${options.limit}`);
            if (!result)
                return resolve(null);
            if (result.error)
                throw reject(new Error(result.error.message));
            return resolve(await Promise.all(result.tracks.items.map(API.constructTrack)));
        });
    }
    Spotify.SearchTracks = SearchTracks;
    function getAuthorTrack(url, isUser = false) {
        const id = getID(url);
        return new Promise(async (resolve, reject) => {
            const result = await API.Request(`${isUser ? "users" : "artists"}/${id}`);
            if (!result)
                return resolve(null);
            if (result.error)
                throw reject(new Error(result.error.message));
            return resolve({
                title: result?.name ?? result?.display_name, url,
                image: result.images[0],
                isVerified: result.followers.total >= 500
            });
        });
    }
    Spotify.getAuthorTrack = getAuthorTrack;
})(Spotify = exports.Spotify || (exports.Spotify = {}));
