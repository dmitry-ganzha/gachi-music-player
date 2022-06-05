"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEmitter = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Controller_1 = require("./Audio/Controller");
const Queue_1 = require("./Manager/Queue");
const PlaylistManager_1 = require("./Manager/PlaylistManager");
class PlayerEmitter extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.on('play', Queue_1.CreateQueue);
        this.on('pause', Controller_1.Controller.PlayerPause);
        this.on('resume', Controller_1.Controller.PlayerResume);
        this.on('remove', Controller_1.Controller.PlayerRemove);
        this.on('seek', Controller_1.Controller.PlayerSeek);
        this.on('skip', Controller_1.Controller.PlayerSkip);
        this.on('replay', Controller_1.Controller.PlayerReplay);
        this.on('filter', Controller_1.Controller.PlayerFilter);
        this.on('playlist', PlaylistManager_1.PlayList);
        this.setMaxListeners(9);
    }
    ;
}
exports.PlayerEmitter = PlayerEmitter;
