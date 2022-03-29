import {StageChannel, VoiceChannel} from "discord.js";
import {LoopType, wMessage} from "../../../../../../Core/Utils/TypesHelper";
import {MessageSystem} from "../../../Events/Message/MessageEmitter";
import {RunPlayer} from "../../../Audio/AudioPlayer";
import {VoiceEvents} from "../../../Events/Voice/VoiceDestroyer";
import {Song} from "./Song";
import {QueueEvents} from "../../../Events/Queue/QueueEvent";
import {JoinVoiceChannel} from "../../Voice/Voice";

export class Queue {
    public player: RunPlayer;
    public events: { message: MessageSystem, queue: QueueEvents, helper: VoiceEvents } = {
        message: new MessageSystem(),
        queue: new QueueEvents(),
        helper: new VoiceEvents()
    };
    public channels: { message: wMessage, voice: VoiceChannel | StageChannel, connection: JoinVoiceChannel };
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
        this.player = new RunPlayer(message);
        this.channels = { message, voice, connection: null};
    };
}