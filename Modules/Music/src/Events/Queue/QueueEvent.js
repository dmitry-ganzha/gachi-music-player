"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueEvents = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Voice_1 = require("../../Manager/Voice/Voice");
class QueueEvents extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.destroy = () => {
            this.removeAllListeners();
        };
        this.once('DestroyQueue', onDestroyQueue);
        this.on('pushSong', onPushSong);
        this.setMaxListeners(2);
    }
    ;
}
exports.QueueEvents = QueueEvents;
async function onPushSong(song, { client, guild }) {
    const queue = client.queue.get(guild.id);
    if (!queue)
        return null;
    queue.songs.push(song);
    return null;
}
async function onDestroyQueue(queue, message, sendDelQueue = true) {
    if (!queue)
        return null;
    await DeleteMessage(queue.channels);
    await LeaveVoice(queue?.channels?.message?.guild.id);
    await CleanPlayer(queue);
    if (sendDelQueue)
        await SendChannelToEnd(queue.options, message);
    delete queue.songs;
    delete queue.audioFilters;
    delete queue.options;
    delete queue.channels;
    queue.events.queue.destroy();
    queue.events.helper.destroy();
    queue.events.message.destroy();
    delete queue.events;
    return DeleteQueue(message);
}
async function CleanPlayer(queue) {
    if (queue.player.state.resource)
        void queue.player.state.resource.playStream.emit('close');
    queue.player?.stop();
    setTimeout(() => {
        queue.player?.removeAllListeners();
        delete queue.player;
    }, 7e3);
    return;
}
async function LeaveVoice(GuildID) {
    return (0, Voice_1.Disconnect)(GuildID);
}
async function DeleteMessage({ message }) {
    return setTimeout(async () => message?.deletable ? message?.delete().catch(() => undefined) : null, 3e3);
}
async function SendChannelToEnd({ stop }, message) {
    if (stop)
        return message.client.Send({ text: `🎵 | Музыка была выключена`, message: message, type: 'css' });
    return message.client.Send({ text: `🎵 | Музыка закончилась`, message: message, type: 'css' });
}
async function DeleteQueue(message) {
    return setTimeout(async () => {
        message.client.console(`[${message.guild.id}]: [Queue]: [Method: Delete]`);
        return message.client.queue.delete(message.guild.id);
    }, 1);
}
