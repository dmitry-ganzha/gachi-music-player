"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const Queue_1 = require("../Structures/Queue/Queue");
const Song_1 = require("../Structures/Queue/Song");
const Voice_1 = require("../Structures/Voice");
const MessagePlayer_1 = require("./MessagePlayer");
var QueueManager;
(function (QueueManager) {
    function toQueue(message, VoiceChannel, info) {
        const Queue = CreateQueue(message, VoiceChannel);
        if ("items" in info) {
            MessagePlayer_1.MessagePlayer.toPushPlaylist(message, info);
            setImmediate(() => {
                info.items.forEach((track) => PushSong(Queue, track, message.author, false));
                return Queue.player.play(Queue);
            });
            return;
        }
        PushSong(Queue, info, message.author, Queue.songs.length >= 1);
        setImmediate(() => {
            if (Queue.songs.length <= 1)
                return Queue.player.play(Queue);
        });
    }
    QueueManager.toQueue = toQueue;
})(QueueManager = exports.QueueManager || (exports.QueueManager = {}));
function CreateQueue(message, VoiceChannel) {
    const { client, guild } = message;
    const queue = client.queue.get(guild.id);
    if (queue)
        return queue;
    const GuildQueue = new Queue_1.Queue(message, VoiceChannel);
    const connection = Voice_1.Voice.Join(VoiceChannel);
    GuildQueue.channels.connection = connection;
    GuildQueue.player.subscribe(connection);
    client.queue.set(guild.id, GuildQueue);
    return GuildQueue;
}
function PushSong(queue, InputTrack, author, sendMessage = true) {
    const song = new Song_1.Song(InputTrack, author);
    queue.songs.push(song);
    if (sendMessage)
        setImmediate(() => MessagePlayer_1.MessagePlayer.toPushSong(queue, song));
}
