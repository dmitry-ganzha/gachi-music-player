"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSystem = void 0;
const CurrentPlay_1 = require("./Constructor/CurrentPlay");
const Warning_1 = require("./Constructor/Warning");
const AddSong_1 = require("./Constructor/AddSong");
const Helper_1 = require("./Constructor/Helper");
class MessageSystem {
    constructor() {
        this.UpdateMessage = onUpdateMessage;
        this.PlaySongMessage = onPlaySongMessage;
        this.PushSongMessage = onPushSongMessage;
        this.WarningMessage = onWarningMessage;
    }
}
exports.MessageSystem = MessageSystem;
MessageSystem.Interval = null;
async function onUpdateMessage(message, need = false) {
    const queue = message.client.queue.get(message.guild.id);
    if (message?.embeds[0]?.fields?.length === 1 || need) {
        const CurrentPlayEmbed = await (0, CurrentPlay_1.CurrentPlay)(message.client, queue.songs[0], queue);
        try {
            return message.edit({ embeds: [CurrentPlayEmbed] }).then(async (msg) => queue.channels.message = msg);
        }
        catch (e) {
            return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    }
    return null;
}
async function onPlaySongMessage({ client, guild, channel }) {
    const queue = client.queue.get(guild.id);
    const exampleEmbed = await (0, CurrentPlay_1.CurrentPlay)(client, queue.songs[0], queue);
    if (queue.channels.message.deletable)
        queue.channels.message.delete().catch((e) => console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`));
    if (!queue.songs[0]?.isLive) {
        if (MessageSystem.Interval)
            clearInterval(MessageSystem.Interval);
        MessageSystem.Interval = setInterval(async () => {
            const queue = client.queue.get(guild.id);
            if (!queue)
                return clearInterval(MessageSystem.Interval);
            if (queue.player.state.status !== 'playing')
                return;
            return onUpdateMessage(queue.channels.message, true).catch(() => clearInterval(MessageSystem.Interval));
        }, 12e3);
    }
    return AddInQueueMessage(channel, exampleEmbed, Helper_1.Button, queue);
}
async function onWarningMessage({ channel, client, guild }, song, err = null) {
    try {
        const queue = client.queue.get(guild.id);
        const Embed = await (0, Warning_1.Warning)(client, song, queue, err);
        const WarningChannelSend = channel.send({ embeds: [Embed] });
        return DeleteMessage(WarningChannelSend, 5e3);
    }
    catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
    }
}
async function onPushSongMessage({ channel, client, guild }, song) {
    try {
        const queue = client.queue.get(guild.id);
        const EmbedPushedSong = await (0, AddSong_1.AddSong)(client, song, queue);
        const PushChannel = channel.send({ embeds: [EmbedPushedSong] });
        return DeleteMessage(PushChannel, 5e3);
    }
    catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
    }
}
async function DeleteMessage(send, time = 5e3) {
    return send.then(async (msg) => setTimeout(async () => msg.deletable ? msg.delete() : null, time));
}
async function AddInQueueMessage(channel, embed, component, { channels }) {
    try {
        return channel.send({ embeds: [embed], components: [component] }).then(async (msg) => channels.message = msg);
    }
    catch (e) {
        return console.log(`[${(new Date).toLocaleString("ru")}] [MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
    }
}
