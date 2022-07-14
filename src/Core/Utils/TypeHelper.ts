import {
    ActionRow, ActionRowBuilder,
    DMChannel,
    EmbedData, MessageOptions,
    MessagePayload,
    NewsChannel,
    PartialDMChannel,
    TextChannel,
    ThreadChannel
} from "discord.js";
import {ClientMessage} from "../Client";

// interface for EmbedConstructor<EmbedData>
export interface EmbedConstructor extends EmbedData {}
//Типы каналов
export type Channel = DMChannel | PartialDMChannel | NewsChannel | TextChannel | ThreadChannel;
export type MessageChannel = ClientMessage["channel"];
//Типы для ClientMessage<channel<send>>, ClientMessage<edit>
export type sendType = string | MessagePayload | MessageOptions | {embeds?: EmbedConstructor[], components?: ActionRow<any> | ActionRowBuilder<any>};
//Цвета, которые есть в базе
export type ColorResolvable = "RED" | "BLUE" | "GREEN" | "DARK" | "YELLOW" | "GREY" | "NAVY" | "GOLD" | "ORANGE" | "PURPLE";


//Аудио кодеки которые предоставляет youtube
type AudioCodec =  "mp4a" | "mp3" | "vorbis" | "aac" | "opus" | "flac";
//Видео кодеки которые предоставляет youtube
type VideoCodec = "mp4v" | "avc1" | "Sorenson H.283" | "MPEG-4 Visual" | "VP8" | "VP9" | "H.264";
//Качество видео которые предоставляет youtube
type VideoQuality = "tiny" | "LOW" | "MEDIUM" | "HIGH";

/**
 * @description FFmpeg формат для воспроизведения
 */
export interface FFmpegFormat {
    url: string;
}

/**
 * @description Получаемый формат из SPNK<YouTube.getVideo>
 */
export interface InputFormat {
    itag: number;
    url: string;
    other?: boolean | string;
    protocol?: string;
    acodec?: AudioCodec;
    vcodec?: VideoCodec;
    quality?: VideoQuality;
    fps?: number;
}

/**
 * @description Пример получаемого трека
 */
export interface InputTrack {
    title: string;
    url: string;
    duration: {
        seconds: string;
    };
    image?: { url: string; height?: number; width?: number };
    author: {
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
export type InputTrackDuration = InputTrack["duration"];
export type InputTrackAuthor = {
    title: string;
    url: string | undefined;
    image?: {
        url: string | undefined;
        width?: number;
        height?: number;
    };
    isVerified?: boolean;
};
export type InputTrackImage = InputTrack["image"];
//
/**
 * @description Пример получаемого автора трека
 */
export interface InputAuthor {
    title: string;
    url: string;
    image: {
        url: string;
        width?: number;
        height?: number;
    };
    isVerified: boolean | undefined;
}
/**
 * @description Пример получаемого плейлиста
 */
export interface InputPlaylist {
    url: string;
    title: string;
    items: InputTrack[];
    image: {
        url: string;
    };
    author?: InputAuthor;
}