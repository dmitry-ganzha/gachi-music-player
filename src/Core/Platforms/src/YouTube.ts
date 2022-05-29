import {httpsClient} from "../../httpsClient";
import {Utils} from "./youtube/Utils";
import {Decipher, YouTubeFormat} from "./youtube/decipher";
import {InputAuthor, InputFormat, InputPlaylist, InputTrack} from "../../Utils/TypeHelper";

const VerAuthor = new Set(['Verified', 'Official Artist Channel']);
const DefaultLinkYouTube = 'https://www.youtube.com';

export const YouTube = {getVideo, getPlaylist, SearchVideos};

/**
 * @name getChannel
 * @description Получаем данные о пользователе
 * @param id {string} ID канала
 * @param name {string} Название канала
 */
function getChannel({id, name}: ChannelPageBase): Promise<InputAuthor> {
    return new Promise(async (resolve) => {
        const channel: YouTubeChannelParse[] = (await Promise.all([httpsClient.parseJson(`${DefaultLinkYouTube}/channel/${id}/channels?flow=grid&view=0&pbj=1`, {
            options: {zLibEncode: true, english: true, YouTubeClient: true}
        })]))[0];

        // @ts-ignore
        const data = channel[1]?.response ?? channel?.response ?? null as any;
        const info = data?.header?.c4TabbedHeaderRenderer, Channel = data?.metadata?.channelMetadataRenderer,
              avatar = info?.avatar, badges = info?.badges;

        return resolve({
            id, title: Channel?.title ?? name ?? "Not found",
            url: `${DefaultLinkYouTube}/channel/${id}`,
            image: avatar?.thumbnails.pop() ?? null,
            isVerified: !!badges?.find((badge: any) => VerAuthor.has(badge?.metadataBadgeRenderer?.tooltip))
        })
    })
}
//====================== ====================== ====================== ======================
/**
 * @name getVideo
 * @description Получаем данные о видео
 * @param url {string} Ссылка на видео
 * @param options {Options} настройки
 */
