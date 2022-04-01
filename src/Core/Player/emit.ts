import {TypedEmitter} from 'tiny-typed-emitter';
import {Controller} from "./Audio/Controller";
import {PlayList} from "./Manager/PlayLists";
import {StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../Client";
import {InputPlaylist, InputTrack} from "../Utils/TypeHelper";
import {CreateQueue} from "./Queue/Create";

type Events = {
    play: (message: ClientMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack) => Promise<boolean | void | unknown>;
    pause: (message: ClientMessage) => Promise<void>;
    resume: (message: ClientMessage) => Promise<void>;
    skip: (message: ClientMessage, args?: number) => Promise<void | boolean>;
    replay: (message: ClientMessage) => Promise<NodeJS.Immediate | void | NodeJS.Timeout>;
    filter: (message: ClientMessage) => Promise<NodeJS.Immediate | void | NodeJS.Timeout>;
    remove: (message: ClientMessage, args: number) => Promise<boolean | void>;
    seek: (message: ClientMessage, seek: number) => Promise<NodeJS.Immediate | void | NodeJS.Timeout>;

    playlist: (message: ClientMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel |  StageChannel) => Promise<void>;
};

export class PlayerEmitter extends TypedEmitter<Events> {
    public constructor() {
        super();
        this.on('play', CreateQueue);

        this.on('pause', Controller.PlayerPause);
        this.on('resume', Controller.PlayerResume);
        this.on('remove', Controller.PlayerRemove);
        this.on('seek', Controller.PlayerSeek);
        this.on('skip', Controller.PlayerSkip);
        this.on('replay', Controller.PlayerReplay);
        this.on('filter', Controller.PlayerFilter);

        this.on('playlist', PlayList);
        this.setMaxListeners(9);
    };
}