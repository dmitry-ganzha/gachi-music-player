"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoundCloud = void 0;
const httpsClient_1 = require("../../../httpsClient");
const APiLink = "https://api-v2.soundcloud.com";
const clientID = '';
exports.SoundCloud = { getTrack, getPlaylist, SearchTracks };
function getTrack(url) {
    return new Promise(async (resolve) => {
        const ClientID = await getClientID();
        const result = await httpsClient_1.httpsClient.parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);
        if (!result?.id || !result)
            return resolve(null);
        return resolve({
            id: result.id, url,
            title: result.title,
            author: {
                id: result.user.id,
                url: result.user.permalink_url,
                title: result.user.username,
                image: {
                    url: ParseImageToFull(result.user.avatar_url)
                },
                isVerified: result.user.verified
            },
            image: {
                url: ParseImageToFull(result.artwork_url)
            },
            duration: {
                seconds: (result.duration / 1e3).toFixed(0)
            },
            format: await getFormat(result.media.transcodings, ClientID),
        });
    });
}
function getPlaylist(url) {
    return new Promise(async (resolve) => {
        const ClientID = await getClientID();
        const result = await httpsClient_1.httpsClient.parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);
        const PlaylistItems = [];
        if (!result?.id || !result)
            return resolve(null);
        for (let i in result.tracks) {
            const track = result.tracks[i];
            if (!track.user)
                continue;
            PlaylistItems.push(CreateInfoTrack(track));
        }
        return resolve({
            id: result.id, url,
            title: result.title,
            author: {
                id: result.user.id,
                url: result.user.permalink_url,
                title: result.user.username,
                image: {
                    url: ParseImageToFull(result.user.avatar_url)
                },
                isVerified: result.user.verified
            },
            image: {
                url: ParseImageToFull(result.artwork_url)
            },
            items: PlaylistItems
        });
    });
}
function SearchTracks(search, options = { limit: 15 }) {
    return new Promise(async (resolve) => {
        const result = await httpsClient_1.httpsClient.parseJson(`${APiLink}/search/tracks?q=${search}&client_id=${await getClientID()}&limit=${options.limit}`);
        const Items = [];
        if (!result)
            return resolve(null);
        for (let i in result.collection) {
            const track = result.collection[i];
            if (!track.user)
                continue;
            Items.push(CreateInfoTrack(track));
        }
        return resolve(Items);
    });
}
function getClientID() {
    return new Promise(async (resolve) => {
        if (clientID)
            return resolve(clientID);
        const body = await httpsClient_1.httpsClient.parseBody(`https://soundcloud.com/`, {
            options: {
                english: true,
                zLibEncode: true
            }
        });
        const BodySplit = body.split('<script crossorigin src="');
        const urls = [];
        BodySplit.forEach((r) => {
            if (r.startsWith('https')) {
                urls.push(r.split('"')[0]);
            }
        });
        const body2 = await httpsClient_1.httpsClient.parseBody(urls.pop());
        return resolve(body2.split(',client_id:"')[1].split('"')[0]);
    });
}
function CreateInfoTrack(result) {
    return {
        id: result.id,
        url: result.permalink_url,
        title: result.title,
        author: {
            id: result.user.id,
            url: result.user.permalink_url,
            title: result.user.username,
            image: {
                url: ParseImageToFull(result.user.avatar_url)
            },
            isVerified: result.user.verified
        },
        image: {
            url: ParseImageToFull(result.artwork_url)
        },
        duration: {
            seconds: (result.duration / 1e3).toFixed(0)
        }
    };
}
function getFormat(formats, ClientID) {
    return new Promise(async (resolve) => {
        const FilterFormats = formats.filter((d) => d.format.protocol === "progressive").pop() ?? formats[0];
        const EndFormat = await httpsClient_1.httpsClient.parseJson(`${FilterFormats.url}?client_id=${ClientID}`);
        return resolve({
            url: EndFormat.url,
            work: undefined
        });
    });
}
function ParseImageToFull(image) {
    if (!image)
        return image;
    const imageSplit = image.split('-');
    const FormatImage = image.split('.').pop();
    imageSplit[imageSplit.length - 1] = 'original';
    return `${imageSplit.join('-')}.${FormatImage}`;
}
