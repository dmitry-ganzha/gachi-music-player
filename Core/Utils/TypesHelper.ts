import {
    ActionRow,
    ActionRowBuilder,
    BaseGuildEmojiManager,
    ChannelManager,
    Client,
    ClientApplication,
    ClientOptions,
    ClientUser,
    Collection,
    DMChannel,
    EmbedData,
    Guild,
    GuildManager,
    Message,
    MessageEditOptions,
    MessageOptions,
    MessagePayload,
    NewsChannel,
    PartialDMChannel,
    ShardClientUtil,
    TextChannel,
    ThreadChannel,
    UserManager,
    VoiceState,
    WebSocketManager
} from "discord.js";
import {VoiceManager} from '../../Modules/Music/src/Manager/Voice/Voice';
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {Command} from "../../Commands/Constructor";
import {PlayerEmitter} from "../../Modules/Music/src/emit";

type sendType = string | MessagePayload | MessageOptions | {embeds?: EmbedConstructor[], components?: ActionRow<any> | ActionRowBuilder<any>};

/**
 * @description Модифицируем Discordjs<Message> под свои нужды
 */
// @ts-ignore
export class wMessage extends Message<any> {
    // @ts-ignore
    edit(content: sendType | MessageEditOptions): Promise<wMessage>
    // @ts-ignore
    channel: {
        send(options: sendType): Promise<wMessage>
    } & Channel
    client: {
        player: PlayerEmitter;
        queue: {
            get (GuildID: string): Queue;
            delete (GuildID: string): null;
            set (GuildID: string, Queue: Queue): null;

            size: number;
        };
        commands: Command[] & {
            get (name: string): Command;
            set (name: string, cmd: Command): null;

            size: number;
        };
        aliases: Collection<string, string>;
        cfg: any;

        Send (options: SendOptions): Promise<void>;
        connections (guild: Guild): VoiceState[];
        console (set: string): NodeJS.Timeout;
        ConvertedText (text: string, value: number, clearText?: boolean): string;

        application: ClientApplication;
        channels: ChannelManager;
        emojis: BaseGuildEmojiManager;
        guilds: GuildManager;
        options: ClientOptions;
        readyAt: Date;
        readyTimestamp: number;
        shard: ShardClientUtil;
        token: string;
        uptime: number;
        user: ClientUser;
        users: UserManager;
        voice: VoiceManager;
        ws: WebSocketManager;
    } & Client;
}

/**
 * @description Json Embed
 */
export interface EmbedConstructor extends EmbedData {}

//Клиент (Бот)
export type wClient = wMessage["client"];
//Типы каналов
export type Channel = DMChannel | PartialDMChannel | NewsChannel | TextChannel | ThreadChannel;

/**
 * @description FFmpeg формат для воспроизведения
 */
export interface FFmpegFormat {
    url: string;
    isM3U8?: boolean;
    work: boolean;
}

/**
 * @description Получаемый формат из SPNK<YouTube.getVideo>
 */
export interface InputFormat {
    url: string;
    other?: boolean | string;
    protocol?: string;
    acodec?: AudioCodec;
    vcodec?: VideoCodec;
    quality?: VideoQuality;
    fps?: number
}

/**
 * @description Пример получаемого трека
 */
export interface InputTrack {
    id: string | number;
    title: string;
    url: string;
    duration: {
        seconds: string;
    };
    image?: { url: string; height?: number; width?: number };
    author: {
        id: string | number;
        title: string;
        url: string | undefined;
        image?: {
            url: string | undefined;
            width?: number;
            height?: number;
        };
        isVerified?: boolean;
    },
    format?: FFmpegFormat | {url: string | undefined};
    isLive?: boolean;
    isPrivate?: boolean;
    isValid?: boolean;
    PrevFile?: string;
}
export type InputTrackDuration = InputTrack['duration'];
export type InputTrackAuthor = InputTrack['author'];
export type InputTrackImage = InputTrack['image'];
//
/**
 * @description Пример получаемого автора трека
 */
export interface InputAuthor {
    id: string | number,
    title: string,
    url: string,
    image: {
        url: string,
        width?: number,
        height?: number
    },
    isVerified: boolean | undefined
}
/**
 * @description Пример получаемого плейлиста
 */
export interface InputPlaylist {
    id: string | number;
    url: string;
    title: string,
    items: InputTrack[];
    image: {
        url: string
    };
    author?: InputAuthor
}
/*
All Types
Все типы хранятся здесь
*/
export type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: wMessage;
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
 * @description AudioPlayerLoopType
 */
export type LoopType = "song" | "songs" | "off";

export type ColorResolvable = "RED" | "BLUE" | "GREEN" | "DARK" | "YELLOW" | "GREY" | "NAVY" | "GOLD" | "ORANGE" | "PURPLE";