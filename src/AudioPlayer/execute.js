"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEmitter = void 0;
const Controller_1 = require("./Player/Controller");
const QueueManager_1 = require("./Manager/QueueManager");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
class PlayerEmitter extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.on("play", QueueManager_1.QueueManager.toQueue);
        this.on("pause", Controller_1.PlayerController.toPause);
        this.on("resume", Controller_1.PlayerController.toResume);
        this.on("remove", Controller_1.PlayerController.toRemove);
        this.on("seek", Controller_1.PlayerController.toSeek);
        this.on("skip", Controller_1.PlayerController.toSkip);
        this.on("replay", Controller_1.PlayerController.toReplay);
        this.on("filter", Controller_1.PlayerController.toFilter);
        this.setMaxListeners(9);
    }
    ;
}
exports.PlayerEmitter = PlayerEmitter;