function getVideo(url: string, options: Options = {onlyFormats: false}): Promise<InputTrack | InputFormat> {
    return new Promise(async (resolve, reject) => {
        const VideoID = new Utils().getID(url);
        const body = (await Promise.all([httpsClient.parseBody(`${DefaultLinkYouTube}/watch?v=${VideoID}&has_verified=1`, {
            options: { userAgent: true, zLibEncode: true, english: true, cookie: true }
        })]))[0];

        if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw reject(new Error('Google понял что я бот! Это может занять много времени!'));

        let Token = body.match(/(["'])ID_TOKEN\1[:,]\s?"([^"]+)"/);

        const VideoRes: any[] = await httpsClient.parseJson(`${DefaultLinkYouTube}/watch?v=${VideoID}?flow=grid&view=0&pbj=1`, {
            options: {YouTubeClient: true, cookie: true}, Token: Token.length >= 3 ? Token[2] : null
        });
        const VideoFinalData = VideoRes?.filter((d) => d.playerResponse !== undefined)[0]?.playerResponse;

        if (!VideoFinalData) throw reject(new Error('Данные на странице не были найдены'));
        if (VideoFinalData.playabilityStatus?.status !== 'OK') throw reject(new Error(`Не удалось получить данные из-за: ${VideoFinalData.playabilityStatus.status}`));

        const html5player = `https://www.youtube.com${body.split('"jsUrl":"')[1].split('"')[0]}`;
        const videoDetails = VideoFinalData.videoDetails;
        let format: YouTubeFormat[];

        const LiveData: LiveData = {
            isLive: videoDetails.isLiveContent,
            url: VideoFinalData.streamingData?.hlsManifestUrl ?? null //dashManifestUrl, hlsManifestUrl
        };

        const VideoFormats: YouTubeFormat[] = [...VideoFinalData.streamingData.formats ?? [], ...VideoFinalData.streamingData.adaptiveFormats ?? []].filter((d: any) => d?.mimeType?.match(/opus/) || d?.mimeType?.match(/audio/)) ?? [];

        if (!LiveData.isLive) {
            if (VideoFormats[0].signatureCipher || VideoFormats[0].cipher) format = (await Promise.all([Decipher(VideoFormats, html5player)]))[0];
            else format = [...VideoFormats];
        } else format = [{url: LiveData.url, work: true}];

        if (options?.onlyFormats) return resolve(format.pop());

        const authorVideo = (await Promise.all([getChannel({ id: videoDetails.channelId, name: videoDetails.author })]))[0];
        const VideoData: InputTrack = {
            id: VideoID,
            url: `${DefaultLinkYouTube}/watch?v=${VideoID}`,
            title: videoDetails.title,
            duration: {seconds: videoDetails.lengthSeconds},
            image: videoDetails.thumbnail.thumbnails.pop(),
            author: authorVideo,
            isLive: videoDetails.isLiveContent,
            isPrivate: videoDetails.isPrivate,
        };

        return resolve({...VideoData, format: format.pop()});
    })
}
//====================== ====================== ====================== ======================
/**
 * @name SearchVideos
 * @description Поиск видео на youtube
 * @param search {string} что ищем
 * @param options {SearchOptions} Настройки
 * @constructor
 */
function SearchVideos(search: string, options: SearchOptions = {limit: 15}): Promise<InputTrack[]> {
    return new Promise(async (resolve, reject) => {
        const body = (await Promise.all([httpsClient.parseBody(`${DefaultLinkYouTube}/results?search_query=${search.replaceAll(' ', '+')}`, {
            options: {userAgent: true, YouTubeClient: true, zLibEncode: true, english: true}
        })]))[0];

        if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw reject(new Error('Google понял что я бот! Это может занять много времени!'));

        const details = JSON.parse((body.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0]).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents

        if (!details) throw reject(new Error(`Не удалось найти: ${search}`));

        return resolve((await Promise.all([parsingVideos(details, options)]))[0]);
    })
}
function parsingVideos(details: any[], {limit}: SearchOptions, FakeBase: InputTrack[] = []): InputTrack[] {
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
                image: video.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails.pop(),
                isVerified: author?.metadataBadgeRenderer?.tooltip === 'Verified' || author?.metadataBadgeRenderer?.tooltip === 'Official Artist Channel'
            },
            duration: {
                seconds: video.lengthText ? video.lengthText.simpleText : null
            },
            image: video.thumbnail.thumbnails.pop()
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
    return new Promise(async (resolve, reject) => {
        const playlistID = new Utils().getID(url, true);
        const body = (await Promise.all([httpsClient.parseBody(`${DefaultLinkYouTube}/playlist?list=${playlistID}`, {
            options: {userAgent: true, YouTubeClient: true, zLibEncode: true, english: true}
        })]))[0];

        if (body.includes('Our systems have detected unusual traffic from your computer network.')) throw reject(new Error('Google понял что я бот! Это может занять много времени!'));

        const parsed = JSON.parse(`${body.split('{"playlistVideoListRenderer":{"contents":')[1].split('}],"playlistId"')[0]}}]`);
        const playlistDetails = JSON.parse(body.split('{"playlistSidebarRenderer":')[1].split("}};</script>")[0]).items;
        const playlistInfo = playlistDetails[0].playlistSidebarPrimaryInfoRenderer;
        const channel = (playlistDetails[1] ?? playlistDetails[0])?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer.title.runs[0] ?? null;

        return resolve({
            id: playlistID,
            url: `${DefaultLinkYouTube}/playlist?list=${playlistID}`,
            title: playlistInfo?.title?.runs[0]?.text ?? 'Not found',
            items: (await Promise.all([_parsingVideos(parsed)]))[0],
            author: channel === null ? null : (await Promise.all([getChannel({ id: channel.navigationEndpoint.browseEndpoint.browseId, name: channel.text })]))[0],
            image: {
                url: playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer?.thumbnail.thumbnails?.pop().url?.split('?sqp=')[0]
            }
        })
    })
}
function _parsingVideos(parsed: any[], finder: InputTrack[] = []): InputTrack[] {
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
                url: video.thumbnail.thumbnails.pop().url,
                height: video.thumbnail.thumbnails.pop().height,
                width: video.thumbnail.thumbnails.pop().width
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
//====================== ====================== ====================== ======================


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