import {TypedEmitter} from 'tiny-typed-emitter';
import {Controller} from "./Audio/Controller";
import {StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../Client";
import {InputPlaylist, InputTrack} from "../Utils/TypeHelper";
import {CreateQueue} from "./Manager/Queue";
import {PlayList} from "./Manager/Function/addPlaylist";

type Events = {
    play: (message: ClientMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack | InputTrack[]) => boolean | void | Promise<void | ClientMessage | NodeJS.Timeout>;
    pause: (message: ClientMessage) => void;
    resume: (message: ClientMessage) => void;
    skip: (message: ClientMessage, args?: number) => void;
    replay: (message: ClientMessage) => void;
    filter: (message: ClientMessage) => void;
    remove: (message: ClientMessage, args: number) => boolean | void;
    seek: (message: ClientMessage, seek: number) => void;

    playlist: (message: ClientMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel |  StageChannel) => void;
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