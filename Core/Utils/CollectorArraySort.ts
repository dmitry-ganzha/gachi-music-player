import {FullTimeSongs} from "../../Modules/Music/src/Manager/Functions/FullTimeSongs";
import {Message, MessageReaction, ReactionCollector, User} from "discord.js";
import {EmbedConstructor, wMessage} from "./TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";

export class CollectorSortReaction {
    /**
     * @description Создаем menu emoji
     * @param embed { EmbedConstructor | string } MessageEmbed или текст
     * @param pages {any[]} ArraySort данные
     * @param page {number} Текущая страница
     * @param message {wMessage} Сообщение с сервера
     * @param EnableQueue {boolean} Добавляем сколько музыки есть в очереди
     */
    public _run = async (embed: EmbedConstructor | string, pages: any[], page: number, message: wMessage, EnableQueue: boolean): Promise<ReactionCollector> => message.channel.send(typeof embed === "string" ? embed : {embeds: [embed]}).then(async (msg: wMessage | Message) => {
        if (!msg.deletable) return null;
        let user: User = message.author, queue: Queue = message.client.queue.get(message.guild.id);

        setTimeout(async () => msg.delete().catch(() => null), 120000);
        let type: CollectorSortReactionFunction = await this._type(embed, page, pages, queue, EnableQueue);
        await this._reaction(user, message, msg as wMessage, type.back, "⬅️");
        await this._reaction(user, message, msg as wMessage, type.cancel, "❌");
        return this._reaction(user, message, msg as wMessage, type.up, "➡️");
    });

    /**
     * @description 3 функции для текстовой menu emoji
     * @param page {number} Текущая страница
     * @param pages {any[]} ArraySort данные
     * @param queue {Queue} Очередь
     */
    protected _callback_string = async (page: number, pages: any[], queue: Queue): Promise<CollectorSortReactionFunction> => {
        return {
            back: async ({users}: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === 1) return null;
                    page--;
                    return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
                }, 150)
            },
            cancel: async (reaction: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => setTimeout(async () => (await this.DeleteMessage(msg), await this.DeleteMessage(message)), 50),
            up: async ({users}: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === pages.length) return null;
                    page++;
                    return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
                }, 150)
            }
        };
    };

    /**
     * @description 3 функции для messageEmbed menu emoji
     * @param page {number} Текущая страница
     * @param pages {any[]} ArraySort данные
     * @param embed {MessageEmbed} MessageEmbed
     * @param queue {Queue} Очередь
     * @param EnableQueue {boolean} Добавляем сколько музыки есть в очереди
     */
    protected _callbacks_embed = async (page: number, pages: any[], embed: EmbedConstructor, queue: Queue, EnableQueue: boolean): Promise<CollectorSortReactionFunction> => {
        return {
            back: async ({users}: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === 1) return null;
                    page--;
                    embed = {...embed, description: pages[page - 1]};
                    if (EnableQueue) embed = {...embed, footer: {text: `${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`, iconURL: message.author.displayAvatarURL()}};
                    else embed = {...embed, footer: {text: `${message.author.username} | Лист ${page} из ${pages.length}`, iconURL: message.author.displayAvatarURL()}};
                    return msg.edit({embeds: [embed]});
                }, 150);
            },
            cancel: async (reaction: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => setTimeout(async () => (await this.DeleteMessage(msg), await this.DeleteMessage(message)), 50),
            up: async ({users}: MessageReaction, user: User, message: wMessage, msg: wMessage): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === pages.length) return null;
                    page++;

                    embed = {...embed, description: pages[page - 1]};
                    if (EnableQueue) embed = {...embed, footer: {text: `${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`, iconURL: message.author.displayAvatarURL()}};
                    else embed = {...embed, footer: {text: `${message.author.username} | Лист ${page} из ${pages.length}`, iconURL: message.author.displayAvatarURL()}};
                    return msg.edit({embeds: [embed]});
                }, 150);
            }
        };
    };

    /**
     * @description Какие 3 функции выдаем
     * @param embed {EmbedConstructor | string} EmbedConstructor или string
     * @param page {number} Текущая страница
     * @param pages {any[]} ArraySort данные
     * @param queue {Queue} Очередь
     * @param EnableQueue {boolean} Добавляем сколько музыки есть в очереди
     */
    protected _type = async (embed: EmbedConstructor | string, page: number, pages: any[], queue: Queue, EnableQueue: boolean): Promise<CollectorSortReactionFunction> => typeof embed === "string" ? this._callback_string(page, pages, queue) : this._callbacks_embed(page, pages, embed, queue, EnableQueue);

    /**
     * @description Создание реакции
     * @param user {User} Пользователь
     * @param message {wMessage} Сообщение
     * @param msg {wMessage} Сообщение
     * @param callback {Function} Выполняем функцию реакции
     * @param emoji {string} Смайл
     */
    protected _reaction = async (user: User, message: wMessage, msg: wMessage, callback: Function, emoji: string): Promise<ReactionCollector> => msg.react(emoji).then(async () => msg.createReactionCollector({filter: async (reaction: MessageReaction, user: User) => this._filter(emoji, reaction, user, message)})
        .on('collect', async (reaction: MessageReaction): Promise<ReactionCollector> => callback(reaction, user, message, msg))).catch(() => undefined);

    /**
     * @description Проверяем пользователь использовал смайл и пользователь не бот
     * @param emoji {string} Смайл
     * @param reaction {MessageReaction} Реакция пользователя
     * @param user {User} Пользователь
     * @param message {wMessage} Сообщение
     */
    protected _filter = (emoji: string, reaction: MessageReaction, user: User, message: wMessage): boolean => (reaction.emoji.name === emoji && user.id !== message.client.user.id);

    /**
     * @description Удаляем сообщение
     * @param msg {wMessage} Сообщение
     */
    protected DeleteMessage = (msg: wMessage): Promise<wMessage | null> => msg.deletable ? msg.delete().catch(() => null) : null;
}


interface CollectorSortReactionFunction {
    cancel: (reaction: MessageReaction, user: User, message: wMessage, msg: wMessage) => Promise<NodeJS.Timeout>
    back: (reaction: MessageReaction, user: User, message: wMessage, msg: wMessage) => Promise<NodeJS.Timeout>
    up: (reaction: MessageReaction, user: User, message: wMessage, msg: wMessage) => Promise<NodeJS.Timeout>
}
