import {PlayerController} from "./Player/Controller";
import {StageChannel, VoiceChannel} from "discord.js";
import {QueueManager} from "./Manager/QueueManager";
import {TypedEmitter} from "tiny-typed-emitter";
import {ClientMessage} from "../Handler/Events/Activity/Message";
import {InputPlaylist, InputTrack} from "./Structures/Queue/Song";

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