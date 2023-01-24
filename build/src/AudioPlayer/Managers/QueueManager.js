"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQueue = void 0;
const Song_1 = require("@Queue/Song");
const Messages_1 = require("@Managers/Players/Messages");
const _VoiceManager_1 = require("@VoiceManager");
const Queue_1 = require("@Queue/Queue");
function toQueue(message, VoiceChannel, info) {
    const { queue, status } = CreateQueue(message, VoiceChannel);
    const requester = message.author;
    setImmediate(() => {
        if ("items" in info) {
            Messages_1.MessagePlayer.toPushPlaylist(message, info);
            info.items.forEach((track) => queue.push(new Song_1.Song(track, requester)));
        }
        else
            queue.push(new Song_1.Song(info, requester), queue.songs.length >= 1);
        if (status === "create")
            queue.play();
    });
}
exports.toQueue = toQueue;
function CreateQueue(message, VoiceChannel) {
    const { client, guild } = message;
    const queue = client.queue.get(guild.id);
    if (queue)
        return { queue, status: "load" };
    const GuildQueue = new Queue_1.Queue(message, VoiceChannel);
    GuildQueue.player.voice = _VoiceManager_1.Voice.Join(VoiceChannel);
    client.queue.set(guild.id, GuildQueue);
    return { queue: GuildQueue, status: "create" };
}
