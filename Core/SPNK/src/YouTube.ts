import {InputAuthor, InputFormat, InputPlaylist, InputTrack} from "../../Utils/TypesHelper";
import {httpsClient} from "../../httpsClient";
import {Utils} from "./youtube/Utils";
import {Decipher, YouTubeFormat} from "./youtube/decipher";

const VerAuthor = new Set(['Verified', 'Official Artist Channel']);
const DefaultLinkYouTube = 'https://www.youtube.com';

export const YouTube = {getVideo, getPlaylist, SearchVideos};

/**
 * @name getChannel
 * @description Получаем данные о пользователе
 * @param id {string} ID канала
 * @param name {string} Название канала
 */
async function getChannel({id, name}: ChannelPageBase): Promise<InputAuthor> {
    const channel = await new httpsClient().parseJson(`${DefaultLinkYouTube}/channel/${id}/channels?flow=grid&view=0&pbj=1`, {
        request: {
            headers: {
                'x-youtube-client-name': '1',
                'x-youtube-client-version': '2.20201021.03.00',
            },
            method: "GET"
        },
        options: {zLibEncode: true, english: true}
    }) as YouTubeChannelParse[];

    const data = channel[1]?.response || null as any;
    const info = data?.header?.c4TabbedHeaderRenderer, Channel = data?.metadata?.channelMetadataRenderer, avatar = info?.avatar, badges = info?.badges;

    return {
        id, title: Channel?.title ?? name ?? "Not found",
        url: `${DefaultLinkYouTube}/channel/${id}`,
        image: avatar?.thumbnails[2] ?? avatar?.thumbnails[1] ?? avatar?.thumbnails[0] ?? null,
        isVerified: !!badges?.find((badge: any) => VerAuthor.has(badge?.metadataBadgeRenderer?.tooltip))
    }
}
//====================== ====================== ====================== ======================

/**
 * @name getVideo
 * @description Получаем данные о видео
 * @param url {string} Ссылка на видео
 * @param options {Options} настройки
 */
async function getVideo(url: string, options: Options = {onlyFormats: false}): Promise<InputTrack | InputFormat> {
    const VideoID = await new Utils().getID(url);
    const body = await new httpsClient().parseBody(`${DefaultLinkYouTube}/watch?v=${VideoID}&has_verified=1`, {
        options: {
            userAgent: true, cookie: true, zLibEncode: true, english: true
        }
    });
    //if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw new Error('Google понял что я бот! Это может занять много времени!');

    const VideoRes = JSON.parse(body.split('var ytInitialPlayerResponse = ')?.[1]?.split(';</script>')[0].split(/;\s*(var|const|let)\s/)[0]);
    if (!VideoRes) throw new Error('Данные на странице не были найдены');

    if (VideoRes.playabilityStatus?.status !== 'OK') throw new Error(`Не удалось получить данные из-за: ${VideoRes.playabilityStatus.status}`);

    const html5player = `https://www.youtube.com${body.split('"jsUrl":"')[1].split('"')[0]}`;
    const videoDetails = VideoRes.videoDetails;
    let format: YouTubeFormat[] = [];

    const LiveData: LiveData = {
        isLive: videoDetails.isLiveContent,
        url: VideoRes.streamingData?.hlsManifestUrl || null
    };
    const VideoFormats: YouTubeFormat[] = (VideoRes.streamingData.formats && VideoRes.streamingData.adaptiveFormats).filter((d: any) => d?.mimeType?.includes("opus") || d?.mimeType?.includes("audio")) ?? [];

    if (!LiveData.isLive) {
        if (VideoFormats[0].signatureCipher || VideoFormats[0].cipher) {
            format = await new Decipher()._formats(VideoFormats, html5player);
        } else {
            format = [...VideoFormats];
        }
    }

    if (options?.onlyFormats) return format[0];

    const authorVideo = await getChannel({id: videoDetails.channelId, name: videoDetails.author});
    const VideoData: InputTrack = {
        id: VideoID,
        url: `${DefaultLinkYouTube}/watch?v=${VideoID}`,
        title: videoDetails.title,
        duration: {seconds: videoDetails.lengthSeconds},
        image: videoDetails.thumbnail.thumbnails[videoDetails.thumbnail.thumbnails.length - 1],
        author: authorVideo,
        isLive: videoDetails.isLiveContent,
        isPrivate: videoDetails.isPrivate,
    };

    return {
        ...VideoData,
        format: VideoData.isLive ? {url: LiveData.url, work: true} : format[0]
    };
}
//====================== ====================== ====================== ======================

/**
 * @name SearchVideos
 * @description Поиск видео на youtube
 * @param search {string} что ищем
 * @param options {SearchOptions} Настройки
 * @constructor
 */
