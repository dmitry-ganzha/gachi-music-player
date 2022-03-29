"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Queue = void 0;
const MessageEmitter_1 = require("../../../Events/Message/MessageEmitter");
const AudioPlayer_1 = require("../../../Audio/AudioPlayer");
const VoiceDestroyer_1 = require("../../../Events/Voice/VoiceDestroyer");
const QueueEvent_1 = require("../../../Events/Queue/QueueEvent");
class Queue {
    constructor(message, voice) {
        this.events = {
            message: new MessageEmitter_1.MessageSystem(),
            queue: new QueueEvent_1.QueueEvents(),
            helper: new VoiceDestroyer_1.VoiceEvents()
        };
        this.options = {
            random: false,
            loop: "off",
            stop: false,
        };
        this.audioFilters = {
            bass: 0,
            speed: 0,
            nightcore: false,
            karaoke: false,
            echo: false,
            _3D: false,
            Vw: false,
            Sab_bass: false,
        };
        this.songs = [];
        this.player = new AudioPlayer_1.RunPlayer(message);
        this.channels = { message, voice, connection: null };
    }
    ;
}
exports.Queue = Queue;
