import {ClientMessage, EmbedConstructor, ClientInteractive, UtilsMsg} from "@Client/interactionCreate";
import {ReactionMenuSettings} from "@db/Config.json";
import {MessageReaction, User} from "discord.js";

const emojis = ReactionMenuSettings.emojis;

interface Callbacks {
    back: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => any;
    next: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => any;
    cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => any;
}

export class ReactionMenu {
    /**
     * @description Создаем menu emoji
     * @param embed {EmbedConstructor | string} MessageEmbed или текст
     * @param message {ClientMessage} Сообщение с сервера
     * @param callbacks {Callbacks} Функции
     * @param isSlash
     * @requires {reaction}
     */
    public constructor(embed: EmbedConstructor | string, message: ClientInteractive, callbacks: Callbacks, isSlash: boolean = false) {
        const args = typeof embed === "string" ? {content: embed, fetchReply: true} : {embeds: [embed], fetchReply: true};

        setImmediate(() => {
            const promise = (msg: ClientMessage) => Object.entries(callbacks).forEach(([key, value]) => {
                // @ts-ignore
                const emoji = emojis[key];
                const callback = (reaction: MessageReaction) => value(reaction, message.author, message, msg);

                return UtilsMsg.createReaction(msg, emoji, (reaction, user) => reaction.emoji.name === emoji && user.id !== message.client.user.id, callback, 60e3);
            });

            if (isSlash) message.reply(args).then(promise);
            else (message as ClientMessage).channel.send(args).then(promise);
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Функции для управления <CollectorSortReaction>
     * @param page {number} С какой страницы начнем
     * @param pages {Array<string>} страницы
     * @param embed {EmbedConstructor} Json<Embed>
     */
    public static Callbacks = (page: number, pages: string[], embed: EmbedConstructor) => {
        return {
            //При нажатии на 1 эмодзи, будет выполнена эта функция
            back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => void setImmediate(() => {
                users.remove(user).catch((err) => console.log(err));

                if (page === 1 || !msg.editable) return null;
                page--;
                embed = { ...embed, description: pages[page - 1], footer: { ...embed.footer, text: `${message.author.username} | Лист ${page} из ${pages.length}` }};

                return msg.edit({embeds: [embed]});
            }),
            //При нажатии на 2 эмодзи, будет выполнена эта функция
            cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => void setImmediate(() => {
                [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
            }),
            //При нажатии на 3 эмодзи, будет выполнена эта функция
            next: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => void setImmediate(() => {
                users.remove(user).catch((err) => console.log(err));

                if (page === pages.length || !msg.editable) return null;
                page++;
                embed = { ...embed, description: pages[page - 1], footer: { ...embed.footer, text: `${message.author.username} | Лист ${page} из ${pages.length}` }};

                return msg.edit({embeds: [embed]});
            })
        };
    };
}