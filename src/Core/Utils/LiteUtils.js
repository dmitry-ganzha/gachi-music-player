"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageChannelSend = exports.Connections = exports.getButtons = exports.getMe = exports.ConvertedText = exports.ConsoleLog = exports.CollectionMap = exports.Colors = void 0;
const discord_js_1 = require("discord.js");
const Config_json_1 = __importDefault(require("../../../DataBase/Config.json"));
const voice_1 = require("@discordjs/voice");
const Colors = {
    YELLOW: 0xfee75c,
    RED: 0xed4245,
    GREEN: 1420288,
    BLUE: 258300,
    WHITE: 0xffffff,
    BLACK: 0x000000,
    RANDOM: 0,
    GREY: 0x95a5a6,
    NAVY: 0x34495e,
    GOLD: 0xf1c40f,
    ORANGE: 0xe67e22,
    PURPLE: 0x9b59b6,
};
exports.Colors = Colors;
class CollectionMap extends Map {
    constructor() {
        super(...arguments);
        this.swap = (set = 0, next, path, K) => {
            const Array = this.get(K)[path];
            const hasChange = Array[next];
            Array[next] = Array[set];
            Array[set] = hasChange;
        };
    }
    get Array() {
        const db = [];
        for (let [, value] of this.entries())
            db.push(value);
        return db;
    }
    ;
}
exports.CollectionMap = CollectionMap;
function ConsoleLog(text) {
    return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
}
exports.ConsoleLog = ConsoleLog;
function ConvertedText(text, value, clearText = false) {
    try {
        if (clearText)
            text = text.replace('[', '').replace(']', '').replace(/`/, '');
        if (text.length > value && value !== false) {
            return `${text.substring(0, value)}...`;
        }
        else
            return text;
    }
    catch {
        return text;
    }
}
exports.ConvertedText = ConvertedText;
function getMe(guild) {
    return guild.members.cache.get(guild.client.user.id);
}
exports.getMe = getMe;
function getButtons(ClientID) {
    const Buttons = {
        MyUrl: new discord_js_1.ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${ClientID}&permissions=8&scope=bot+applications.commands`).setEmoji({ name: '🔗' }).setLabel('Invite').setStyle(discord_js_1.ButtonStyle.Link),
        ServerUrl: new discord_js_1.ButtonBuilder().setURL(Config_json_1.default.Bot.DiscordServer).setEmoji({ name: '🛡' }).setLabel('Help server').setStyle(discord_js_1.ButtonStyle.Link),
        Git: new discord_js_1.ButtonBuilder().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji({ name: "🗂" }).setLabel("GitHub").setStyle(discord_js_1.ButtonStyle.Link)
    };
    return new discord_js_1.ActionRowBuilder().addComponents([Buttons.MyUrl, Buttons.ServerUrl, Buttons.Git]);
}
exports.getButtons = getButtons;
function Connections(Guild) {
    const Users = [], set = (0, voice_1.getVoiceConnection)(Guild.id);
    if (set) {
        Guild.voiceStates.cache.find((fn) => {
            if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId))
                return;
            Users.push(fn);
        });
    }
    return Users;
}
exports.Connections = Connections;
function MessageChannelSend(options) {
    if (typeof options.type === 'string')
        return SendMessageCode(options);
    return SendMessageNoCode(options);
}
exports.MessageChannelSend = MessageChannelSend;
function SendMessageCode(options) {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));
}
function SendMessageNoCode(options) {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, options.text)]
    }));
}
function CatchMessage(type) {
    type.then((msg) => setTimeout(() => msg.deletable ? msg.delete() : null, 12e3))
        .catch((err) => console.log(`[Discord Error]: [Send message] ${err}`));
    return;
}
function MessageEmbed(color = 'BLUE', description) {
    return {
        color: typeof color === "number" ? color : ConvertColor(color), description
    };
}
function ConvertColor(color) {
    let colorOut;
    try {
        colorOut = Colors[color];
    }
    catch {
        return Colors.BLUE;
    }
    return colorOut;
}
