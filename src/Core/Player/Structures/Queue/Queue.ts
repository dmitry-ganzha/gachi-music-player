import {StageChannel, VoiceChannel} from "discord.js";
import {MessageSystem} from "../../Manager/Message";
import {RunPlayer} from "../../Audio/AudioPlayer";
import {VoiceEvent} from "../../Voice/VoiceEvent";
import {Song} from "./Song";
import {QueueEvents} from "../../Queue/QueueEvent";
import {JoinVoiceChannel} from "../../Voice/VoiceManager";
import {ClientMessage} from "../../../Client";
import {FFmpegFilters} from "../../FFmpeg";

export type LoopType = "song" | "songs" | "off";

export class Queue {
    public player: RunPlayer;
    public events: { message: MessageSystem, queue: QueueEvents, helper: VoiceEvent } = {
        message: new MessageSystem(),
        queue: new QueueEvents(),
        helper: new VoiceEvent()
    };
    public channels: { message: ClientMessage, voice: VoiceChannel | StageChannel, connection: JoinVoiceChannel };
    public options: { random: boolean, loop: LoopType, stop: boolean } = {
        random: false,
        loop: "off",
        stop: false,
    };
    public audioFilters: FFmpegFilters = {
        bass: 0,
        speed: 0,
        nightcore: false,
        karaoke: false,
        echo: false,
        "3d": false,
        Vw: false,
        Sub_bass: false,
    };
    public songs: Song[] = [];

    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.player = new RunPlayer(message);
        this.channels = { message, voice, connection: null};
    };
}