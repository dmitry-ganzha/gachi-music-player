"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueEvents = exports.PushSong = exports.CreateQueue = void 0;
const Queue_1 = require("../Structures/Queue/Queue");
const Song_1 = require("../Structures/Queue/Song");
const VoiceManager_1 = require("./Voice/VoiceManager");
const MessagePlayer_1 = require("./MessagePlayer");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
function CreateQueue(message, VoiceChannel, tracks) {
    let queue = message.client.queue.get(message.guild.id);
    if (tracks instanceof Array) {
        setImmediate(() => {
            tracks.forEach((track) => setTimeout(() => setImmediate(() => {
                const song = new Song_1.Song(track, message);
                if (!queue) {
                    CreateQueueGuild(message, VoiceChannel, song);
                    queue = message.client.queue.get(message.guild.id);
                    return;
                }
                return PushSong(queue, song, false);
            }), 2e3));
        });
        return;
    }
    setImmediate(() => {
        const song = new Song_1.Song(tracks, message);
        if (queue)
            return PushSong(queue, song);
        return CreateQueueGuild(message, VoiceChannel, song);
    });
}
exports.CreateQueue = CreateQueue;
function CreateQueueGuild(message, VoiceChannel, song) {
    const { client, guild } = message;
    if (client.queue.get(message.guild.id))
        return;
    client.console(`[Queue]: [GuildID: ${guild.id}, Status: Create]`);
    const GuildQueue = new Queue_1.Queue(message, VoiceChannel);
    client.queue.set(guild.id, GuildQueue);
    const queue = client.queue.get(message.guild.id);
    PushSong(queue, song, false);
    return queue.player.PlayCallback(message);
}
function PushSong(queue, song, sendMessage = true) {
    queue.songs.push(song);
    setImmediate(() => {
        if (sendMessage)
            (0, MessagePlayer_1.PushSongMessage)(queue.channels.message, song);
    });
}
exports.PushSong = PushSong;
class QueueEvents extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.once('DestroyQueue', onDestroyQueue);
        this.setMaxListeners(1);
    }
    ;
}
exports.QueueEvents = QueueEvents;
function onDestroyQueue(queue, message, sendDelQueue = true) {
    if (!queue)
        return;
    DeleteMessage(queue.channels);
    (0, VoiceManager_1.Disconnect)(queue?.channels?.message?.guild.id);
    CleanPlayer(queue);
    if (sendDelQueue)
        SendChannelToEnd(queue.options, message);
    delete queue.songs;
    delete queue.audioFilters;
    delete queue.options;
    delete queue.channels;
    queue.events.helper.destroy();
    delete queue.events;
    return DeleteQueue(message);
}
function CleanPlayer(queue) {
    if (queue.player.state.resource)
        void queue.player.state.resource.destroy();
    queue.player?.stop();
    setImmediate(() => {
        queue.player.unsubscribe(null);
        queue.player?.removeAllListeners();
        queue.player.destroy();
        delete queue.player;
    });
}
function DeleteMessage({ message }) {
    return setTimeout(() => message?.deletable ? message?.delete().catch(() => undefined) : null, 3e3);
}
function SendChannelToEnd({ stop }, message) {
    if (stop)
        return message.client.Send({ text: `🎵 | Музыка была выключена`, message, type: 'css' });
    return message.client.Send({ text: `🎵 | Музыка закончилась`, message, type: 'css' });
}
function DeleteQueue(message) {
    message.client.console(`[Queue]: [GuildID: ${message.guild.id}, Status: Delete]`);
    return message.client.queue.delete(message.guild.id);
}
