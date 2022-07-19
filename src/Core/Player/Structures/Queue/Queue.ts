import {StageChannel, VoiceChannel} from "discord.js";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {Song} from "./Song";
import {ClientMessage} from "../../../Client";
import {VoiceConnection} from "@discordjs/voice";
import {QueueEvents} from "./QueueConstructor";

export type LoopType = "song" | "songs" | "off";
export type AudioFilters = string[] | (string | number)[];

export class Queue {
    readonly #_player: AudioPlayer;
    readonly #_emitter: QueueEvents = new QueueEvents();
    readonly #_channels: { message: ClientMessage, voice: VoiceChannel | StageChannel, connection: VoiceConnection };
    readonly #_options: { random: boolean, loop: LoopType, stop: boolean } = {
        random: false,
        loop: "off",
        stop: false,
    };
    public audioFilters: string[] | (string | number)[] = [];
    public songs: Song[] = [];

    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.#_player = new AudioPlayer(message);
        this.#_channels = { message, voice, connection: null};
    };

    public readonly swapSongs = (customNum?: number) => {
        if (this.songs.length === 1) return this.player.stop();

        const SetNum = customNum ? customNum : this.songs.length - 1;
        const ArraySongs: Song[] = this.songs;
        const hasChange = ArraySongs[SetNum];

        ArraySongs[SetNum] = ArraySongs[0];
        ArraySongs[0] = hasChange;
        this.player.stop();
        return;
    }

    public get player() {
        return this.#_player;
    };
    public get emitter() {
        return this.#_emitter;
    };
    public get channels() {
        return this.#_channels;
    };
    public get options() {
        return this.#_options;
    };
}