import {_parseAllTrack} from "./_ParserPlatform/all/_pages/Track";
import {getVideoInfo} from "./_ParserPlatform/youtube/_pages/Video";
import {ParsePlaylistPage} from "./_ParserPlatform/youtube/_pages/Playlist";
import {SearchVideo} from "./_ParserPlatform/youtube/_pages/Search";
import {Utils} from "./_ParserPlatform/youtube/Utils";
import {InputTrack} from "../Utils/W_Message";
import SpotifyApi from "./_ParserPlatform/SpotifyApi";

export const setFFmpeg = (path: string) => process.env.FFmpeg = String(path);
export class Spotify {
    getTrack = new SpotifyApi().getTrack;
    getPlaylist = new SpotifyApi().getPlaylistTracks;
    Settings = new SpotifyApi().Settings;
}

export class YouTube {
    getVideo = async (url: string): Promise<InputTrack> => getVideoInfo(url).then(async ({VideoData, LiveData, format}) => {
        if (!VideoData) return null;

        return {...VideoData,  format: VideoData.isLive ? {url: LiveData.url, other: 'm3u8'} : await new Utils()._FindOpusFormat(format)};
    }).catch(() => null);
    getPlaylist = new ParsePlaylistPage().run;
    searchVideos = new SearchVideo().FindVideo;
    setCookie = (cookie: string): string => process.env.YTcookie = `${cookie}`;
}

export class all {
    getTrack = new _parseAllTrack().run;
}