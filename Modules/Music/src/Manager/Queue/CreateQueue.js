"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushSong = exports.CreateQueue = void 0;
const Queue_1 = require("./Structures/Queue");
const Song_1 = require("./Structures/Song");
const Voice_1 = require("../Voice/Voice");
const AudioPlayer_1 = require("../../Audio/AudioPlayer");
const MessageEmitter_1 = require("../../Events/Message/MessageEmitter");
async function CreateQueue(message, VoiceChannel, track) {
    const queue = message.client.queue.get(message.guild.id);
    const song = new Song_1.Song(track, message);
    if (!queue)
        return CreateQueueGuild(message, VoiceChannel, song);
    return PushSong(queue, song);
}
exports.CreateQueue = CreateQueue;
async function CreateQueueGuild(message, VoiceChannel, song) {
    const { client, guild } = message;
    client.console(`[${guild.id}]: [Queue]: [Method: Set]`);
    client.queue.set(guild.id, new Queue_1.Queue(message, VoiceChannel));
    const queue = client.queue.get(message.guild.id);
    (await Promise.all([PushSong(queue, song, false)]));
    const connection = new Voice_1.JoinVoiceChannel(VoiceChannel);
    connection.subscribe = queue.player;
    queue.channels.connection = connection;
    return AudioPlayer_1.RunPlayer.playStream(message);
}
async function PushSong(queue, song, sendMessage = true) {
    queue.songs.push(song);
    if (sendMessage)
        return (0, MessageEmitter_1.PushSongMessage)(queue.channels.message, song);
    return;
}
exports.PushSong = PushSong;
