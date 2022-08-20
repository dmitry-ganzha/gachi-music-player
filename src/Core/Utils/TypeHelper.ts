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
import {ClientMessage} from "../../Events/Activity/Message";

// interface for EmbedConstructor<EmbedData>
export interface EmbedConstructor extends EmbedData {}
//Типы каналов
export type Channel = DMChannel | PartialDMChannel | NewsChannel | TextChannel | ThreadChannel;
export type MessageChannel = ClientMessage["channel"];
//Типы для ClientMessage<channel<send>>, ClientMessage<edit>
export type sendType = string | MessagePayload | MessageOptions | {embeds?: EmbedConstructor[], components?: ActionRow<any> | ActionRowBuilder<any>};
//Цвета, которые есть в базе
export type ColorResolvable = "RED" | "BLUE" | "GREEN" | "DARK" | "YELLOW" | "GREY" | "NAVY" | "GOLD" | "ORANGE" | "PURPLE";
//FFmpeg формат для воспроизведения
export interface FFmpegFormat {
    url: string;
}

//Пример получаемого трека
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
export type InputTrackImage = InputTrack["image"];
//Пример получаемого автора трека
export interface InputAuthor {
    title: string;
    url: string | undefined;
    image?: {
        url: string | undefined;
        width?: number;
        height?: number;
    };
    isVerified?: boolean;
}
//Пример получаемого плейлиста
export interface InputPlaylist {
    url: string;
    title: string;
    items: InputTrack[];
    image: {
        url: string;
    };
    author?: InputAuthor;
}