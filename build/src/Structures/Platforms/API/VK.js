"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VK = void 0;
const _httpsClient_1 = require("@httpsClient");
const _env_1 = require("@env");
const vkApiLink = "https://api.vk.com/method/";
const connectString = `?access_token=${_env_1.env.get("VK_TOKEN")}`;
function getID(url) {
    if (url.match(/\/audio/))
        return url.split("/audio")[1];
    return url.split("playlist/")[1];
}
var API;
(function (API) {
    function Request(method, type, options) {
        const url = `${vkApiLink}${method}.${type}${connectString}${options}&v=5.131`;
        return _httpsClient_1.httpsClient.parseJson(url, {
            request: { headers: { "accept-encoding": "gzip, deflate, br" } }
        });
    }
    API.Request = Request;
})(API || (API = {}));
var construct;
(function (construct) {
    function track(track) {
        const image = track?.album?.thumb;
        return {
            url: `https://vk.com/audio${track.owner_id}_${track.id}`,
            title: track.title,
            author: author(track),
            image: { url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined },
            duration: { seconds: track.duration.toFixed(0) },
            format: { url: track?.url }
        };
    }
    construct.track = track;
    function author(user) {
        const url = `https://vk.com/audio&q=${user.artist.replaceAll(" ", "").toLowerCase()}`;
        return { url, title: user.artist, isVerified: user.is_licensed };
    }
    construct.author = author;
})(construct || (construct = {}));
var VK;
(function (VK) {
    function getTrack(url) {
        const ID = getID(url);
        return new Promise(async (resolve) => {
            const result = await API.Request("audio", "getById", `&audios=${ID}`);
            if (!result || !result.response)
                return resolve(null);
            return resolve(construct.track(result.response.pop()));
        });
    }
    VK.getTrack = getTrack;
    function getPlaylist(url, options = { limit: 20 }) {
        const PlaylistFullID = getID(url).split("_");
        const playlist_id = PlaylistFullID[1];
        const owner_id = PlaylistFullID[0];
        const key = PlaylistFullID[2];
        return new Promise(async (resolve, reject) => {
            const result = await API.Request("audio", "getPlaylistById", `&owner_id=${owner_id}&playlist_id=${playlist_id}&access_key=${key}`);
            const items = await API.Request("audio", "get", `&owner_id=${owner_id}&album_id=${playlist_id}&count=${options.limit}&access_key=${key}`);
            if (result.error)
                throw reject(new Error(result.error.error_msg));
            if (!result?.response || !items?.response)
                return resolve(null);
            const playlist = result.response;
            const image = playlist?.thumbs?.length > 0 ? playlist?.thumbs[0] : null;
            return resolve({
                url, title: playlist.title,
                items: items.response.items.map(construct.track),
                image: { url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined }
            });
        });
    }
    VK.getPlaylist = getPlaylist;
    function SearchTracks(search, options = { limit: 15 }) {
        return new Promise(async (resolve, reject) => {
            const result = await API.Request("audio", "search", `&q=${search}`);
            if (result.error)
                throw reject(new Error(result.error.error_msg));
            if (!result?.response)
                return resolve(null);
            const trackConst = result.response.items.length;
            if (trackConst > options.limit)
                result.response.items.splice(options.limit - 1, trackConst - options.limit - 1);
            return resolve(result.response.items.map(construct.track));
        });
    }
    VK.SearchTracks = SearchTracks;
})(VK = exports.VK || (exports.VK = {}));
