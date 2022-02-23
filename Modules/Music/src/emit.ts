import {TypedEmitter} from 'tiny-typed-emitter';
import {CreateQueue} from "./Manager/Queue/CreateQueue";
import {Controller} from "./Audio/Controller";
import {PlayList} from "./Manager/Queue/PlayLists";
import {InputPlaylist, InputTrack, wMessage} from "../../../Core/Utils/TypesHelper";
import {StageChannel, VoiceChannel} from "discord.js";

type Events = {
    play: (message: wMessage, VoiceChannel: VoiceChannel | StageChannel, track: InputTrack) => Promise<boolean | void>;
    pause: (message: wMessage) => Promise<void>;
    resume: (message: wMessage) => Promise<void>;
    skip: (message: wMessage, args?: number) => Promise<void | boolean>;
    replay: (message: wMessage) => Promise<NodeJS.Immediate | void>;
    filter: (message: wMessage) => Promise<NodeJS.Immediate | void>;
    remove: (message: wMessage, args: number) => Promise<boolean | void>;
    seek: (message: wMessage, seek: number) => Promise<NodeJS.Immediate | void>;

    playlist: (message: wMessage, playlist: InputPlaylist, VoiceChannel: VoiceChannel |  StageChannel) => Promise<void> | void;
};

export class PlayerEmitter extends TypedEmitter<Events> {
    public constructor() {
        super();
        this.on('play', new CreateQueue()._);

        this.on('pause', Controller.pause);
        this.on('resume', Controller.resume);
        this.on('remove', Controller.remove);
        this.on('seek', Controller.seek);
        this.on('skip', Controller.skip);
        this.on('replay', Controller.replay);
        this.on('filter', Controller.filter);

        this.on('playlist', new PlayList().pushItems);
        this.setMaxListeners(9);
    };
}