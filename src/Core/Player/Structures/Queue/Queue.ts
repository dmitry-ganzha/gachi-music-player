import {StageChannel, VoiceChannel} from "discord.js";
import {MessageSystem} from "../../Manager/Message";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {Voice} from "../../Events/Voice";
import {Song} from "./Song";
import {QueueEvents} from "../../Events/Queue";
import {ClientMessage} from "../../../Client";
import {VoiceConnection} from "@discordjs/voice";

export type LoopType = "song" | "songs" | "off";

export class Queue {
    public player: AudioPlayer;
    public events: { message: MessageSystem, queue: QueueEvents, helper: Voice } = {
        message: new MessageSystem(),
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