"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceStateUpdate = void 0;
const voice_1 = require("@discordjs/voice");
const IsDestroyStatus = new Set(['playing', 'paused', 'buffering', 'autopaused']);
class voiceStateUpdate {
    constructor() {
        this.name = 'voiceStateUpdate';
        this.enable = true;
        this.run = async ({ guild }, newState, client) => {
            const queue = client.queue.get(guild.id);
            if (queue) {
                const voiceConnection = client.connections(guild);
                if (!voiceConnection.find((fn) => fn.id === client.user.id)) {
                    queue.songs = [];
                    queue.options.stop = true;
                    return void queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
                }
                return this.CheckToRun(voiceConnection, client, guild, queue);
            }
            return;
        };
        this.CheckToRun = async (voiceConnection, client, guild, queue) => {
            const PlayableVoiceChannel = (0, voice_1.getVoiceConnection)(guild.id);
            if (voiceConnection && PlayableVoiceChannel)
                return voiceConnection.length <= 1 && IsDestroyStatus.has(queue.player.state.status) ?
                    void queue.events.helper.emit('StartTimerDestroyer', queue) :
                    void queue.events.helper.emit('CancelTimerDestroyer', queue);
        };
    }
}
exports.voiceStateUpdate = voiceStateUpdate;
