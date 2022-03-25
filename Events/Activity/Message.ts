import {Channel, EmbedConstructor, wMessage} from "../../Core/Utils/TypesHelper";
import {ChannelType} from "discord.js";
import {Command} from "../../Commands/Constructor";
import {Colors} from "../../Core/Utils/Colors";
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";
import cfg from '../../db/Config.json';

type CommandPermission = Command['permissions'];
type CommandIsOwner = Command['isOwner'];

export class GuildMessage {
    public readonly name: string = "messageCreate";
    public readonly enable: boolean = true;

    public run = async (message: wMessage) => {
        const prefix = message.client.cfg.Bot.prefix;

        if (message.author.bot || !message.content.startsWith(prefix) || message.channel.type === ChannelType.DM) return;

        const args = message.content.split(" ").slice(1);
        const command = GuildMessage.getCommand(message, prefix);
        const CoolDownFind = CoolDownBase.get(message.author.id);

        if (Helper.isOwner(true, message.author.id)) {
            if (CoolDownFind) return message.client.Send({ text: `${message.author.username}, Воу воу, ты слишком быстро отправляешь сообщения. Подожди ${ParserTimeSong(CoolDownFind.time)}`, message, type: "css" });
            else {
                CoolDownBase.set(message.author.id, {
                    time: command?.CoolDown ?? 5
                });
                setTimeout(async () => CoolDownBase.delete(message.author.id), (command?.CoolDown ?? 5) * 1e3 ?? 5e3);
            }
        }

        if (command) {
            await Promise.all([Helper.DeleteMessage(message, 12e3)]);

            if (Helper.isOwner(command?.isOwner, message.author.id)) return message.client.Send({ text: `${message.author}, Эта команда не для тебя!`, message, color: 'RED'})
            if ((await Promise.all([Helper.isPermissions(command?.permissions, message)]))[0]) return console.log('User has Permission');

            return command.run(message, args);
        }
        return message.client.Send({ text: `${message.author}, Я не нахожу такой команды, используй ${prefix}help  :confused:`, message, color: 'RED'});
    };
    // Получаем данные о команде
    protected static getCommand = ({content, client}: wMessage, prefix: string) => {
        let cmd = content.slice(prefix.length).trim().split(/ +/g).shift().toLowerCase();
        return client.commands.get(cmd) ?? client.commands.get(client.aliases.get(cmd));
    };
}

export class Helper {
    // Пользователь owner?
    public static isOwner = (isOwner: CommandIsOwner, AuthorID: string) => {
        if (isOwner) return !cfg.Bot.OwnerIDs.includes(AuthorID);
        return false;
    }
    // У пользователя есть ограничения?
    public static isPermissions = async (permissions: CommandPermission, message: wMessage): Promise<boolean> => {
        let isEnablePermissions = false;
        if (permissions) {
            if ((permissions?.user || permissions?.client)?.length > 0) isEnablePermissions = await new Permissions().PermissionSize(permissions, message);
        }
        return isEnablePermissions;
    };
    public static DeleteMessage = async (message: wMessage, time: number = 2e3): Promise<NodeJS.Timeout> => setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
}

class Permissions {
    // Проверяем сколько прав
    public PermissionSize = (permissions: CommandPermission, message: wMessage) => {
        if ((permissions.user || permissions.client).length > 1) return this._createPresencePerm(permissions, message);
        return this._createPresenceOnePerm(permissions, message);
    };
    // Если одно право
    protected _createPresenceOnePerm = async (permissions: CommandPermission, message: wMessage): Promise<boolean> => {
        if (permissions.client) {
            if (!message.guild.me.permissions.has(permissions.client[0])) {
                await this.SendMessage(await NotPermissions(message, `У меня нет таких прав!`, `•${permissions.client[0]}`), message.channel);
                return true;
            }
        } else if (permissions.user) {
            if (!message.member.permissions.has(permissions.user[0])) {
                await this.SendMessage(await NotPermissions(message, `У тебя нет таких прав!`, `•${permissions.user[0]}`), message.channel);
                return true;
            }
        }
        return false;
    };
    // Если прав более 1
    protected _createPresencePerm = async (permissions: CommandPermission, message: wMessage): Promise<boolean> => {
        let resp = await this._parsePermissions(permissions, message);
        if (resp !== '') {
            await this.SendMessage(await NotPermissions(message, `У меня нет таких прав!`, resp), message.channel);
            return true;
        }
        return false;
    };
    protected _parsePermissions = async (permissions: CommandPermission, message: wMessage, resp: string = ''): Promise<string> => {
        // Права бота
        if (permissions.client) {
            for (let i in permissions.client) {
                if (!message.guild?.me?.permissions?.has(permissions.client[i])) resp += `•${permissions.client[i]}\n`;
            }
        // Права пользователя
        } else if (permissions.user) {
            for (let i in permissions.user) {
                if (!message.member.permissions.has(permissions.user[i])) resp += `•${permissions.user[i]}\n`;
            }
        }
        return resp;
    };
    // Отправляем сообщение о том каких прав нет у пользователя или бота
    protected SendMessage = async (embed: EmbedConstructor, channel: Channel): Promise<NodeJS.Timeout> => channel.send({embeds: [embed as any]}).then((msg: wMessage | any) => Helper.DeleteMessage(msg, 12e3)).catch(null);
}

//Embed сообщение
async function NotPermissions({author, client}: wMessage, name: string, text: string): Promise<EmbedConstructor> {
    return {
        color: Colors.BLUE,
        author: { name: author.username, iconURL: author.displayAvatarURL({}) },
        thumbnail: { url: client.user.displayAvatarURL({}) },
        fields: [{ name: name, value: text }],
        timestamp: new Date() as any
    }
}

export const CoolDownBase = new Map();