async function SearchVideos(search: any, options: SearchOptions = {limit: 15, onlyLink: false}): Promise<string | InputTrack[]> {
    const body = await new httpsClient().parseBody(`${DefaultLinkYouTube}/results?search_query=${search.replaceAll(' ', '+')}`, {
        options: {userAgent: true, cookie: true, zLibEncode: true, english: true}
    });

    //if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw new Error('Google понял что я бот! Это может занять много времени!');

    const details = JSON.parse((body.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0]).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents

    if (!details) throw new Error(`Не удалось найти: ${search}`);

    if (options?.onlyLink) return `${DefaultLinkYouTube}/watch?v=${details.find((fn: any) => !!fn.videoRenderer).videoRenderer.videoId}`;
    return parsingVideos(details, options);
}
async function parsingVideos(details: any[], {limit}: SearchOptions, FakeBase: InputTrack[] = []): Promise<InputTrack[]> {
    let num = 0;

    for (let i = 0; i < details.length; i++) {
        if (num >= limit) break;
        if (!details[i] || !details[i].videoRenderer) continue;

        const video = details[i].videoRenderer;
        const author = video.ownerBadges && video.ownerBadges[0];

        if (!video.videoId) continue;
        num++;

        FakeBase.push({
            id: video.videoId,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            title: video.title.runs[0].text,
            author: {
                id: video.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
                title: video.ownerText.runs[0].text,
                url: `https://www.youtube.com${video.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
                image: video.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0],
                isVerified: author?.metadataBadgeRenderer?.tooltip === 'Verified' || author?.metadataBadgeRenderer?.tooltip === 'Official Artist Channel'
            },
            duration: {
                seconds: video.lengthText ? video.lengthText.simpleText : null
            },
            image: video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1]
        });
    }
    return FakeBase;
}
//====================== ====================== ====================== ======================

/**
 * @name getPlaylist
 * @description Получаем данные о плейлисте
 * @param url {string} Ссылка на плейлист
 */
async function getPlaylist(url: string): Promise<InputPlaylist> {
    const playlistID = await new Utils().getID(url, true);
    const body = await new httpsClient().parseBody(`${DefaultLinkYouTube}/playlist?list=${playlistID}`, {
        options: {userAgent: true, cookie: true, zLibEncode: true, english: true}
    });

    //if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw new Error('Google понял что я бот! Это может занять много времени!');

    const parsed = JSON.parse(`${body.split('{"playlistVideoListRenderer":{"contents":')[1].split('}],"playlistId"')[0]}}]`);
    const playlistDetails = JSON.parse(body.split('{"playlistSidebarRenderer":')[1].split("}};</script>")[0]).items;
    const playlistInfo = playlistDetails[0].playlistSidebarPrimaryInfoRenderer;
    const channel = playlistDetails[1]?.playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer.title.runs[0];

    return {
        id: playlistID,
        url: `${DefaultLinkYouTube}/playlist?list=${playlistID}`,
        title: playlistInfo?.title?.runs[0]?.text ?? 'Not found',
        items: await _parsingVideos(parsed),
        author: await getChannel({id: channel.navigationEndpoint.browseEndpoint.browseId, name: channel.text}),
        image: {
            url: (playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer?.thumbnail.thumbnails.length ? playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails[playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails.length - 1].url : null)?.split('?sqp=')[0]
        }
    }
}
async function _parsingVideos(parsed: any[], finder: InputTrack[] = []): Promise<InputTrack[]> {
    let num = 0;
    for (let i in parsed) {
        let video = parsed[i].playlistVideoRenderer;

        if (num >= 100) break;
        if (!video || !video.isPlayable) continue;
        num++;

        finder.push({
            id: video.videoId,
            title: video.title.runs[0].text,
            url: `${DefaultLinkYouTube}/watch?v=${video.videoId}`,
            duration: {
                seconds: video.lengthSeconds ?? 0
            },
            image: {
                url: video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].url,
                height: video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].height,
                width: video.thumbnail.thumbnails[video.thumbnail.thumbnails.length - 1].width
            },
            author: {
                id: video.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId || undefined,
                title: video.shortBylineText.runs[0].text || undefined,
                url: `https://www.youtube.com${video.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
            },
            isLive: video?.isLive || video?.is_live,
            isPrivate: video.isPlayable
        });
    }

    return finder;
}


/*
Interface getChannel
*/
interface ChannelPageBase {
    id: string;
    name?: string
}
interface YouTubeChannelParse {
    page: 'channel',
    rootVe: string,
    response: {
        metadata: {
            channelMetadataRenderer: {
                externalId: string,
                title: string,
                vanityChannelUrl: string,
                avatar: {
                    thumbnails: []
                }
            }
        },
        trackingParams: string
        header: {
            c4TabbedHeaderRenderer: {
                badges: {
                    metadataBadgeRenderer: {
                        tooltip: string
                    }
                }
            }
        }
    },
    xsrf_token: string,
    url: string,
    endpoint: {
        clickTrackingParams: string,
        commandMetadata: {},
        browseEndpoint: {}
    },
    timing: {
        info: {}
    }
}
/*============*/

/*
Interface getVideo
*/
interface LiveData {
    isLive: boolean,
    url: string | null
}
interface Options {
    onlyFormats: boolean
}
/*============*/

/*
Interface SearchVideos
*/
interface Options_Search {
    limit: number;
    onlyLink?: boolean
}
interface Options2_Search {
    limit?: number;
    onlyLink: boolean;
}
type SearchOptions = Options_Search | Options2_Search;
/*============*/