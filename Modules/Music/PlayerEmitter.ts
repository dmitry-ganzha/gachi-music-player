import {EventEmitter} from "node:events";
import {CreateQueue} from "./src/Manager/Queue/CreateQueue";
import {ControlAudioPlayer} from "./src/AudioPlayer/ControlAudioPlayer";
import {PlayList} from "./src/Manager/Queue/PlayLists";
import {W_Message} from "../../Core/Utils/W_Message";

export default class ClientPlayer {
    public readonly enable: boolean;

    constructor() {
        this.enable = true;
    };

    public run = (client: W_Message["client"]): PlayerEmitter => client.player = new PlayerEmitter()
}

class PlayerEmitter extends EventEmitter {
    constructor() {
        super();
        this.on('play', new CreateQueue()._); //message, VoiceConnection, track

        this.on('pause', new ControlAudioPlayer().pause); //message
        this.on('resume', new ControlAudioPlayer().resume); //message
        //this.on('end', new ControlAudioPlayer().end); //message
        this.on('remove', new ControlAudioPlayer().remove); //message, args
        this.on('seek', new ControlAudioPlayer().seek); //message, args
        this.on('skip', new ControlAudioPlayer().skip); //message
        //this.on('skipTo', new ControlAudioPlayer().skipTo); //message, args
        this.on('replay', new ControlAudioPlayer().replay); //message
        this.on('bass', new ControlAudioPlayer().bass); //message, args
        this.on('speed', new ControlAudioPlayer().speed); //message, args

        this.on('playlist', new PlayList().pushItems); //message, playlist, VoiceConnection
        this.setMaxListeners(10);
    };
}