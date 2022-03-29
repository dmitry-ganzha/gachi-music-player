"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildCreate = void 0;
const discord_js_1 = require("discord.js");
const Config_json_1 = __importDefault(require("../../db/Config.json"));
const Colors_1 = require("../../Core/Utils/Colors");
class guildCreate {
    constructor() {
        this.name = 'guildCreate';
        this.enable = true;
        this.run = async (guild, f2, client) => {
            const Buttons = {
                MyUrl: new discord_js_1.ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands`).setEmoji({ name: '🔗' }).setLabel('Invite').setStyle(discord_js_1.ButtonStyle.Link),
                ServerUrl: new discord_js_1.ButtonBuilder().setURL(Config_json_1.default.Bot.DiscordServer).setEmoji({ name: '🛡' }).setLabel('Help server').setStyle(discord_js_1.ButtonStyle.Link),
                Git: new discord_js_1.ButtonBuilder().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji({ name: "🗂" }).setLabel("GitHub").setStyle(discord_js_1.ButtonStyle.Link)
            };
            const RunButt = new discord_js_1.ActionRowBuilder().addComponents(Buttons.MyUrl, Buttons.ServerUrl);
            return guild.systemChannel ? guild.systemChannel.send({ embeds: [await ConstructEmbed(guild, client)], components: [RunButt] }).then(async (msg) => setTimeout(async () => msg.delete().catch(async (err) => console.log(`[Discord Message]: [guildCreate]: [Delete]: ${err}`)), 60e3)).catch(async (e) => console.log(`[Discord event]: [guildCreate]: ${e}`)) : null;
        };
    }
}
exports.guildCreate = guildCreate;
async function ConstructEmbed(guild, client) {
    return {
        color: Colors_1.Colors.GREEN,
        author: {
            name: guild.name,
            iconURL: guild.iconURL({ size: 512 })
        },
        description: `**Спасибо что добавили меня 😉**\nМоя основная задача музыка, официальные платформы которые я поддерживаю (YouTube, Spotify, VK)\nЯ полностью бесплатный.\nНасчет ошибок и багов писать в лс SNIPPIK#4178.\nДанное сообщение будет удалено через 1 мин.\nРестарт каждые 24 часа.`,
        thumbnail: { url: guild.bannerURL({ size: 4096 }) },
        timestamp: new Date()
    };
}
