import {ChannelType} from "discord.js";
import {Command} from "../../Commands/Constructor";
import cfg from '../../../DataBase/Config.json';
import {ClientMessage} from "../../Core/Client";
import {Channel, EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/LiteUtils";
import {DurationUtils} from "../../Core/Player/Manager/DurationUtils";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;

type CommandPermission = Command['permissions'];
type CommandIsOwner = Command['isOwner'];

export class GuildMessage {
    public readonly name: string = "messageCreate";
    public readonly enable: boolean = true;

    public readonly run = (message: ClientMessage) => {
        const prefix = message.client.cfg.Bot.prefix;

        if (message.author.bot || !message.content.startsWith(prefix) || message.channel.type === ChannelType.DM) return;

        const args = message.content.split(" ").slice(1);
        const command = this.#getCommand(message, prefix);
        const CoolDownFind = CoolDownBase.get(message.author.id);

        if (isOwner(true, message.author.id)) {
            if (CoolDownFind) return message.client.Send({
                text: `${message.author.username}, Воу воу, ты слишком быстро отправляешь сообщения. Подожди ${ParsingTimeToString(CoolDownFind.time)}`,
                message,
                type: "css"
            });

            CoolDownBase.set(message.author.id, {time: command?.CoolDown ?? 5});
            setTimeout(() => CoolDownBase.delete(message.author.id), (command?.CoolDown ?? 5) * 1e3 ?? 5e3);
        }

        if (command) {
            DeleteMessage(message, 12e3);

            if (isOwner(command?.isOwner, message.author.id)) return message.client.Send({ text: `${message.author}, Эта команда не для тебя!`, message, color: "RED"})
            if (isPermissions(command?.permissions, message)) return;

            return command.run(message, args);
        }
        return message.client.Send({ text: `${message.author}, Я не нахожу такой команды, используй ${prefix}help  :confused:`, message, color: "RED"});
    };
    // Получаем данные о команде
    #getCommand = ({content, client}: ClientMessage, prefix: string) => {
        let cmd = content.slice(prefix.length).trim().split(/ +/g).shift().toLowerCase();
        return client.commands.get(cmd) ?? client.commands.get(client.aliases.get(cmd));
    };
}

class Permissions {
    // Проверяем сколько прав
    public PermissionSize = (permissions: CommandPermission, message: ClientMessage) => {
        if ((permissions.user || permissions.client).length > 1) return this.#_createPresencePerm(permissions, message);
        return this.#_createPresenceOnePerm(permissions, message);
    };
    // Если одно право
    #_createPresenceOnePerm = (permissions: CommandPermission, message: ClientMessage): boolean => {
        if (permissions.client) {
            if (!message.guild.members.me.permissions.has(permissions.client[0])) {
                this.#SendMessage(NotPermissions(message, "У меня нет таких прав!", `•${permissions.client[0]}`), message.channel).catch(() => null);
                return true;
            }
        } else if (permissions.user) {
            if (!message.member.permissions.has(permissions.user[0])) {
                this.#SendMessage(NotPermissions(message, "У тебя нет таких прав!", `•${permissions.user[0]}`), message.channel).catch(() => null);
                return true;
            }
        }
        return false;
    };
    // Если прав более 1
    #_createPresencePerm = (permissions: CommandPermission, message: ClientMessage): boolean => {
        let resp = this.#_parsePermissions(permissions, message);
        if (resp !== '') {
            this.#SendMessage(NotPermissions(message, "У меня нет таких прав!", resp), message.channel).catch(() => null);
            return true;
        }
        return false;
    };
    #_parsePermissions = (permissions: CommandPermission, message: ClientMessage, resp: string = ''): string => {
        // Права бота
        if (permissions.client) {
            for (let i in permissions.client) {
                if (!message.guild.members.me?.permissions?.has(permissions.client[i])) resp += `•${permissions.client[i]}\n`;
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
    #SendMessage = (embed: EmbedConstructor, channel: Channel): Promise<void> => channel.send({embeds: [embed as any]}).then((msg: any) => DeleteMessage(msg, 12e3));
}

//Message сообщение
function NotPermissions({author, client}: ClientMessage, name: string, text: string): EmbedConstructor {
    return {
        color: Colors.BLUE,
        author: { name: author.username, iconURL: author.displayAvatarURL({}) },
        thumbnail: { url: client.user.displayAvatarURL({}) },
        fields: [{ name: name, value: text }],
        timestamp: new Date() as any
    }
}
// Пользователь owner?
export function isOwner(isOwner: CommandIsOwner, AuthorID: string) {
    if (isOwner) return !cfg.Bot.OwnerIDs.includes(AuthorID);
    return false;
}
// У пользователя есть ограничения?
function isPermissions(permissions: CommandPermission, message: ClientMessage): boolean {
    let isEnablePermissions = false;
    if (permissions) {
        if ((permissions?.user || permissions?.client)?.length > 0) isEnablePermissions = new Permissions().PermissionSize(permissions, message);
    }
    return isEnablePermissions;
}
function DeleteMessage(message: ClientMessage, time: number = 2e3): void {
    setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
}


export const CoolDownBase = new Map();