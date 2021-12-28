import {ParserTimeSong} from "../../Functions/ParserTimeSong";
import * as Colors from "../../../../../../db/YTDL.json";
import {ColorResolvable, HexColorString, User} from "discord.js";
import {InputTrack, W_Message} from "../../../../../../Core/Utils/W_Message";

export class Song {
    public id: string;
    public title: string;
    public url: string;
    public author: {
        id: string,
        url: string,
        title: string,
        thumbnails: {url: string},
        isVerified: boolean
    };
    public duration: {
        seconds: number,
        StringTime: string
    };
    public thumbnails: {url: string | "not"};
    public requester: User;
    public isLive: boolean;
    public color: HexColorString | ColorResolvable;
    public type: string;
    public format: [] | any;

    constructor(track: InputTrack, message: W_Message) {
        let type = this.Type(track.url);

        this.id = track.id;
        this.title = track.title;
        this.url = track.url;
        this.author = Song.ConstAuthor(track);
        this.duration = Song.ConstDuration(track);
        this.thumbnails = this.ConstThumbnails(track);
        this.requester = message.author;
        this.isLive = track.isLive;
        this.color = this.Color(type);
        this.type = type;
        this.format = track.format;
    }
    private static ConstDuration ({duration}: InputTrack): { StringTime: string | "Live"; seconds: number } {
        return {
            seconds: parseInt(duration.seconds),
            StringTime: parseInt(duration.seconds) > 0 ? ParserTimeSong(parseInt(duration.seconds)) : 'Live'
        }
    }
    private static ConstAuthor({author}: InputTrack): {id: string, url: string, title: string, thumbnails: {url: string}, isVerified: boolean | undefined} {
        return {
            id: author.id,
            url: author.url,
            title: author.title,
            thumbnails: author.thumbnails && author.thumbnails.url ? author.thumbnails : {url: "not"},
            isVerified: author.isVerified
        };
    }
    private ConstThumbnails = ({thumbnails}: InputTrack): {url: string} => thumbnails && thumbnails.url ? thumbnails : {url: "not"};
    private Color = (type: string): HexColorString | ColorResolvable => {
        try {
            return Colors.colors[type.toUpperCase()];
        } catch (e) {
            return "#03f0fc"
        }
    }
    private Type = (url: string): string => {
        try {
            let start = url.split('://')[1].split('/')[0];
            let split = start.split(".");
            return (split[split.length - 2]).toUpperCase();
        } catch (e) {
            return "UNKNOWN"
        }
    }
}