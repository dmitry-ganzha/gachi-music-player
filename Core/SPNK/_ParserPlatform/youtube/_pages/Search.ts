import {Utils} from "../Utils";

export class SearchVideo {
    FindVideo = (search: any, options: any = {}): Promise<{ error: boolean; message: string } | void> => new Utils().RequestExp('https://www.youtube.com/results?search_query=' + search.replaceAll(' ', '+'), {headers: {'accept-language': 'en-US,en-IN;q=0.9,en;q=0.8,hi;q=0.7'}}).then(async (body: string) => !body ? {error: true, message: 'Not found info page'} : await this.Parser(body, options));
    private Parser = async (html: string, options: any = {limit: 15}) => {
        if (html.indexOf('Our systems have detected unusual traffic from your computer network.') !== -1) throw new Error('Google капча: Google понял что я бот! Это может занять много времени!');

        let details = JSON.parse((html.split("var ytInitialData = ")[1].split("}};")[0] + '}}').split(';</script><script')[0]).contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents[0].itemSectionRenderer.contents;
        return this.PushVideos(details, options);
    };
    private PushVideos = async (details: any, options: any, base: any = []): Promise<void> => {
        let num = 0;
        for (let i = 0; i < details.length; i++) {
            if (this._Limiter(num, options.limit)) break;
            if (this._NotVideo(details, i)) continue;
            num++;
            base.push(await this._push(details[i]));
        }
        return base;
    };
    private _push = async (data: any): Promise<ParseVideo> => new ParseVideo(data.videoRenderer, data.videoRenderer.ownerBadges && data.videoRenderer.ownerBadges[0]);
    private _Limiter = (i: number, limit: number): boolean => i >= limit;
    private _NotVideo = (video: any, i: number): boolean => !video[i] || !video[i].videoRenderer;
}

class ParseVideo {
    public id: string;
    public url: string;
    public title: string;
    public thumbnail: {url: string, width: number, height: number};
    public author: {id: string, title: string, url: string, thumbnails: {url: string}, isVerified: boolean};
    public duration: {seconds: string};
    public isLive: boolean;

    constructor(data: any, badge: any) {
        this.id = data.videoId;
        this.url = `https://www.youtube.com/watch?v=${data.videoId}`;
        this.title = data.title.runs[0].text;
        this.thumbnail = data.thumbnail.thumbnails[data.thumbnail.thumbnails.length - 1];
        this.author = this._parseAuthor(data, badge);
        this.duration = data.lengthText ? data.lengthText.simpleText : null;
        this.isLive = !data.lengthText;
    };
    private _parseAuthor = (data: any, badge: any): {id: string, title: string, url: string, thumbnails: {url: string}, isVerified: boolean} => {
        return {
            id: data.ownerText.runs[0].navigationEndpoint.browseEndpoint.browseId,
            title: data.ownerText.runs[0].text,
            url: this._url(data),
            thumbnails: this._parseAuthorThumbnails(data),
            isVerified: this._isVerified(badge)
        }
    };
    private _url = (data: any): string => `https://www.youtube.com${data.ownerText.runs[0].navigationEndpoint.browseEndpoint.canonicalBaseUrl || data.ownerText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url}`
    private _isVerified = (badge: any): boolean => badge?.metadataBadgeRenderer?.tooltip === 'Verified' || badge?.metadataBadgeRenderer?.tooltip === 'Official Artist Channel';
    private _parseAuthorThumbnails = (data: any): {url: string, width: number, height: number} => {
        return {
            url: data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].url,
            width: data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].width,
            height: data.channelThumbnailSupportedRenderers.channelThumbnailWithLinkRenderer.thumbnail.thumbnails[0].height
        }
    }
}