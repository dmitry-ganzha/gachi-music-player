import {StageChannel, VoiceChannel} from "discord.js";
import {VoiceConnection} from "@discordjs/voice";
import {LoopType, wMessage} from "../../../../../../Core/Utils/TypesHelper";
import {MessageSystem} from "../../../Events/Message/Msg";
import {audioPlayer} from "../../../Audio/AudioPlayer";
import {VoiceEvents} from "../../../Events/Voice/VoiceDestroyer";
import {Song} from "./Song";
import {QueueEvents} from "../../../Events/Queue/QueueEvent";

export class Queue {
    public player: audioPlayer;
    public events: { message: MessageSystem, queue: QueueEvents, helper: VoiceEvents } = {
        message: new MessageSystem(),
        queue: new QueueEvents(),
        helper: new VoiceEvents()
    };
    public channels: { message: wMessage, voice: VoiceChannel | StageChannel, connection: VoiceConnection };
    public options: { random: boolean, loop: LoopType, stop: boolean } = {
        random: false,
        loop: "off",
        stop: false,
    };
    public audioFilters: {bass: number, speed: number, nightcore: boolean, karaoke: boolean, echo: boolean, _3D: boolean, Vw: boolean, Sab_bass: boolean} = {
        bass: 0,
        speed: 0,
        nightcore: false,
        karaoke: false,
        echo: false,
        _3D: false,
        Vw: false,
        Sab_bass: false,
    }
    public songs: Song[] = [];

    public constructor(message: wMessage, voice: VoiceChannel) {
        this.player = new audioPlayer(message);
        this.channels = { message, voice, connection: null};
    };
}