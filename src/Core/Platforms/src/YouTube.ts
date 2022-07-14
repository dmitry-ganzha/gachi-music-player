import {httpsClient} from "../../httpsClient";
import {Decipher, YouTubeFormat} from "./youtube/decipher";
import {InputAuthor, InputFormat, InputPlaylist, InputTrack} from "../../Utils/TypeHelper";

const VerAuthor = new Set(["Verified", "Official Artist Channel"]);
const YouTubeURL = "https://www.youtube.com";

export namespace YouTube {
    /**
     * @name getVideo
     * @description Получаем данные о видео
     * @param url {string} Ссылка на видео
     * @param options {Options} настройки
     */
    export function getVideo(url: string, options: Options = {onlyFormats: false}): Promise<InputTrack | InputFormat> {
        return new Promise(async (resolve, reject) => {
            const VideoID = getYouTubeID(url);
            const body = (await Promise.all([httpsClient.parseBody(`${YouTubeURL}/watch?v=${VideoID}&has_verified=1`, {
                options: { userAgent: true, cookie: true }, request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];

            if (body.includes("Our systems have detected unusual traffic from your computer network.")) throw reject('Google понял что я бот! Это может занять много времени!');

            const PlayerResponse = body.split('var ytInitialPlayerResponse = ')?.[1]?.split(';</script>')[0].split(/(?<=}}});\s*(var|const|let)\s/)[0];
            if (!PlayerResponse) throw new Error("Данные на странице не были найдены");

            const VideoFinalData = JSON.parse(PlayerResponse);
            if (VideoFinalData.playabilityStatus?.status !== "OK") throw reject(new Error(`Не удалось получить данные из-за: ${VideoFinalData.playabilityStatus.status}`));

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

            if (options?.onlyFormats) return resolve(format.pop() as InputFormat);

            const VideoData: InputTrack = {
                url: `${YouTubeURL}/watch?v=${VideoID}`,
                title: videoDetails.title,
                duration: {seconds: videoDetails.lengthSeconds},
                image: videoDetails.thumbnail.thumbnails.pop(),
                author: (await Promise.all([getChannel({ id: videoDetails.channelId, name: videoDetails.author })]))[0],
                isLive: videoDetails.isLiveContent,
                isPrivate: videoDetails.isPrivate,
            };

            return resolve({...VideoData, format: format.pop()});
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @name SearchVideos
     * @description Поиск видео на youtube
     * @param search {string} что ищем
     * @param options {SearchOptions} Настройки
     * @constructor
     */
    export function SearchVideos(search: string, options: SearchOptions = {limit: 15}): Promise<InputTrack[]> {
        return new Promise(async (resolve, reject) => {
            const SearchRes = (await Promise.all([httpsClient.parseBody(`${YouTubeURL}/results?search_query=${search.replaceAll(' ', '+')}`, {
                options: {userAgent: true, cookie: true}, request: {
                    headers: {
                        "x-youtube-client-name": "1",
                        "x-youtube-client-version": "2.20201021.03.00",
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];
            const SearchSplitter = (SearchRes.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0];
            const details = JSON.parse(SearchSplitter)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents;

            if (!details) throw reject(new Error(`Не удалось найти: ${search}`));

            return resolve((await Promise.all([parseSearchVideos(details, options)]))[0]);
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @name getPlaylist
     * @description Получаем данные о плейлисте
     * @param url {string} Ссылка на плейлист
     */
    export async function getPlaylist(url: string): Promise<InputPlaylist> {
        return new Promise(async (resolve, reject) => {
            const playlistID = getYouTubeID(url, true);
            const body = (await Promise.all([httpsClient.parseBody(`${YouTubeURL}/playlist?list=${playlistID}`, {
                options: {userAgent: true, cookie: true}, request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];

            if (body.includes("Our systems have detected unusual traffic from your computer network.")) throw reject("Google понял что я бот! Это может занять много времени!");

            const parsed = JSON.parse(`${body.split("{\"playlistVideoListRenderer\":{\"contents\":")[1].split("}],\"playlistId\"")[0]}}]`);
            const playlistDetails = JSON.parse(body.split("{\"playlistSidebarRenderer\":")[1].split("}};</script>")[0]).items;
            const playlistInfo = playlistDetails[0].playlistSidebarPrimaryInfoRenderer;
            const channel = (playlistDetails[1] ?? playlistDetails[0])?.playlistSidebarSecondaryInfoRenderer?.videoOwner?.videoOwnerRenderer.title.runs[0] ?? null;

            return resolve({
                url: `${YouTubeURL}/playlist?list=${playlistID}`,
                title: playlistInfo?.title?.runs[0]?.text ?? "Not found",
                items: (await Promise.all([parsePlaylistVideos(parsed)]))[0],
                author: channel === null ? null : (await Promise.all([getChannel({ id: channel.navigationEndpoint.browseEndpoint.browseId, name: channel.text })]))[0],
                image: {
                    url: playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer?.thumbnail.thumbnails?.pop().url?.split("?sqp=")[0]
                }
            });
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем ID
 * @param url {string} Ссылка
 * @param isPlaylist {boolean} Это плейлист
 */
function getYouTubeID(url: string, isPlaylist = false) {
    if (typeof url !== "string") return "Url is not string";
    const parsedLink = new URL(url);

    if (parsedLink.searchParams.get("list") && isPlaylist) return parsedLink.searchParams.get("list");
    else if (parsedLink.searchParams.get("v") && !isPlaylist) return parsedLink.searchParams.get("v");
    return parsedLink.pathname.split("/")[1];
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные о пользователе
 * @param id {string} ID канала
 * @param name {string} Название канала
 */
function getChannel({id, name}: ChannelPageBase): Promise<InputAuthor> {
    return new Promise(async (resolve) => {
        const channel: YouTubeChannelParse[] = (await Promise.all([httpsClient.parseJson(`${YouTubeURL}/channel/${id}/channels?flow=grid&view=0&pbj=1`, {
            request: {
                headers: {
                    "x-youtube-client-name": "1",
                    "x-youtube-client-version": "2.20201021.03.00",
                    "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                    "accept-encoding": "gzip, deflate, br"
                }
            }
        })]))[0];

        // @ts-ignore
        const data = channel[1]?.response ?? channel?.response ?? null as any;
        const info = data?.header?.c4TabbedHeaderRenderer, Channel = data?.metadata?.channelMetadataRenderer, avatar = info?.avatar, badges = info?.badges;

        return resolve({
            title: Channel?.title ?? name ?? "Not found",
            url: `${YouTubeURL}/channel/${id}`,
            image: avatar?.thumbnails.pop() ?? null,
            isVerified: !!badges?.find((badge: any) => VerAuthor.has(badge?.metadataBadgeRenderer?.tooltip))
        })
    })
}
//====================== ====================== ====================== ======================
/**
 * @description Парсим видео из поиска
 * @param videos Array<Videos>
 * @param limit Макс кол-во видео
 */
function parseSearchVideos(videos: any[], {limit}: SearchOptions): InputTrack[] {
    let num = 0, VideosEnd: InputTrack[] = [];

    for (let i = 0; i < videos.length; i++) {
        if (num >= limit) break;

        if (!videos[i] || !videos[i].videoRenderer) continue;

        const video = videos[i].videoRenderer;
        const author = video.ownerBadges && video.ownerBadges[0];

        if (!video.videoId) continue;
        num++;

        VideosEnd.push({
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            title: video.title.runs[0].text,
            author: {
                title: video.ownerText.runs[0].text,
                url: `https://www.youtube.com${video.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
                image: video.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails.pop(),
                isVerified: author?.metadataBadgeRenderer?.tooltip === "Verified" || author?.metadataBadgeRenderer?.tooltip === "Official Artist Channel"
            },
            duration: {
                seconds: video.lengthText ? video.lengthText.simpleText : null
            },
            image: video.thumbnail.thumbnails.pop()
        });
    }
    return VideosEnd;
}
//====================== ====================== ====================== ======================
/**
 * @description Парсим видео из плейлиста
 * @param videos Array<Videos>
 */
function parsePlaylistVideos(videos: any[]): InputTrack[] {
    let num = 0, VideosEnd: InputTrack[] = [];
    for (let i in videos) {
        let video = videos[i].playlistVideoRenderer;

        if (num >= 100) break;
        if (!video || !video.isPlayable) continue;
        num++;

        VideosEnd.push({
            title: video.title.runs[0].text,
            url: `${YouTubeURL}/watch?v=${video.videoId}`,
            duration: {
                seconds: video.lengthSeconds ?? 0
            },
            image: {
                url: video.thumbnail.thumbnails.pop().url,
                height: video.thumbnail.thumbnails.pop().height,
                width: video.thumbnail.thumbnails.pop().width
            },
            author: {
                title: video.shortBylineText.runs[0].text || undefined,
                url: `https://www.youtube.com${video.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
            },
            isLive: video?.isLive || video?.is_live,
            isPrivate: video.isPlayable
        });
    }

    return VideosEnd;
}
//====================== ====================== ====================== ======================


/*
Interface getChannel
*/
interface ChannelPageBase {
    id: string;
    name?: string;
}
interface YouTubeChannelParse {
    page: "channel",
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
}
interface Options2_Search {
    limit?: number;
    onlyLink: boolean;
}
type SearchOptions = Options_Search | Options2_Search;
/*============*/