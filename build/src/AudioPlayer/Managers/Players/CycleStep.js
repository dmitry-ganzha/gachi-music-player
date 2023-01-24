"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageCycle = exports.PlayerCycle = void 0;
const EmbedMessages_1 = require("@Structures/EmbedMessages");
const Client_1 = require("@Client/Client");
const Config_json_1 = require("@db/Config.json");
const db = {
    pls: [],
    msg: [],
    timeout: null,
    timeout_m: null,
    time: 0
};
var PlayerCycle;
(function (PlayerCycle) {
    function toPush(player) {
        if (db.pls.includes(player))
            return;
        db.pls.push(player);
        if (db.pls.length === 1) {
            db.time = Date.now() + Config_json_1.Music.AudioPlayer.sendDuration;
            setImmediate(playerCycleStep);
        }
    }
    PlayerCycle.toPush = toPush;
    function toRemove(player) {
        const index = db.pls.indexOf(player);
        if (index != -1)
            db.pls.splice(index, 1);
        if (db.pls.length < 1) {
            if (db.timeout)
                clearTimeout(db.timeout);
            db.time = null;
            db.timeout = null;
        }
    }
    PlayerCycle.toRemove = toRemove;
})(PlayerCycle = exports.PlayerCycle || (exports.PlayerCycle = {}));
function playerCycleStep() {
    const players = db.pls.filter((player) => player.state.status === "read");
    try {
        db.time += 20;
        for (const player of players)
            player["preparePacket"]();
    }
    finally {
        db.timeout = setTimeout(playerCycleStep, db.time - Date.now());
    }
}
var MessageCycle;
(function (MessageCycle) {
    function toPush(message) {
        if (db.msg.find(msg => message.channelId === msg.channelId))
            return;
        db.msg.push(message);
        if (db.msg.length === 1)
            setImmediate(StepCycleMessage);
    }
    MessageCycle.toPush = toPush;
    function toRemove(ChannelID) {
        const Find = db.msg.find(msg => msg.channelId === ChannelID);
        if (!Find)
            return;
        if (Find.deletable)
            Find.delete().catch(() => undefined);
        const index = db.msg.indexOf(Find);
        if (index != -1)
            db.msg.splice(index, 1);
        if (db.msg.length === 0) {
            if (db.timeout_m) {
                clearTimeout(db.timeout_m);
                db.timeout_m = null;
            }
        }
    }
    MessageCycle.toRemove = toRemove;
})(MessageCycle = exports.MessageCycle || (exports.MessageCycle = {}));
function StepCycleMessage() {
    setImmediate(() => {
        try {
            setTimeout(() => db.msg.forEach(UpdateMessage), 1e3);
        }
        finally {
            db.timeout_m = setTimeout(StepCycleMessage, 15e3);
        }
    });
}
function UpdateMessage(message) {
    const { client, guild } = message;
    const queue = client.queue.get(guild.id);
    if (!queue || !queue?.song)
        return MessageCycle.toRemove(message.channelId);
    if (queue.player.hasUpdate)
        return;
    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages_1.EmbedMessages.toPlay(client, queue);
        return message.edit({ embeds: [CurrentPlayEmbed] }).catch((e) => {
            if (e.message === "Unknown Message")
                MessageCycle.toRemove(message.channelId);
            (0, Client_1.consoleTime)(`[MessageEmitter]: [function: UpdateMessage]: ${e.message}`);
        });
    });
}
