"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushSongMessage = exports.ErrorPlayerMessage = exports.PlaySongMessage = void 0;
const CurrentPlay_1 = require("../Structures/Message/CurrentPlay");
const Helper_1 = require("../Structures/Message/Helper");
const Warning_1 = require("../Structures/Message/Warning");
const AddSong_1 = require("../Structures/Message/AddSong");
const LiteUtils_1 = require("../../Utils/LiteUtils");
const Message = new LiteUtils_1.CollectionMap();
let MessageTimer = null;
function PlaySongMessage(message) {
    if (Message.get(message.channelId))
        removeMessage(message);
    AddInQueueMessage(message).then((msg) => {
        setImmediate(() => addMessage(msg));
    });
}
exports.PlaySongMessage = PlaySongMessage;
function ErrorPlayerMessage({ channel, client, guild }, song, err = null) {
    setImmediate(() => {
        try {
            const queue = client.queue.get(guild.id);
            const Embed = (0, Warning_1.Warning)(client, song, queue, err);
            const WarningChannelSend = channel.send({ embeds: [Embed] });
            return DeleteMessage(WarningChannelSend, 5e3);
        }
        catch (e) {
            client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
        }
    });
}
exports.ErrorPlayerMessage = ErrorPlayerMessage;
function PushSongMessage({ channel, client, guild }, song) {
    setImmediate(() => {
        try {
            const queue = client.queue.get(guild.id);
            const EmbedPushedSong = (0, AddSong_1.AddSong)(client, song, queue);
            const PushChannel = channel.send({ embeds: [EmbedPushedSong] });
            return DeleteMessage(PushChannel, 5e3);
        }
        catch (e) {
            client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
        }
    });
}
exports.PushSongMessage = PushSongMessage;
function UpdateMessage(message) {
    const queue = message.client.queue.get(message.guild.id);
    if (!queue || queue?.songs?.length === 0)
        return removeMessage(message);
    setImmediate(() => {
        const CurrentPlayEmbed = (0, CurrentPlay_1.CurrentPlay)(message.client, queue?.songs[0], queue);
        try {
            return message.edit({ embeds: [CurrentPlayEmbed] });
        }
        catch (e) {
            message.client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    });
}
function AddInQueueMessage(message) {
    const queue = message.client.queue.get(message.guild.id);
    const CurrentPlayEmbed = (0, CurrentPlay_1.CurrentPlay)(message.client, queue.songs[0], queue);
    try {
        return message.channel.send({ embeds: [CurrentPlayEmbed], components: [Helper_1.Button] });
    }
    catch (e) {
        message.client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
    }
}
function DeleteMessage(send, time = 5e3) {
    setImmediate(() => {
        send.then((msg) => setTimeout(() => msg.deletable ? msg.delete() : null, time));
    });
}
function addMessage(message) {
    if (Message.get(message.channelId))
        return;
    Message.set(message.channelId, message);
    if (Message.size === 1)
        setImmediate(StepCycleMessage);
}
function removeMessage(message) {
    const Find = Message.get(message.channelId);
    if (!Find)
        return;
    if (Find.deletable)
        Find.delete().catch(() => undefined);
    Message.delete(message.channelId);
    if (Message.size === 0 && typeof MessageTimer !== 'undefined')
        clearTimeout(MessageTimer);
}
function StepCycleMessage() {
    try {
        Message.forEach((message) => setImmediate(() => UpdateMessage(message)));
    }
    finally {
        MessageTimer = setTimeout(StepCycleMessage, 12e3);
    }
}
