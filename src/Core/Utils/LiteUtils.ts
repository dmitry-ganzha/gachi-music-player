import {ButtonStyle, Colors, MessageReaction, User} from "discord.js";
import {Command} from "../../Structures/Command";
import {Bot} from "../../../DataBase/Config.json";
import {ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/Message";

export namespace messageUtils {
    //Удаляем сообщение
    export function deleteMessage(message: ClientMessage, time: number = 12e3): void {
        setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
    }
    //Создаем сборщик сообщений
    export function createCollector(message: ClientMessage, filter: (m: ClientMessage) => boolean, max: number = 1, time: number = 20e3) {
        // @ts-ignore
        return message.channel.createMessageCollector({ filter, max, time });
    }
    //Добавляем реакцию к сообщению + взаимодействие
    export function createReaction(message: ClientMessage, emoji: string, filter: (reaction: MessageReaction, user: User) => boolean, callback: (reaction: MessageReaction) => any, time = 20e3): void {
        setTimeout(() => message?.deletable ? message?.delete().catch(() => undefined) : null, time);

        message.react(emoji).then(() => message.createReactionCollector({filter, time})
            .on("collect", (reaction: MessageReaction) => callback(reaction))).catch(() => undefined);
    }
}

//Проверка прав (проверят права указанные в команде)
export namespace UtilsPermissions {
    // Пользователь owner?
    export function isOwner(isOwner: Command['isOwner'], AuthorID: string) {
        if (isOwner) return !Bot.OwnerIDs.includes(AuthorID);
        return false;
    }
    // У пользователя есть ограничения?
    export function isPermissions(permissions: Command['permissions'], message: ClientMessage): boolean {
        if (permissions.client?.length > 0 || permissions.user?.length > 0) {
            const {client, user} = _parsePermissions(permissions, message);
            const Embed = EmbedNotPermissions(message);

            //Добавляем fields если есть ограничения для бота
            if (client) Embed.fields.push({name: "У меня нет этих прав!", value: client});

            //Добавляем fields если есть ограничения для пользователя
            if (user) Embed.fields.push({name: "У тебя нет этих прав!", value: user});

            //Отправляем сообщение
            if (user || client) {
                message.channel.send({embeds: [Embed as any]}).then(messageUtils.deleteMessage).catch(() => null);

                return true;
            }
        }

        return false;
    }
    //Создает строку с правами которые не доступны
    function _parsePermissions(permissions: Command['permissions'], message: ClientMessage): {user: string, client: string } {
        let ClientString = "", UserString = "";

        //Если permissions.client больше 0, то делаем проверку
        if (permissions.client?.length > 0) {
            for (let i in permissions.client) {
                if (!message.guild.members.me?.permissions?.has(permissions.client[i])) ClientString += `•${permissions.client[i]}\n`;
            }
        }
        //Если permissions.user больше 0, то делаем проверку
        if (permissions.user?.length > 0) {
            for (let i in permissions.user) {
                if (!message.member.permissions.has(permissions.user[i])) UserString += `•${permissions.user[i]}\n`;
            }
        }

        return { user: UserString, client: ClientString };
    }
}

//Message сообщение
function EmbedNotPermissions({author, client}: ClientMessage): EmbedConstructor {
    return {
        color: Colors.Blue,
        author: { name: author.username, iconURL: author.displayAvatarURL({}) },
        thumbnail: { url: client.user.displayAvatarURL({}) },
        timestamp: new Date() as any
    }
}