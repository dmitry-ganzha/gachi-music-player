"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePlayer = void 0;
const EmbedMessages_1 = require("../Structures/EmbedMessages");
const discord_js_1 = require("discord.js");
const LiteUtils_1 = require("../../Core/Utils/LiteUtils");
const Buttons = new discord_js_1.ActionRowBuilder().addComponents([
    new discord_js_1.ButtonBuilder().setCustomId("last").setEmoji({ id: "986009800867479572" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("resume_pause").setEmoji({ id: "986009725432893590" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("skip").setEmoji({ id: "986009774015520808" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("replay").setEmoji({ id: "986009690716667964" }).setStyle(discord_js_1.ButtonStyle.Secondary)
]);
const ButtonID = new Set(["skip", "resume_pause", "replay", "last"]);
const MessagesData = {
    messages: new LiteUtils_1.CollectionMap(),
    timer: null
};
var MessagePlayer;
(function (MessagePlayer) {
    function toPlay(message) {
        if (MessagesData.messages.get(message.channelId))
            MessageUpdater.toRemove(message);
        pushCurrentSongMessage(message).then(MessageUpdater.toPush);
    }
    MessagePlayer.toPlay = toPlay;
    function toError(queue, song, err = null) {
        const { client, channel } = queue.channels.message;
        setImmediate(() => {
            try {
                const Embed = EmbedMessages_1.EmbedMessages.toError(client, song, queue, err);
                const WarningChannelSend = channel.send({ embeds: [Embed] });
                WarningChannelSend.then(LiteUtils_1.GlobalUtils.DeleteMessage);
            }
            catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
    MessagePlayer.toError = toError;
    function toBuffering(queue, song) {
        const { client, channel } = queue.channels.message;
        setImmediate(() => {
            try {
                const Embed = EmbedMessages_1.EmbedMessages.toBuffering(client, song, queue);
                const BufferingChannelSend = channel.send({ embeds: [Embed] });
                BufferingChannelSend.then(LiteUtils_1.GlobalUtils.DeleteMessage);
            }
            catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
    MessagePlayer.toBuffering = toBuffering;
    function toPushSong(queue, song) {
        const { client, channel } = queue.channels.message;
        setImmediate(() => {
            try {
                const EmbedPushedSong = EmbedMessages_1.EmbedMessages.toPushSong(client, song, queue);
                const PushChannel = channel.send({ embeds: [EmbedPushedSong] });
                PushChannel.then(LiteUtils_1.GlobalUtils.DeleteMessage);
            }
            catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
    MessagePlayer.toPushSong = toPushSong;
    function toPushPlaylist(message, playlist) {
        const { channel, client } = message;
        setImmediate(() => {
            try {
                const EmbedPushPlaylist = EmbedMessages_1.EmbedMessages.toPushPlaylist(message, playlist);
                const PushChannel = channel.send({ embeds: [EmbedPushPlaylist] });
                PushChannel.then(LiteUtils_1.GlobalUtils.DeleteMessage);
            }
            catch (e) {
                client.console(`[MessagePlayer]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
            }
        });
    }
    MessagePlayer.toPushPlaylist = toPushPlaylist;
})(MessagePlayer = exports.MessagePlayer || (exports.MessagePlayer = {}));
function UpdateMessage(message) {
    const queue = message.client.queue.get(message.guild.id);
    if (!queue || queue?.songs?.length === 0)
        return MessageUpdater.toRemove(message);
    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages_1.EmbedMessages.toPlay(message.client, queue?.songs[0], queue);
        try {
            return message.edit({ embeds: [CurrentPlayEmbed] });
        }
        catch (e) {
            message.client.console(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    });
}
function pushCurrentSongMessage(message) {
    const queue = message.client.queue.get(message.guild.id);
    const CurrentPlayEmbed = EmbedMessages_1.EmbedMessages.toPlay(message.client, queue.songs[0], queue);
    const sendMessage = message.channel.send({ embeds: [CurrentPlayEmbed], components: [Buttons] });
    sendMessage.then((msg) => CreateCollector(msg, queue));
    sendMessage.catch((e) => console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`));
    return sendMessage;
}
function CreateCollector(message, queue) {
    const collector = message.createMessageComponentCollector({
        filter: (i) => ButtonID.has(i.customId),
        componentType: discord_js_1.ComponentType.Button,
    });
    collector.on("collect", (i) => {
        switch (i.customId) {
            case "resume_pause": {
                switch (queue?.player.state.status) {
                    case "playing": return queue?.player.pause();
                    case "paused": return queue?.player.resume();
                }
                return;
            }
            case "skip": return queue?.player.stop();
            case "replay": return queue?.player.play(queue);
            case "last": return queue?.swapSongs();
        }
    });
    return collector;
}
var MessageUpdater;
(function (MessageUpdater) {
    function toPush(message) {
        if (MessagesData.messages.get(message.channelId))
            return;
        MessagesData.messages.set(message.channelId, message);
        if (MessagesData.messages.size === 1)
            setImmediate(StepCycleMessage);
    }
    MessageUpdater.toPush = toPush;
    function toRemove(message) {
        const Find = MessagesData.messages.get(message.channelId);
        if (!Find)
            return;
        if (Find.deletable)
            Find.delete().catch(() => undefined);
        MessagesData.messages.delete(message.channelId);
        if (MessagesData.messages.size === 0) {
            if (typeof MessagesData.timer !== "undefined")
                clearTimeout(MessagesData.timer);
        }
    }
    MessageUpdater.toRemove = toRemove;
})(MessageUpdater || (MessageUpdater = {}));
function StepCycleMessage() {
    try {
        setImmediate(() => MessagesData.messages.forEach(UpdateMessage));
    }
    finally {
        MessagesData.timer = setTimeout(StepCycleMessage, 12e3);
    }
}
