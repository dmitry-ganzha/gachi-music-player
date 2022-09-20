import {MessageReaction, User} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/Message";
import {GlobalUtils} from "./LiteUtils";

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
            message.channel.send(typeof embed === "string" ? embed : {embeds: [embed]}).then((msg) => Object.entries(callbacks).forEach(([key, value]) => {
                const callback = (reaction: MessageReaction) => value(reaction, message.author, message, msg);
                // @ts-ignore
                const emoji = emojis[key];
                return GlobalUtils.createReaction(msg, emoji, (reaction, user) => reaction.emoji.name === emoji && user.id !== message.client.user.id, callback);
            }));
        });
    }
}