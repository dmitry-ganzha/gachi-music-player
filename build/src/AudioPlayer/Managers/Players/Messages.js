"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagePlayer = void 0;
const discord_js_1 = require("discord.js");
const interactionCreate_1 = require("@Client/interactionCreate");
const CycleStep_1 = require("@Managers/Players/CycleStep");
const EmbedMessages_1 = require("@Structures/EmbedMessages");
const Client_1 = require("@Client/Client");
const ButtonIDs = ["skip", "resume_pause", "replay", "last"];
var MessagePlayer;
(function (MessagePlayer) {
    function toPlay(message) {
        CycleStep_1.MessageCycle.toRemove(message.channelId);
        setImmediate(() => {
            const msg = pushCurrentSongMessage(message);
            if (msg)
                msg.then(CycleStep_1.MessageCycle.toPush).catch(console.log);
        });
    }
    MessagePlayer.toPlay = toPlay;
    function toError(queue, err = null) {
        const { client, channel } = queue.message;
        setImmediate(() => {
            try {
                const Embed = EmbedMessages_1.EmbedMessages.toError(client, queue, err);
                const WarningChannelSend = channel.send({ embeds: [Embed] });
                WarningChannelSend.then(interactionCreate_1.UtilsMsg.deleteMessage);
            }
            catch (e) {
                (0, Client_1.consoleTime)(`[MessagePlayer]: [function: toError]: ${e.message}`);
            }
        });
    }
    MessagePlayer.toError = toError;
    function toPushSong(queue, song) {
        const { client, channel } = queue.message;
        setImmediate(() => {
            try {
                const EmbedPushedSong = EmbedMessages_1.EmbedMessages.toPushSong(client, song, queue);
                const PushChannel = channel.send({ embeds: [EmbedPushedSong] });
                PushChannel.then(interactionCreate_1.UtilsMsg.deleteMessage);
            }
            catch (e) {
                (0, Client_1.consoleTime)(`[MessagePlayer]: [function: toPushSong]: ${e.message}`);
            }
        });
    }
    MessagePlayer.toPushSong = toPushSong;
    function toPushPlaylist(message, playlist) {
        const { channel } = message;
        setImmediate(() => {
            try {
                const EmbedPushPlaylist = EmbedMessages_1.EmbedMessages.toPushPlaylist(message, playlist);
                const PushChannel = channel.send({ embeds: [EmbedPushPlaylist] });
                PushChannel.then(interactionCreate_1.UtilsMsg.deleteMessage);
            }
            catch (e) {
                (0, Client_1.consoleTime)(`[MessagePlayer]: [function: toPushPlaylist]: ${e.message}`);
            }
        });
    }
    MessagePlayer.toPushPlaylist = toPushPlaylist;
})(MessagePlayer = exports.MessagePlayer || (exports.MessagePlayer = {}));
function pushCurrentSongMessage(message) {
    const queue = message.client.queue.get(message.guild.id);
    if (!queue?.song)
        return;
    const CurrentPlayEmbed = EmbedMessages_1.EmbedMessages.toPlay(message.client, queue);
    const Buttons = new discord_js_1.ActionRowBuilder().addComponents([
        new discord_js_1.ButtonBuilder().setCustomId("last").setEmoji({ id: "986009800867479572" }).setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder().setCustomId("resume_pause").setEmoji({ id: "986009725432893590" }).setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder().setCustomId("skip").setEmoji({ id: "986009774015520808" }).setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder().setCustomId("replay").setEmoji({ id: "986009690716667964" }).setStyle(discord_js_1.ButtonStyle.Secondary)
    ]);
    const sendMessage = message.channel.send({ embeds: [CurrentPlayEmbed], components: [Buttons] });
    sendMessage.then((msg) => CreateCollector(msg, queue));
    sendMessage.catch((e) => console.log(`[MessageEmitter]: [function: pushCurrentSongMessage]: ${e.message}`));
    return sendMessage;
}
function CreateCollector(message, queue) {
    const collector = message.createMessageComponentCollector({ filter: (i) => ButtonIDs.includes(i.customId), componentType: discord_js_1.ComponentType.Button });
    const { player } = queue;
    const EmitPlayer = message.client.player;
    player.once("idle", () => collector.stop());
    collector.on("collect", (i) => {
        message.author = i?.member?.user ?? i?.user;
        try {
            i.deferReply();
            i.deleteReply();
        }
        catch (e) { }
        switch (i.customId) {
            case "resume_pause": {
                switch (player.state.status) {
                    case "read": return void EmitPlayer.pause(message);
                    case "pause": return void EmitPlayer.resume(message);
                }
                return;
            }
            case "skip": return void EmitPlayer.skip(message, 1);
            case "replay": return void EmitPlayer.replay(message);
            case "last": return queue?.swapSongs();
        }
    });
    return collector;
}
