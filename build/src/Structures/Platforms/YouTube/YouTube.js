"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YouTube = exports.getID = void 0;
const _httpsClient_1 = require("@httpsClient");
const Decipher_1 = require("./Decipher");
const VerAuthor = ["Verified", "Official Artist Channel"];
function getID(url, isPlaylist = false) {
    if (typeof url !== "string")
        return "Url is not string";
    const parsedLink = new URL(url);
    if (parsedLink.searchParams.get("list") && isPlaylist)
        return parsedLink.searchParams.get("list");
    else if (parsedLink.searchParams.get("v") && !isPlaylist)
        return parsedLink.searchParams.get("v");
    return parsedLink.pathname.split("/")[1];
}
exports.getID = getID;
var API;
(function (API) {
    function Request(type, url, options = { options: {}, request: {} }) {
        if (type === "JSON")
            return _httpsClient_1.httpsClient.parseJson(url, options);
        return _httpsClient_1.httpsClient.parseBody(url, {
            options: { userAgent: true, cookie: true }, request: {
                headers: {
                    "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        });
    }
    API.Request = Request;
})(API || (API = {}));
var construct;
(function (construct) {
    async function video(video) {
        return {
            url: `https://youtu.be/${video.videoId}`,
            title: video.title,
            duration: { seconds: video.lengthSeconds },
            image: video.thumbnail.thumbnails.pop(),
            author: await getChannel({ id: video.channelId, name: video.author }),
            isLive: video.isLiveContent
        };
    }
    construct.video = video;
    function playlist(video) {
        return {
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            title: video.title.runs[0].text,
            author: {
                title: video.shortBylineText.runs[0].text || undefined,
                url: `https://www.youtube.com${video.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
            },
            duration: { seconds: video.lengthSeconds ?? video.lengthText?.simpleText ?? 0 },
            image: {
                url: video.thumbnail.thumbnails.pop().url,
                height: video.thumbnail.thumbnails.pop()?.height,
                width: video.thumbnail.thumbnails.pop()?.width
            },
            isLive: video?.isLive || video?.is_live
        };
    }
    construct.playlist = playlist;
})(construct || (construct = {}));
var YouTube;
(function (YouTube) {
    function getVideo(url) {
        const ID = getID(url);
        return new Promise(async (resolve, reject) => {
            const page = await API.Request("STRING", `https://www.youtube.com/watch?v=${ID}&has_verified=1`);
            const result = page.split("var ytInitialPlayerResponse = ")?.[1]?.split(";</script>")[0].split(/(?<=}}});\s*(var|const|let)\s/)[0];
            if (!result)
                throw reject(new Error("Not found track data!"));
            const jsonResult = JSON.parse(result);
            if (jsonResult.playabilityStatus?.status !== "OK")
                throw reject(new Error(`Не удалось получить данные из-за: ${jsonResult.playabilityStatus.status}`));
            const details = jsonResult.videoDetails;
            let audios;
            if (details.isLiveContent)
                audios = { url: details.streamingData?.dashManifestUrl ?? null };
            else {
                const html5player = `https://www.youtube.com${page.split('"jsUrl":"')[1].split('"')[0]}`;
                audios = (await (0, Decipher_1.extractSignature)([...jsonResult.streamingData?.formats ?? [], ...jsonResult.streamingData?.adaptiveFormats ?? []], html5player));
            }
            return resolve({ ...await construct.video(details), format: audios });
        });
    }
    YouTube.getVideo = getVideo;
    function getPlaylist(url) {
        const ID = getID(url, true);
        return new Promise(async (resolve, reject) => {
            const page = await API.Request("STRING", `https://www.youtube.com/playlist?list=${ID}`);
            const result = page.split('var ytInitialData = ')[1].split(';</script>')[0].split(/;\s*(var|const|let)\s/)[0];
            if (!result)
                throw reject(new Error("Not found playlist data!"));
            const jsonResult = JSON.parse(result);
            const info = jsonResult.sidebar.playlistSidebarRenderer.items[0].playlistSidebarPrimaryInfoRenderer;
            const author = jsonResult.sidebar.playlistSidebarRenderer.items[1].playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer;
            const videos = jsonResult.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0]
                .itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;
            return resolve({
                title: info.title.runs[0].text, url,
                items: videos.map(({ playlistVideoRenderer }) => construct.playlist(playlistVideoRenderer)),
                author: await getChannel({ id: author.navigationEndpoint.browseEndpoint.browseId, name: author.title.runs[0].text }),
                image: info.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails.pop()
            });
        });
    }
    YouTube.getPlaylist = getPlaylist;
    async function SearchVideos(search, options = { limit: 15 }) {
        return new Promise(async (resolve, reject) => {
            const page = await API.Request("STRING", `https://www.youtube.com/results?search_query=${search.replaceAll(' ', '+')}`);
            const result = (page.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0];
            if (!result)
                throw reject(new Error("Not found search data!"));
            const details = JSON.parse(result)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents;
            if (!details)
                throw reject(new Error(`Не удалось найти: ${search}`));
            let num = 0, videos = [];
            for (let i = 0; i < details.length; i++) {
                if (num >= options.limit)
                    break;
                if (!details[i] || !details[i].videoRenderer)
                    continue;
                const video = details[i].videoRenderer;
                if (!video.videoId)
                    continue;
                num++;
                videos.push(construct.playlist(video));
            }
            return resolve(videos);
        });
    }
    YouTube.SearchVideos = SearchVideos;
})(YouTube = exports.YouTube || (exports.YouTube = {}));
function getChannel({ id, name }) {
    return new Promise(async (resolve) => {
        const channel = await API.Request("JSON", `https://www.youtube.com/channel/${id}/channels?flow=grid&view=0&pbj=1`, {
            request: {
                headers: {
                    "x-youtube-client-name": "1",
                    "x-youtube-client-version": "2.20201021.03.00",
                    "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        });
        const data = channel[1]?.response ?? channel?.response ?? null;
        const info = data?.header?.c4TabbedHeaderRenderer, Channel = data?.metadata?.channelMetadataRenderer, avatar = info?.avatar, badges = info?.badges;
        return resolve({
            title: Channel?.title ?? name ?? "Not found name",
            url: `https://www.youtube.com/channel/${id}`,
            image: avatar?.thumbnails.pop() ?? null,
            isVerified: !!badges?.find((badge) => VerAuthor.includes(badge?.metadataBadgeRenderer?.tooltip))
        });
    });
}
