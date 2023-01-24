"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundCloud = void 0;
const _httpsClient_1 = require("@httpsClient");
const _env_1 = require("@env");
const APiLink = "https://api-v2.soundcloud.com";
const clientID = _env_1.env.get("SOUNDCLOUD");
var API;
(function (API) {
    function Request(method) {
        return new Promise(async (resolve) => {
            const ClientID = await getClientID();
            const result = await _httpsClient_1.httpsClient.parseJson(`${APiLink}/${method}&client_id=${ClientID}`);
            return resolve({ result, ClientID });
        });
    }
    API.Request = Request;
    function getFormat(formats, ClientID) {
        const filterFormats = formats.filter((d) => d.format.protocol === "progressive").pop() ?? formats[0];
        return new Promise(async (resolve) => {
            const EndFormat = await _httpsClient_1.httpsClient.parseJson(`${filterFormats.url}?client_id=${ClientID}`);
            return resolve(EndFormat.url);
        });
    }
    API.getFormat = getFormat;
    function getClientID() {
        if (clientID)
            return clientID;
        return new Promise(async (resolve) => {
            const parsedPage = await _httpsClient_1.httpsClient.parseBody("https://soundcloud.com/", {
                options: { userAgent: true },
                request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            });
            if (!parsedPage)
                return resolve(null);
            const split = parsedPage.split("<script crossorigin src=\"");
            const urls = [];
            split.forEach((r) => r.startsWith("https") ? urls.push(r.split("\"")[0]) : null);
            const parsedPage2 = await _httpsClient_1.httpsClient.parseBody(urls.pop());
            return resolve(parsedPage2.split(",client_id:\"")[1].split("\"")[0]);
        });
    }
})(API || (API = {}));
var construct;
(function (construct) {
    function track(track, url) {
        if (!track.user)
            return;
        return {
            url: url ?? track.permalink_url,
            title: track.title,
            author: author(track.user),
            image: parseImage(track.artwork_url),
            duration: { seconds: (track.duration / 1e3).toFixed(0) }
        };
    }
    construct.track = track;
    function author(user) {
        return {
            url: user.permalink_url,
            title: user.username,
            image: parseImage(user.avatar_url),
            isVerified: user.verified
        };
    }
    construct.author = author;
    function parseImage(image) {
        if (!image)
            return { url: image };
        const imageSplit = image.split("-");
        const FormatImage = image.split(".").pop();
        imageSplit[imageSplit.length - 1] = "original";
        return { url: `${imageSplit.join("-")}.${FormatImage}` };
    }
    construct.parseImage = parseImage;
})(construct || (construct = {}));
var SoundCloud;
(function (SoundCloud) {
    function getTrack(url) {
        return new Promise(async (resolve) => {
            const { result, ClientID } = await API.Request(`resolve?url=${url}`);
            if (!result?.id || !result)
                return resolve(null);
            const format = await API.getFormat(result.media.transcodings, ClientID);
            return resolve({ ...construct.track(result, url), format: { url: format } });
        });
    }
    SoundCloud.getTrack = getTrack;
    function getPlaylist(url) {
        return new Promise(async (resolve) => {
            const { result } = await API.Request(`resolve?url=${url}`);
            if (!result?.id || !result)
                return resolve(null);
            if (result.tracks === undefined)
                return getTrack(url).then(resolve);
            return resolve({
                url,
                title: result.title,
                author: construct.author(result.user),
                image: construct.parseImage(result.artwork_url),
                items: result.tracks.map(construct.track)
            });
        });
    }
    SoundCloud.getPlaylist = getPlaylist;
    function SearchTracks(search, options = { limit: 15 }) {
        return new Promise(async (resolve) => {
            const { result } = await API.Request(`search/tracks?q=${search}&limit=${options.limit}`);
            if (!result)
                return resolve(null);
            return resolve(result.collection.map(construct.track));
        });
    }
    SoundCloud.SearchTracks = SearchTracks;
})(SoundCloud = exports.SoundCloud || (exports.SoundCloud = {}));
