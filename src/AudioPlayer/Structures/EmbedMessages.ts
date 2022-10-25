import {WatKLOK} from "../../Core/Client/Client";
import {InputPlaylist, Song} from "./Queue/Song";
import {AudioFilters, Queue} from "./Queue/Queue";
import {DurationUtils} from "../Manager/DurationUtils";
import {ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/Message";
import {Colors} from "discord.js";

// Настройки прогресс бара текущей музыки
const Bar = {
    //Состояние прогресс бара
    Enable: true,

    //Текст после кнопкой
    empty: "─",
    //Текст перед кнопкой
    full: "─",
    //Если оставить пустым не будет деления между empty и full
    button: "⚪"
}

//Вспомогательный элемент
export namespace Images {
    export const Verification = "https://media.discordapp.net/attachments/815897363188154408/1028014390299082852/Ok.png";
    export const NotVerification = "https://media.discordapp.net/attachments/815897363188154408/1028014389934174308/Not.png";
    export const NotFound = "https://media.discordapp.net/attachments/815897363188154408/1028014390752055306/WTF.png";
    export const NotImage = "https://media.discordapp.net/attachments/815897363188154408/1028014391146328124/MusciNote.png";
}

//Здесь хранятся все EMBED данные о сообщениях (Используется в MessagePlayer)
export namespace EmbedMessages {
    /**
    * @description Message сообщение о текущем треке
    * @param client {WatKLOK} Клиент
    * @param queue {Queue} Очередь
    */
    export function toPlay(client: WatKLOK, queue: Queue): EmbedConstructor {
        const song = queue.song;

        return { color: song.color,
            author: { name: client.replaceText(song.author.title, 45, false), url: song.author.url,
                iconURL: song.author.isVerified === undefined ? Images.NotFound : song.author.isVerified ? Images.Verification : Images.NotVerification },
            thumbnail: { url: song.author?.image?.url ?? Images.NotImage },
            fields: toPlayFunctions.getFields(queue, client),
            image: { url: song.image?.url ?? null },
            footer: { text: `${song.requester.username} | ${DurationUtils.getTimeQueue(queue)} | 🎶: ${queue.songs.length}`, iconURL: song.requester.avatarURL() }
        };
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Message сообщение о добавленном треке
     * @param client {WatKLOK} Клиент
     * @param color {Song<color>} Цвет
     * @param song {Song} Трек который был добавлен
     * @param songs {Queue<songs>} Все треки
     */
    export function toPushSong(client: WatKLOK, song: Song, {songs}: Queue): EmbedConstructor {
        const { color, author, image, title, url, duration, requester } = song;

        return { color,
            author: { name: client.replaceText(author.title, 45, false), iconURL: author?.image?.url ?? Images.NotImage, url: author.url },
            thumbnail: { url: !image?.url ? author?.image.url : image?.url ?? Images.NotImage },
            fields: [{ name: "Добавлено в очередь", value: `**❯** [${client.replaceText(title, 40, true)}](${url}})\n**❯** [${duration.full}]` }],
            footer: { text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester.avatarURL() }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем Message сообщение для отправки в чат
     * @param client {WatKLOK} Бот
     * @param DisAuthor {ClientMessage.author} Автор сообщения
     * @param playlist {InputPlaylist} Плейлист
     * @param author {InputPlaylist.author} Автор плейлиста
     */
    export function toPushPlaylist({client, author: DisAuthor}: ClientMessage, playlist: InputPlaylist): EmbedConstructor {
        const { author, image, url, title, items } = playlist;

        return { color: Colors.Blue,
            author: { name: author?.title, iconURL: author?.image?.url ?? Images.NotImage, url: author?.url },
            thumbnail: { url: typeof image === "string" ? image : image.url ?? Images.NotImage },
            description: `Найден плейлист [${title}](${url})`,
            timestamp: new Date(),
            footer: { text: `${DisAuthor.username} | ${DurationUtils.getTimeQueue(items)} | 🎶: ${items?.length}`, iconURL: DisAuthor.displayAvatarURL({}) }
        };
    }
    //====================== ====================== ====================== ======================
    /**
    * @description Message сообщение о добавленном треке
    * @param client {WatKLOK} Клиент
    * @param color {Song<color>} Цвет
    * @param songs {Queue<songs>} Все треки
    * @param err {Error} Ошибка выданная плеером
    */
    export function toError(client: WatKLOK, {songs, song}: Queue, err: Error | string): EmbedConstructor {
        const {color, author, image, title, url, requester} = song;

        return { color,
            description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
            author: { name: client.replaceText(author.title, 45, false), url: author.url,
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification },
            thumbnail: { url: image?.url ?? Images.NotImage },
            timestamp: new Date(),
            footer: { text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL() }
        }
    }
}

namespace toPlayFunctions {
    /**
     * @description Создаем Message<Fields>
     * @param queue {Queue} Очередь
     * @param client {WatKLOK} Клиент
     * @requires {ConvertTime, MusicDuration}
     */
    export function getFields(queue: Queue, client: WatKLOK): { name: string, value: string }[] {
        const {player, songs, filters, song} = queue;
        const playbackDuration = ConvertTime(player.streamDuration, filters);
        const VisualDuration = MusicDuration(song, playbackDuration);

        //Текущий трек
        let fields = [{ name: "Щас играет", value: `**❯** [${client.replaceText(song.title, 29, true)}](${song.url})\n${VisualDuration}` }];
        //Следующий трек
        if (songs.length > 1) fields.push({ name: "Потом", value: `**❯** [${client.replaceText(songs[1].title, 29, true)}](${songs[1].url})` });
        return fields;
    }
    //====================== ====================== ====================== ======================
    /**
    * @description Создаем визуал таймера трека
    * @param isLive {Song<isLive>} Текущий трек, стрим?
    * @param duration {Song<duration>} Продолжительность трека
    * @param curTime {number | string} Текущее время проигрывания трека
    * @requires {ProgressBar}
    */
    function MusicDuration({isLive, duration}: Song, curTime: number | string): string {
        if (isLive || duration.full === "Live") return `[${duration.full}]`;

        const str = `${duration.full}]`;
        const parsedTimeSong = curTime >= duration.seconds ? duration.full : DurationUtils.ParsingTimeToString(curTime as number);
        const progress = ProgressBar(curTime as number, duration.seconds, 15);

        if (Bar.Enable) return `**❯** [${parsedTimeSong} - ${str}\n${progress}`;
        return `**❯** [${curTime} - ${str}`;
    }
    //====================== ====================== ====================== ======================
    /**
    * @description Конвертируем секунды проигранные плеером
    * @param streamDuration {number} Сколько прошло времени с момента включения
    * @param filters {AudioFilters} Фильтры
    */
    function ConvertTime(streamDuration: number, filters: AudioFilters): number | string {
        if (Bar.Enable) return streamDuration;
        return DurationUtils.ParsingTimeToString(streamDuration);
    }
    //====================== ====================== ====================== ======================
    /**
    * @description Вычисляем прогресс бар
    * @param currentTime {number} Текущие время
    * @param maxTime {number} Макс времени
    * @param size {number} Кол-во символов
    */
    function ProgressBar(currentTime: number, maxTime: number, size: number = 15): string {
        try {
            const CurrentDuration = isNaN(currentTime) ? 0 : currentTime;
            const progressSize = Math.round(size * (CurrentDuration / maxTime));
            const progressText = Bar.full.repeat(progressSize);
            const emptyText = Bar.empty.repeat(size - progressSize);

            return `${progressText}${Bar.button}${emptyText}`;
        } catch (err) {
            if (err === "RangeError: Invalid count value") return "**❯** [Error value]";
            return "**❯** [Loading]";
        }
    }
}