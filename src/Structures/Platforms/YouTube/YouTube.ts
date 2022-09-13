import {httpsClient} from "../../../Core/httpsClient";
import {Decipher, YouTubeFormat} from "./Decipher";
import {InputAuthor, InputTrack} from "../../../AudioPlayer/Structures/Queue/Song";

const VerAuthor = new Set(["Verified", "Official Artist Channel"]);

export namespace YouTube {
    /**
     * @description Получаем данные о видео
     * @param url {string} Ссылка на видео
     */
    export function getVideo(url: string): Promise<InputTrack> {
        return new Promise(async (resolve, reject) => {
            const VideoID = Utils.getID(url);
            const body = (await Promise.all([httpsClient.parseBody(`https://www.youtube.com/watch?v=${VideoID}&has_verified=1`, {
                options: { userAgent: true, cookie: true }, request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];
            const PlayerResponse = body.split('var ytInitialPlayerResponse = ')?.[1]?.split(';</script>')[0].split(/(?<=}}});\s*(var|const|let)\s/)[0];
            if (!PlayerResponse) return reject(new Error("Данные на странице не были найдены"));

            const VideoFinalData = JSON.parse(PlayerResponse);
            if (VideoFinalData.playabilityStatus?.status !== "OK") throw reject(new Error(`Не удалось получить данные из-за: ${VideoFinalData.playabilityStatus.status}`));

            const videoDetails = VideoFinalData.videoDetails;
            let audioFormats: YouTubeFormat;

            if (!videoDetails.isLiveContent) {
                const html5player = `https://www.youtube.com${body.split('"jsUrl":"')[1].split('"')[0]}`;
                const allFormats = [...VideoFinalData.streamingData?.formats, ...VideoFinalData.streamingData?.adaptiveFormats];
                const FindOpus: YouTubeFormat[] = allFormats.filter((format: YouTubeFormat) => format.mimeType?.match(/opus/) || format?.mimeType?.match(/audio/));

                audioFormats = (await Promise.all([Decipher.parseFormats(FindOpus, html5player)]))[0].pop();
            } else audioFormats = {url: VideoFinalData.streamingData?.dashManifestUrl ?? null}; //dashManifestUrl, hlsManifestUrl

            return resolve({
                url: `https://youtu.be/${VideoID}`,
                title: videoDetails.title,
                duration: {seconds: videoDetails.lengthSeconds},
                image: videoDetails.thumbnail.thumbnails.pop(),
                author: (await Promise.all([Utils.getChannel({ id: videoDetails.channelId, name: videoDetails.author })]))[0],
                isLive: videoDetails.isLiveContent,
                format: audioFormats
            });
        });
    }
    /**
     * @description Поиск видео на youtube
     * @param search {string} что ищем
     * @param options {limit} Настройки
     * @constructor
     */
    export async function SearchVideos(search: string, options = {limit: 15}): Promise<any> {
        return new Promise(async (resolve, reject) => {
            const SearchRes = (await Promise.all([httpsClient.parseBody(`https://www.youtube.com/results?search_query=${search.replaceAll(' ', '+')}`, {
                options: {userAgent: true, cookie: true}, request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];
            const SearchSplitter = (SearchRes.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0];
            const details = JSON.parse(SearchSplitter)?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents;

            if (!details) throw reject(new Error(`Не удалось найти: ${search}`));

            return resolve(parse.SearchVideos(details, options));
        });
    }
    /**
     * @description Получаем данные о плейлисте
     * @param url {string} Ссылка на плейлист
     */
    export async function getPlaylist(url: string): Promise<any> {
        return new Promise(async (resolve) => {
            const playlistID = Utils.getID(url, true);
            const body = (await Promise.all([httpsClient.parseBody(`https://www.youtube.com/playlist?list=${playlistID}`, {
                options: {userAgent: true, cookie: true}, request: {
                    headers: {
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];

            const jsonPage = JSON.parse(body.split('var ytInitialData = ')[1].split(';</script>')[0].split(/;\s*(var|const|let)\s/)[0]);
            const playlistInfo = jsonPage.sidebar.playlistSidebarRenderer.items[0].playlistSidebarPrimaryInfoRenderer;
            const playlistAuthor = jsonPage.sidebar.playlistSidebarRenderer.items[1].playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer;

            const Videos = jsonPage.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0]
                .itemSectionRenderer.contents[0].playlistVideoListRenderer.contents;

            return resolve({
                title: playlistInfo.title.runs[0].text, url,
                items: parse.PlaylistVideos(Videos),
                author: {
                    title: playlistAuthor.title.runs[0].text,
                    url: `https://www.youtube.com/channel/${playlistAuthor.navigationEndpoint.browseEndpoint.browseId}`,
                    image: playlistAuthor.thumbnail.thumbnails.pop(),
                    isVerified: undefined
                },
                image: playlistInfo.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail
            });
        });
    }
}

namespace Utils {
    /**
     * @description Получаем ID
     * @param url {string} Ссылка
     * @param isPlaylist {boolean} Это плейлист
     */
    export function getID(url: string, isPlaylist = false) {
        if (typeof url !== "string") return "Url is not string";
        const parsedLink = new URL(url);

        if (parsedLink.searchParams.get("list") && isPlaylist) return parsedLink.searchParams.get("list");
        else if (parsedLink.searchParams.get("v") && !isPlaylist) return parsedLink.searchParams.get("v");
        return parsedLink.pathname.split("/")[1];
    }
    /**
     * @description Получаем данные о пользователе
     * @param id {string} ID канала
     * @param name {string} Название канала
     */
    export function getChannel({id, name}: ChannelPageBase): Promise<InputAuthor> {
        return new Promise(async (resolve) => {
            const channel: any[] | any = (await Promise.all([httpsClient.parseJson(`https://www.youtube.com/channel/${id}/channels?flow=grid&view=0&pbj=1`, {
                request: {
                    headers: {
                        "x-youtube-client-name": "1",
                        "x-youtube-client-version": "2.20201021.03.00",
                        "accept-language": "en-US,en;q=0.9,en-US;q=0.8,en;q=0.7",
                        "accept-encoding": "gzip, deflate, br"
                    }
                }
            })]))[0];

            const data = channel[1]?.response ?? channel?.response ?? null as any;
            const info = data?.header?.c4TabbedHeaderRenderer, Channel = data?.metadata?.channelMetadataRenderer, avatar = info?.avatar, badges = info?.badges;

            return resolve({
                title: Channel?.title ?? name ?? "Not found",
                url: `https://www.youtube.com/channel/${id}`,
                image: avatar?.thumbnails.pop() ?? null,
                isVerified: !!badges?.find((badge: any) => VerAuthor.has(badge?.metadataBadgeRenderer?.tooltip))
            });
        });
    }
}

namespace parse {
    /**
     * @description Парсим видео из поиска
     * @param videos {Array<any>} Array видео которое надо изменить на InputTrack
     * @param limit {number} Макс кол-во видео
     */
    export function SearchVideos(videos: any[], {limit}: {limit: number}): InputTrack[] {
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
     * @param videos {Array<any>} Array видео которое надо изменить на InputTrack
     */
    export function PlaylistVideos(videos: any[]): InputTrack[] {
        let num = 0, VideosEnd: InputTrack[] = [];
        for (let i in videos) {
            let video = videos[i].playlistVideoRenderer;

            if (num >= 100) break;
            if (!video || !video.isPlayable) continue;
            num++;

            VideosEnd.push({
                title: video.title.runs[0].text,
                url: `https://www.youtube.com/watch?v=${video.videoId}`,
                duration: { seconds: video.lengthSeconds ?? 0 },
                image: {
                    url: video.thumbnail.thumbnails.pop().url,
                    height: video.thumbnail.thumbnails.pop().height,
                    width: video.thumbnail.thumbnails.pop().width
                },
                author: {
                    title: video.shortBylineText.runs[0].text || undefined,
                    url: `https://www.youtube.com${video.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
                },
                isLive: video?.isLive || video?.is_live
            });
        }

        return VideosEnd;
    }
}

interface ChannelPageBase {
    id: string;
    name?: string;
}