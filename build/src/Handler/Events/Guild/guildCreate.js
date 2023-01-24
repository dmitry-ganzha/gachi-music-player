"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildCreate = void 0;
const discord_js_1 = require("discord.js");
const Event_1 = require("@Structures/Handle/Event");
const Buttons = () => {
    const Buttons = {
        OwnerServer: new discord_js_1.ButtonBuilder().setURL("https://discord.gg/qMf2Sv3").setEmoji({ name: "🛡" }).setLabel("My server").setStyle(discord_js_1.ButtonStyle.Link),
        Git: new discord_js_1.ButtonBuilder().setURL("https://github.com/SNIPPIK/WatKLOK").setEmoji({ name: "🗂" }).setLabel("GitHub").setStyle(discord_js_1.ButtonStyle.Link)
    };
    return new discord_js_1.ActionRowBuilder().addComponents([Buttons.OwnerServer, Buttons.Git]);
};
class guildCreate extends Event_1.Event {
    name = "guildCreate";
    isEnable = true;
    run = (guild, f2, client) => {
        if (!guild.systemChannel || guild.systemChannel?.permissionsFor(client.user))
            return;
        const Embed = {
            color: discord_js_1.Colors.Blue,
            author: { name: client.user.username, iconURL: client.user.displayAvatarURL() },
            thumbnail: { url: guild.bannerURL({ size: 4096 }) },
            timestamp: new Date(),
            description: `Приветствую всех пользователей ${guild} сервера. Я просто музыкальный бот, спасибо что добавили меня к себе 🥰`,
        };
        setImmediate(() => guild.systemChannel.send({ embeds: [Embed], components: [Buttons()] }).catch(console.log));
    };
}
exports.guildCreate = guildCreate;
