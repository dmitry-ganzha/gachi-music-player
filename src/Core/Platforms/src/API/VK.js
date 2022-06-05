"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VK = void 0;
const httpsClient_1 = require("../../../httpsClient");
const Config_json_1 = __importDefault(require("../../../../../DataBase/Config.json"));
const vkApiLink = "https://api.vk.com/method/";
const connectString = `?access_token=${Config_json_1.default.vk.token}`;
exports.VK = { getTrack, getPlaylist, SearchTracks };
function getTrack(url) {
    return new Promise(async (resolve) => {
        const TrackID = getID(url);
        let Request = await RequestVK('audio', 'getById', `&audios=${TrackID}`);
        if (!Request || !Request?.response)
            return resolve(null);
        const track = Request?.response[0];
        const image = track?.album?.thumb;
        return resolve({
            id: track.id,
            url: `https://vk.com/audio${TrackID}`,
            title: track.title,
            author: {
                id: track.owner_id,
                url: ReplaceAuthorUrl(track.artist),
                title: track.artist,
                image: { url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined },
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
function SearchTracks(str, options = { limit: 15 }) {
    return new Promise(async (resolve) => {
        const items = [];
        const Request = await RequestVK('audio', 'search', `&q=${str}`);
        let NumberTrack = 0;
        if (!Request || !Request?.response)
            return null;
        for (let i in Request.response.items) {
            const track = Request.response.items[i];
            if (options.limit <= NumberTrack)
                break;
            NumberTrack++;
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
        return resolve({ items });
    });
}
function getPlaylist(url, options = { limit: 50 }) {
    return new Promise(async (resolve) => {
        const PlaylistFullID = getID(url).split("_");
        const playlist_id = PlaylistFullID[1];
        const owner_id = PlaylistFullID[0];
        const key = PlaylistFullID[2];
        const Request = await RequestVK('audio', 'getPlaylistById', `&owner_id=${owner_id}&playlist_id=${playlist_id}&access_key=${key}`);
        const itemsPlaylist = await RequestVK('audio', 'get', `&owner_id=${owner_id}&album_id=${playlist_id}&access_key=${key}&count=${options.limit}`);
        if (!Request.response || !itemsPlaylist.response || !Request || !itemsPlaylist)
            return resolve(null);
        const PlaylistData = Request.response;
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
                        image: { url: image?.photo_1200 ?? image?.photo_600 ?? image?.photo_300 ?? image?.photo_270 ?? undefined },
                        isVerified: track.is_licensed
                    },
                    image: undefined,
                    duration: { seconds: track.duration.toFixed(0) },
                };
            }),
            image: { url: PlaylistImage?.photo_1200 ?? PlaylistImage?.photo_600 ?? PlaylistImage?.photo_300 ?? PlaylistImage?.photo_270 ?? undefined }
        });
    });
}
function RequestVK(method, type, options) {
    return httpsClient_1.httpsClient.parseJson(CreateUrl(method, type, options), { options: { zLibEncode: true } });
}
function CreateUrl(method, type, options) {
    return `${vkApiLink}${method}.${type}${connectString}${options}&v=5.95`;
}
function getID(url) {
    if (url.match(/\/audio/))
        return url.split('/audio')[1];
    return url.split('playlist/')[1];
}
function ReplaceAuthorUrl(AuthorName) {
    return `https://vk.com/audio&q=${AuthorName.replaceAll(" ", "").toLowerCase()}`;
}
