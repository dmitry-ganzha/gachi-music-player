import {YouTubeDL} from "../../../../../youtube-dl/youtube-dl";
import {Utils} from '../Utils';
import IconPlatform from '../../../../../db/YTDL.json';

export class _parseAllTrack {
    public run = async (url: string) => new YouTubeDL().getMetadata([url]).then(async (video: any) => {
        if (!video) return {isValid: false};

        return {
            id: video.id,
            title: video.title || video.track,
            url: url,
            author: {
                id: video.uploader_id || video.display_id,
                title: video.uploader || video.artist,
                thumbnails: {url: await this._Icon(await this.Type(url)).catch(() => null)}
            },
            duration: {
                seconds: video.duration ? video.duration.toFixed(0) : 0
            },
            thumbnails: await this._Image(video.thumbnails),
            isLive: !!video.is_live,
            isValid: true,
            format: await new Utils()._FindFormat(video.formats)
        };
    });
    private _Image = async (icons: any[]) => icons.length >= 1 ? icons[icons.length - 1] : {};
    private _Icon = async (type: string) => IconPlatform.Icons[type];
    private Type = async (url: string) => {
        try {
            let start = url.split('://')[1].split('/')[0];
            let split = start.split(".");
            return (split[split.length - 2]).toUpperCase();
        } catch (e) {
            return "UNKNOWN"
        }
    }
}