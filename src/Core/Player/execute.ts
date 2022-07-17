import {PlayerController} from "./Audio/Controller";
import {StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../Client";
import {InputPlaylist, InputTrack} from "../Utils/TypeHelper";
import {QueueConstructor} from "./Structures/Queue/QueueConstructor";
import {TypedEmitter} from "tiny-typed-emitter";

interface PlayerEvents {
    play: (message: ClientMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack | InputPlaylist) => boolean | void | Promise<void | ClientMessage | NodeJS.Timeout>;
    pause: (message: ClientMessage) => void;
    resume: (message: ClientMessage) => void;
    skip: (message: ClientMessage, args?: number) => void;
    replay: (message: ClientMessage) => void;
    filter: (message: ClientMessage) => void;
    remove: (message: ClientMessage, args: number) => boolean | void;
    seek: (message: ClientMessage, seek: number) => void;
}

/**
 * @description Запускаем все функции плеера
 */
export class PlayerEmitter extends TypedEmitter<PlayerEvents> {
    public constructor() {
        super();
        this.on("play", QueueConstructor.CheckQueue);

        this.on("pause", PlayerController.PlayerPause);
        this.on("resume", PlayerController.PlayerResume);
        this.on("remove", PlayerController.PlayerRemove);
        this.on("seek", PlayerController.PlayerSeek);
        this.on("skip", PlayerController.PlayerSkip);
        this.on("replay", PlayerController.PlayerReplay);
        this.on("filter", PlayerController.PlayerFilter);
        this.setMaxListeners(9);
    };
}