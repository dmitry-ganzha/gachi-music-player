import {TypedEmitter} from 'tiny-typed-emitter';
import {CreateQueue} from "./Manager/Queue/CreateQueue";
import {Controller} from "./Audio/Controller";
import {PlayList} from "./Manager/Queue/PlayLists";
import {InputPlaylist, InputTrack, wMessage} from "../../../Core/Utils/TypesHelper";
import {StageChannel, VoiceChannel} from "discord.js";

type Events = {
    play: (message: wMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack) => Promise<boolean | void | unknown>;
    pause: (message: wMessage) => Promise<void>;
    resume: (message: wMessage) => Promise<void>;
    skip: (message: wMessage, args?: number) => Promise<void | boolean>;
    replay: (message: wMessage) => Promise<NodeJS.Immediate | void>;
    filter: (message: wMessage) => Promise<NodeJS.Immediate | void>;
    remove: (message: wMessage, args: number) => Promise<boolean | void>;
    seek: (message: wMessage, seek: number) => Promise<NodeJS.Immediate | void>;

    playlist: (message: wMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel |  StageChannel) => Promise<void>;
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