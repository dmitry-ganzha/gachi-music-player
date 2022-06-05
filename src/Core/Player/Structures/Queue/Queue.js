"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const AudioPlayer_1 = require("../../Audio/AudioPlayer");
const Queue_1 = require("../../Manager/Queue");
const VoiceManager_1 = require("../../Manager/Voice/VoiceManager");
class Queue {
    constructor(message, voice) {
        this.events = {
            queue: new Queue_1.QueueEvents(),
            helper: new VoiceManager_1.Voice()
        };
        this.options = {
            random: false,
            loop: "off",
            stop: false,
        };
        this.audioFilters = [];
        this.songs = [];
        this.player = new AudioPlayer_1.AudioPlayer(message);
        this.channels = { message, voice, connection: null };
    }
    ;
}
exports.Queue = Queue;
