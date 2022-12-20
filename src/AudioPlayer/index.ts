import {ClientMessage} from "@Client/interactionCreate";
import {InputPlaylist, InputTrack} from "@Queue/Song";
import {StageChannel, VoiceChannel} from "discord.js";
import {QueueManager} from "@Managers/QueueManager";
import {TypedEmitter} from "tiny-typed-emitter";
import {PlayerController} from "./Controller";

interface PlayerEvents {
    play: (message: ClientMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack | InputPlaylist) => void;
    pause: (message: ClientMessage) => void;
    resume: (message: ClientMessage) => void;
    skip: (message: ClientMessage, args?: number) => void;
    replay: (message: ClientMessage) => void;
    filter: (message: ClientMessage) => void;
    remove: (message: ClientMessage, args: number) => void;
    seek: (message: ClientMessage, seek: number) => void;
}

//Запускаем все функции плеера
export class PlayerEmitter extends TypedEmitter<PlayerEvents> {
    public constructor() {
        super();
        this.on("play", QueueManager.toQueue);

        this.on("pause", PlayerController.toPause);
        this.on("resume", PlayerController.toResume);
        this.on("remove", PlayerController.toRemove);
        this.on("seek", PlayerController.toSeek);
        this.on("skip", PlayerController.toSkip);
        this.on("replay", PlayerController.toReplay);
        this.on("filter", PlayerController.toFilter);
        this.setMaxListeners(9);
    };
}