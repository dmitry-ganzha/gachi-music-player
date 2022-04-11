import {httpsClient} from "../../../httpsClient";
import {InputPlaylist, InputTrack} from "../../../Utils/TypeHelper";

const APiLink = "https://api-v2.soundcloud.com";
const clientID = '';
export const SoundCloud = {getTrack, getPlaylist, SearchTracks};

async function getTrack(url: string): Promise<InputTrack> {
    const ClientID = await getClientID();
    const result = await new httpsClient().parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);

    return {
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
    }
}

async function getPlaylist(url: string): Promise<InputPlaylist> {
    const ClientID = await getClientID()
    const result = await new httpsClient().parseJson(`${APiLink}/resolve?url=${url}&client_id=${ClientID}`);
    const PlaylistItems: InputTrack[] = [];


    for (let i in result.tracks) {
        const track = result.tracks[i];

        if (!track.user) continue;

        PlaylistItems.push(CreateInfoTrack(track));
    }

    return {
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
    }
}

async function SearchTracks(search: string, options = {limit: 15}) {
    const result = await new httpsClient().parseJson(`${APiLink}/search/tracks?q=${search}&client_id=${await getClientID()}&limit=${options.limit}`);
    const Items: InputTrack[] = [];


    for (let i in result.collection) {
        const track = result.collection[i];

        if (!track.user) continue;

        Items.push(CreateInfoTrack(track));
    }

    return Items;
}

async function getClientID() {
    if (clientID) return clientID;

    const body = await new httpsClient().parseBody(`https://soundcloud.com/`);
    const BodySplit = body.split('<script crossorigin src="');
    const urls: string[] = [];
    BodySplit.forEach((r) => {
        if (r.startsWith('https')) {
            urls.push(r.split('"')[0]);
        }
    });
    const body2 = await new httpsClient().parseBody(urls[urls.length - 1]);
    return body2.split(',client_id:"')[1].split('"')[0];
}


function CreateInfoTrack(result: any): InputTrack {
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
    }
}

async function getFormat(formats: SoundCloudFormat[], ClientID: string) {
    const FilterFormats = formats.filter((d) => d.format.protocol === "progressive").pop() ?? formats[0];
    const EndFormat = await new httpsClient().parseJson(`${FilterFormats.url}?client_id=${ClientID}`);

    return {
        url: EndFormat.url,
        isWork: true
    }
}

function ParseImageToFull(image: string) {
    if (!image) return image;

    const imageSplit = image.split('-');
    const FormatImage = image.split('.').pop();

    imageSplit[imageSplit.length - 1] = 'original';

    return `${imageSplit.join('-')}.${FormatImage}`;
}

interface SoundCloudFormat {
    url: string,
    preset: 'mp3_0_0' | 'opus_0_0',
    duration: number,
    snipped: boolean,
    format: {
        protocol: 'hls' | 'progressive',
        mime_type: 'audio/mpeg'
    },
    quality: 'sq'
}