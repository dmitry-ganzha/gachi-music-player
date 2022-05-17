import {StageChannel, VoiceChannel} from "discord.js";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {Song} from "./Song";
import {ClientMessage} from "../../../Client";
import {VoiceConnection} from "@discordjs/voice";
import {QueueEvents} from "../../Manager/Queue";
import {Voice} from "../../Manager/Voice/VoiceManager";

export type LoopType = "song" | "songs" | "off";

export class Queue {
    public player: AudioPlayer;
    public events: { queue: QueueEvents, helper: Voice } = {
        queue: new QueueEvents(),
        helper: new Voice()
    };
    public channels: { message: ClientMessage, voice: VoiceChannel | StageChannel, connection: VoiceConnection };
    public options: { random: boolean, loop: LoopType, stop: boolean } = {
        random: false,
        loop: "off",
        stop: false,
    };
    public audioFilters: string[] | (string | number)[] = [];
    public songs: Song[] = [];

    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.player = new AudioPlayer(message);
        this.channels = { message, voice, connection: null};
    };
}