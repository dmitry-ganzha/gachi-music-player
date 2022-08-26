import {MessageReaction, ReactionCollector, User} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/Message";

const emojis = {
    back: "⬅️",
    next: "➡️",
    cancel: "❌"
}

interface Callbacks {
    back: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => any;
    next: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => any;
    cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage)  => any;
}

export class CollectorSortReaction {
    /**
     * @description Создаем menu emoji
     * @param embed { EmbedConstructor | string } MessageEmbed или текст
     * @param message {ClientMessage} Сообщение с сервера
     * @param callbacks {Callbacks} Функции
     * @requires {reaction}
     */
    public constructor(embed: EmbedConstructor | string, message: ClientMessage, callbacks: Callbacks) {
        setImmediate(() => {
            message.channel.send(typeof embed === "string" ? embed : {embeds: [embed]}).then((msg) => {
                // @ts-ignore
                Object.entries(callbacks).forEach(([key, value]) => reaction(message.author, message, msg, value, emojis[key]));
            });
        });
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создание реакции
 * @param user {User} Пользователь
 * @param message {ClientMessage} Сообщение
 * @param msg {ClientMessage} Сообщение
 * @param callback {Function} Выполняем функцию реакции
 * @param emoji {string} Смайл
 * @requires {filter}
 */
function reaction(user: User, message: ClientMessage, msg: ClientMessage, callback: Function, emoji: string): Promise<ReactionCollector> {
    return msg.react(emoji).then(() => msg.createReactionCollector({filter: (reaction: MessageReaction, user: User) => filter(emoji, reaction, user, message), time: 1e4 * 25})
        .on("collect", (reaction: MessageReaction): Promise<ReactionCollector> => callback(reaction, user, message, msg))).catch(() => undefined);
}
//====================== ====================== ====================== ======================
/**
 * @description Проверяем пользователь использовал смайл и пользователь не бот
 * @param emoji {string} Смайл
 * @param reaction {MessageReaction} Реакция пользователя
 * @param user {User} Пользователь
 * @param message {ClientMessage} Сообщение
 */
function filter(emoji: string, reaction: MessageReaction, user: User, message: ClientMessage) {
    return (reaction.emoji.name === emoji && user.id !== message.client.user.id);
}