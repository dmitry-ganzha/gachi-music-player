"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceEvents = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
class VoiceEvents extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.onStartTimerDestroyer = async (queue) => {
            if (!queue)
                return null;
            const { player, options, events, channels } = queue;
            player.pause();
            this.state = true;
            if (!this.Timer)
                this.Timer = setTimeout(async () => {
                    queue.songs = [];
                    options.stop = true;
                    return void events.queue.emit('DestroyQueue', queue, channels.message, false);
                }, 2e4);
            return null;
        };
        this.onCancelTimerDestroyer = async ({ player }) => {
            if (this.state === true) {
                this.state = false;
                clearTimeout(this.Timer);
                this.Timer = null;
                return player.unpause();
            }
            return null;
        };
        this.destroy = () => {
            clearTimeout(this.Timer);
            delete this.Timer;
            delete this.state;
            this.removeAllListeners();
        };
        this.on('StartTimerDestroyer', this.onStartTimerDestroyer);
        this.on('CancelTimerDestroyer', this.onCancelTimerDestroyer);
        this.setMaxListeners(2);
    }
    ;
}
exports.VoiceEvents = VoiceEvents;
