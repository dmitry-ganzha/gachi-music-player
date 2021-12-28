import {Utils} from "../Utils";
import {ChannelData, parseChannelPage} from "./Channel";
import {VideoData} from "./Video";

export class ParsePlaylistPage {
    public run = async (url: string): Promise<{error: boolean, message: any} | PlaylistData> =>
        new Utils().RequestExp(url,{ headers: {'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7'}}).then(async (body: string) => {
            if (body.indexOf('Our systems have detected unusual traffic from your computer network.') !== -1) throw new Error('Google капча: Google понял что я бот! Это может занять много времени!');

            let parsed = JSON.parse(`${body.split('{"playlistVideoListRenderer":{"contents":')[1].split('}],"playlistId"')[0]}}]`);
            let playlistDetails = JSON.parse(body.split('{"playlistSidebarRenderer":')[1].split("}};</script>")[0]).items;
            let playlistID = new Utils().getID(url);

            return {
                id: playlistID,
                title: this._playlistTitle(playlistDetails[0].playlistSidebarPrimaryInfoRenderer),
                items: await this._parsePlaylistItem(parsed) ?? [],
                url: `https://www.youtube.com/playlist?list=${playlistID}`,
                author: await new parseChannelPage().callback({channelId: playlistDetails[1]?.playlistSidebarSecondaryInfoRenderer.videoOwner.videoOwnerRenderer.title.runs[0].navigationEndpoint.browseEndpoint.browseId}),
                thumbnail: this._thumbnail(playlistDetails[0].playlistSidebarPrimaryInfoRenderer)?.split('?sqp=')[0]
            };
        });
    private _playlistTitle = (data: any): string => data.titleForm?.inlineFormRenderer?.textDisplayed?.simpleText === undefined ? 'Not found' : data.titleForm?.inlineFormRenderer?.textDisplayed?.simpleText;
    private _thumbnail = (data: any): string | null => data.thumbnailRenderer.playlistVideoThumbnailRenderer?.thumbnail.thumbnails.length ? data.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails[data.thumbnailRenderer.playlistVideoThumbnailRenderer.thumbnail.thumbnails.length - 1].url : null;
    private _parsePlaylistItem = async (parsed: any): Promise<VideoData[]> => await Promise.all(parsed.map(async (video: any) => new _parseVideos()._parse(video.playlistVideoRenderer)));
}

class _parseVideos {
    public _parse = async (video: any) => !video || !video.isPlayable ? null : this._parseVideo(video);
    private _parseVideo = async (info: any): Promise<VideoData> => {
        return {
            id: info.videoId,
            title: info.title.runs[0].text,
            url: `https://www.youtube.com/watch?v=${info.videoId}`,
            duration: {
                seconds: info.lengthSeconds ?? 0
            },
            thumbnails: {
                url: info.thumbnail.thumbnails[info.thumbnail.thumbnails.length - 1].url,
                height: info.thumbnail.thumbnails[info.thumbnail.thumbnails.length - 1].height,
                width: info.thumbnail.thumbnails[info.thumbnail.thumbnails.length - 1].width
            },
            author: {
                id: info.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.browseId || undefined,
                title: info.shortBylineText.runs[0].text || undefined,
                url: `https://www.youtube.com${info.shortBylineText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || info.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`,
            },
            isLive: undefined,
            isPrivate: info.isPlayable
        };
    };
}

export interface PlaylistData {
    id: string,
    title: string,
    items: any[],
    url: string,
    author: ChannelData,
    thumbnail: string
}