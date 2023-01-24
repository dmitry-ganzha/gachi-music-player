"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YandexMusic = void 0;
const DurationUtils_1 = require("@Managers/DurationUtils");
const _httpsClient_1 = require("@httpsClient");
function parseDuration(duration) {
    const parsedDuration = duration.split("PT")[1].replace(/[H,M]/gi, ":").split("S")[0];
    return `${DurationUtils_1.DurationUtils.ParsingTimeToNumber(parsedDuration)}`;
}
var API;
(function (API) {
    function Request(url, isFull = false) {
        return new Promise(async (resolve) => {
            const body = await _httpsClient_1.httpsClient.parseBody(url, { request: { headers: { "accept-encoding": "gzip, deflate, br" } } });
            if (!isFull) {
                const LightInfo = body.split("/><script class=\"light-data\" type=\"application/ld+json\" nonce=\"")[1].split("\" >")[1].split("</script><link href=\"/index.css?v=")[0];
                if (!LightInfo)
                    return resolve(Error("Not found information"));
                return resolve(JSON.parse(LightInfo));
            }
            const Full = body.split("\">var Mu=")[1]?.split(";</script><script src=\"https:")[0];
            if (!Full)
                return resolve(Error("Not found information"));
            return resolve(JSON.parse(Full).pageData);
        });
    }
    API.Request = Request;
})(API || (API = {}));
var YandexMusic;
(function (YandexMusic) {
    function getTrack(url) {
        return new Promise(async (resolve) => {
            const result = await API.Request(url);
            if (result instanceof Error)
                return resolve(null);
            return resolve({
                url, title: result.name,
                author: await getAuthor(result.byArtist.url),
                image: { url: result.inAlbum?.image },
                duration: { seconds: parseDuration(result.duration) }
            });
        });
    }
    YandexMusic.getTrack = getTrack;
    function getAlbum(url) {
        return new Promise(async (resolve) => {
            const result = await API.Request(url);
            if (result instanceof Error)
                return resolve(null);
            const Image = result?.image;
            const MainArtist = await getAuthor(result.byArtist.url);
            return resolve({
                url, title: result.name,
                image: { url: Image },
                author: MainArtist,
                items: result.track.map((track) => {
                    return {
                        url: track.url,
                        title: track.name,
                        author: MainArtist,
                        image: { url: Image },
                        duration: { seconds: parseDuration(track.duration) }
                    };
                })
            });
        });
    }
    YandexMusic.getAlbum = getAlbum;
    function SearchTracks(str) {
        return new Promise(async (resolve) => {
            const result = await API.Request(`https://music.yandex.ru/search?text=${str.split(" ").join("%20")}&type=tracks`, true);
            const tracks = [];
            let NumberTrack = 0;
            if (result instanceof Error)
                return resolve(null);
            for (const track of result.result.tracks.items) {
                if (NumberTrack === 15)
                    break;
                const Author = track.artists[0];
                NumberTrack++;
                tracks.push({
                    url: `https://music.yandex.ru/album/${track.albums.id}/track/${track.id}`,
                    title: track.title,
                    author: {
                        title: Author.name,
                        url: `https://music.yandex.ru/artist/${Author.id}`
                    },
                    duration: { seconds: (track.durationMs / 1000).toFixed(0) }
                });
            }
            return resolve(tracks);
        });
    }
    YandexMusic.SearchTracks = SearchTracks;
})(YandexMusic = exports.YandexMusic || (exports.YandexMusic = {}));
function getAuthor(url) {
    return new Promise(async (resolve) => {
        const result = await API.Request(url);
        if (result instanceof Error)
            return resolve(null);
        return resolve({
            url, title: result.name,
            image: { url: result.image },
            isVerified: true
        });
    });
}
