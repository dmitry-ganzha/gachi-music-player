import {
    BaseGuildEmojiManager, ChannelManager,
    ClientApplication,
    ClientOptions,
    ClientUser, Collection, ColorResolvable, Guild,
    GuildManager, HexColorString,
    Message,
    ShardClientUtil,
    UserManager, VoiceState, WebSocketManager
} from "discord.js";
import {VoiceManager} from '../../Modules/Music/src/Manager/Voice/Voice';
import {EventEmitter} from "events";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import {Command} from "../../Commands/Constructor";

// @ts-ignore
export class W_Message extends Message<any> {
    // @ts-ignore
    client: {
        player: EventEmitter | {emit (eventName: PlayerType, ...args: any[]): boolean},
        queue: {
            get (GuildID: string): Queue
            delete (GuildID: string): Function
            set (GuildID: string, Queue: Queue): Function

            size: number
        },
        commands: Command[] & {
            get (name: string): Command

            size: number
        },
        aliases: Collection<string, string>,
        cfg: any,

        Send (options: SendOptions): Promise<void>,
        connections (guild: Guild): VoiceState[],
        console (set: string): void
        ConvertedText (text: string, value: number, clearText?: boolean): string

        application: ClientApplication,
        channels: ChannelManager,
        emojis: BaseGuildEmojiManager,
        guilds: GuildManager,
        options: ClientOptions,
        readyAt: Date,
        readyTimestamp: number,
        shard: ShardClientUtil,
        token: string,
        uptime: number,
        user: ClientUser,
        users: UserManager,
        voice: VoiceManager,
        ws: WebSocketManager
    };
}
export type W_Client = W_Message["client"];
/*
All interfaces
Все интерфейсы хранятся здесь
*/
export interface FFmpegOptions {
    encoderOptions: {
        seek: number;
        bassboost: number;
        speed: number;
        noLossFrame: boolean;
    };
}
export interface FFmpegFormat {
    url: string;
    other?: boolean | string;
    protocol?: string;
    acodec: AudioCodec;
    vcodec?: VideoCodec;
    quality: VideoQuality;
}

export interface playlist {
    title: string,
    url: string
    author: {
        title: string
        name: string
        url: string
        thumbnails: {url: string}
    }
    items: any[]
    thumbnail
}
export interface InputTrack {
    id: string,
    title: string,
    url: string,
    duration: {
        seconds: string
    },
    thumbnails: { url: string, height?: number, width?: number },
    author: {
        id: string,
        title: string,
        url: string,
        thumbnails: {
            url: string,
            width: number,
            height: number
        },
        isVerified: boolean
    },
    format?: FFmpegFormat
    isLive?: boolean,
    isPrivate?: boolean
}
/*
All Types
Все типы хранятся здесь
*/
export type SendOptions = {
    text: string;
    color?: HexColorString | ColorResolvable;
    message: W_Message | Message;
    type?: OptionsSendType;
}
type OptionsSendType =  "css" | "js" | "ts" | "cpp" | "html" | "cs";
export type ClientDevice = "Discord iOS" | "Web"; // Client status
/**
 @description YouTube Format type
 */
type AudioCodec =  'mp4a' | 'mp3' | 'vorbis' | 'aac' | 'opus' | 'flac';
type VideoCodec = 'mp4v' | 'avc1' | 'Sorenson H.283' | 'MPEG-4 Visual' | 'VP8' | 'VP9' | 'H.264';
type VideoQuality = "tiny" | "LOW" | "MEDIUM" | "HIGH";
/**
 * @description emit type player
 */
type PlayerType = "play" | "pause" | "resume" | "bass" | "skip" | "playlist" | "replay" | "speed" | "seek" | "remove";
/**
 * @description AudioPlayerLoopType
 */
export type LoopType = "song" | "songs" | "off";