"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoolDownBase = exports.Helper = exports.GuildMessage = void 0;
const discord_js_1 = require("discord.js");
const Colors_1 = require("../../Core/Utils/Colors");
const ParserTimeSong_1 = require("../../Modules/Music/src/Manager/Functions/ParserTimeSong");
const Config_json_1 = __importDefault(require("../../db/Config.json"));
class GuildMessage {
    constructor() {
        this.name = "messageCreate";
        this.enable = true;
        this.run = async (message) => {
            const prefix = message.client.cfg.Bot.prefix;
            if (message.author.bot || !message.content.startsWith(prefix) || message.channel.type === discord_js_1.ChannelType.DM)
                return;
            const args = message.content.split(" ").slice(1);
            const command = GuildMessage.getCommand(message, prefix);
            const CoolDownFind = exports.CoolDownBase.get(message.author.id);
            if (Helper.isOwner(true, message.author.id)) {
                if (CoolDownFind)
                    return message.client.Send({ text: `${message.author.username}, Воу воу, ты слишком быстро отправляешь сообщения. Подожди ${(0, ParserTimeSong_1.ParserTimeSong)(CoolDownFind.time)}`, message, type: "css" });
                else {
                    exports.CoolDownBase.set(message.author.id, {
                        time: command?.CoolDown ?? 5
                    });
                    setTimeout(async () => exports.CoolDownBase.delete(message.author.id), (command?.CoolDown ?? 5) * 1e3 ?? 5e3);
                }
            }
            if (command) {
                await Promise.all([Helper.DeleteMessage(message, 12e3)]);
                if (Helper.isOwner(command?.isOwner, message.author.id))
                    return message.client.Send({ text: `${message.author}, Эта команда не для тебя!`, message, color: 'RED' });
                if ((await Promise.all([Helper.isPermissions(command?.permissions, message)]))[0])
                    return console.log('User has Permission');
                return (await Promise.all([command.run(message, args)]))[0];
            }
            return message.client.Send({ text: `${message.author}, Я не нахожу такой команды, используй ${prefix}help  :confused:`, message, color: 'RED' });
        };
    }
}
exports.GuildMessage = GuildMessage;
GuildMessage.getCommand = ({ content, client }, prefix) => {
    let cmd = content.slice(prefix.length).trim().split(/ +/g).shift().toLowerCase();
    return client.commands.get(cmd) ?? client.commands.get(client.aliases.get(cmd));
};
class Helper {
}
exports.Helper = Helper;
_a = Helper;
Helper.isOwner = (isOwner, AuthorID) => {
    if (isOwner)
        return !Config_json_1.default.Bot.OwnerIDs.includes(AuthorID);
    return false;
};
Helper.isPermissions = async (permissions, message) => {
    let isEnablePermissions = false;
    if (permissions) {
        if ((permissions?.user || permissions?.client)?.length > 0)
            isEnablePermissions = await new Permissions().PermissionSize(permissions, message);
    }
    return isEnablePermissions;
};
Helper.DeleteMessage = async (message, time = 2e3) => setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
class Permissions {
    constructor() {
        this.PermissionSize = (permissions, message) => {
            if ((permissions.user || permissions.client).length > 1)
                return this._createPresencePerm(permissions, message);
            return this._createPresenceOnePerm(permissions, message);
        };
        this._createPresenceOnePerm = async (permissions, message) => {
            if (permissions.client) {
                if (!message.guild.me.permissions.has(permissions.client[0])) {
                    await this.SendMessage(await NotPermissions(message, `У меня нет таких прав!`, `•${permissions.client[0]}`), message.channel);
                    return true;
                }
            }
            else if (permissions.user) {
                if (!message.member.permissions.has(permissions.user[0])) {
                    await this.SendMessage(await NotPermissions(message, `У тебя нет таких прав!`, `•${permissions.user[0]}`), message.channel);
                    return true;
                }
            }
            return false;
        };
        this._createPresencePerm = async (permissions, message) => {
            let resp = await this._parsePermissions(permissions, message);
            if (resp !== '') {
                await this.SendMessage(await NotPermissions(message, `У меня нет таких прав!`, resp), message.channel);
                return true;
            }
            return false;
        };
        this._parsePermissions = async (permissions, message, resp = '') => {
            if (permissions.client) {
                for (let i in permissions.client) {
                    if (!message.guild?.me?.permissions?.has(permissions.client[i]))
                        resp += `•${permissions.client[i]}\n`;
                }
            }
            else if (permissions.user) {
                for (let i in permissions.user) {
                    if (!message.member.permissions.has(permissions.user[i]))
                        resp += `•${permissions.user[i]}\n`;
                }
            }
            return resp;
        };
        this.SendMessage = async (embed, channel) => channel.send({ embeds: [embed] }).then((msg) => Helper.DeleteMessage(msg, 12e3)).catch(null);
    }
}
async function NotPermissions({ author, client }, name, text) {
    return {
        color: Colors_1.Colors.BLUE,
        author: { name: author.username, iconURL: author.displayAvatarURL({}) },
        thumbnail: { url: client.user.displayAvatarURL({}) },
        fields: [{ name: name, value: text }],
        timestamp: new Date()
    };
}
exports.CoolDownBase = new Map();
