import {Command, replacer, ResolveData} from "../../../Structures/Handle/Command";
import {MessageReaction, User} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {Song} from "../../../AudioPlayer/Structures/Queue/Song";
import {DurationUtils} from "../../../AudioPlayer/Managers/DurationUtils";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export default class CommandQueue extends Command {
    public constructor() {
        super({
            name: "queue",
            aliases: ["queue", "list", "musiclist"],
            description: "Показать всю музыку добавленную в очередь этого сервера?",

            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        //Получаем то что надо было преобразовать в string[]
        const pages = this.#parsedSongs(queue.songs);
        const CurrentPlaying = `Current playing -> [${queue.song.title}]`; //Музыка, которая играет сейчас
        const Footer = `${message.author.username} | ${DurationUtils.getTimeQueue(queue)} | Лист 1 из ${pages.length} | Songs: ${queue.songs.length}`; //Что будет снизу сообщения


        return {embed: `\`\`\`css\n➡️ | ${CurrentPlaying}\n\n${pages[0]}\n\n${Footer}\`\`\``, callbacks: this.#Callbacks(1, pages, queue)}
    };

    //====================== ====================== ====================== ======================
    /**
     * @description Из <Song[]> делаем <string[]>
     * @param ArraySongs {Song[]} Музыка которую надо изменить
     * @private
     */
    readonly #parsedSongs = (ArraySongs: Song[]) => {
        const pages: string[] = [];
        let TrackNumber = 1;

        //Преобразуем все песни в string
        // @ts-ignore
        ArraySongs.ArraySort(10).forEach((songs: Song[]) => {
            const song = songs.map((song: Song) => {
                const Duration = song.duration.full;
                const TitleSong = replacer.replaceText(song.title, 80, true).replace(/[\s",']/g, ' ');

                return `[${TrackNumber++}] - [${Duration}] | ${TitleSong}`;
            }).join("\n");

            //Если song не undefined, то добавляем его в pages
            if (song !== undefined) pages.push(song);
        });

        return pages;
    };

    //====================== ====================== ====================== ======================
    /**
     * @description Функции для управления <CollectorSortReaction>
     * @param page {number} С какой страницы начнем
     * @param pages {Array<string>} страницы
     * @param queue {Queue} Очередь сервера
     * @private
     */
    readonly #Callbacks = (page: number, pages: string[], queue: Queue) => {
        return {
            //При нажатии на 1 эмодзи, будет выполнена эта функция
            back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === 1) return null;
                    page--;
                    return this.#EditMessage(queue, message, msg, pages, page);
                });
            },
            //При нажатии на 2 эмодзи, будет выполнена эта функция
            cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
                });
            },
            //При нажатии на 3 эмодзи, будет выполнена эта функция
            next: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === pages.length) return null;
                    page++;
                    return this.#EditMessage(queue, message, msg, pages, page);
                });
            }
        };
    };

    //====================== ====================== ====================== ======================
    /**
     * @description Изменяем данные сообщения
     * @param queue {Queue} Очередь сервера
     * @param message {ClientMessage} Сообщение пользователя
     * @param msg {ClientMessage} Сообщение бота
     * @param pages {string[]} Страницы
     * @param page {number} Номер ткущей страницы
     * @private
     */
    readonly #EditMessage = (queue: Queue, message: ClientMessage, msg: ClientMessage, pages: string[], page: number) => {
        const CurrentPlaying = `Current playing -> [${queue.song.title}]`;
        const Footer = `${message.author.username} | ${DurationUtils.getTimeQueue(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}`;

        return msg.edit(`\`\`\`css\n➡️ | ${CurrentPlaying}\n\n${pages[page - 1]}\n\n${Footer}\`\`\``);
    };
}