import {ClientMessage, WatKLOK} from "../../Client";
import {Song} from "./Queue/Song";
import {AudioFilters, Queue} from "./Queue/Queue";
import {EmbedConstructor, InputPlaylist} from "../../Utils/TypeHelper";
import {AudioPlayer} from "../Audio/AudioPlayer";
import {Colors} from "../../Utils/LiteUtils";
import {DurationUtils} from "../Manager/DurationUtils";

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

/**
 * Вспомогательный элемент
 */
export namespace Images {
    export const Verification = "https://cdn.discordapp.com/attachments/860113484493881365/986005795038715904/Ok.png";
    export const NotVerification = "https://cdn.discordapp.com/attachments/860113484493881365/986005794849980486/Not.png";
    export const NotFound = "https://cdn.discordapp.com/attachments/860113484493881365/986005794627670086/WTF.png";
    export const NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
}
//====================== ====================== ====================== ======================
/**
 * Здесь хранятся все EMBED данные о сообщениях (Используется в MessagePlayer)
 */
export namespace EmbedMessages {
    /**
     * @description Message сообщение о текущем треке
     * @param client {WatKLOK} Клиент
     * @param song {Song} Текущий трек
     * @param queue {Queue} Очередь
     */
    export function toPlay(client: WatKLOK, song: Song, queue: Queue): EmbedConstructor {
        return {
            color: song.color,
            author: {
                name: client.replaceText(song.author.title, 45, false),
                iconURL: song.author.isVerified === undefined ? Images.NotFound : song.author.isVerified ? Images.Verification : Images.NotVerification,
                url: song.author.url,
            },
            thumbnail: {
                url: song.author?.image?.url ?? Images.NotImage,
            },
            fields: CurrentPlayFunction.getFields(song, queue, client),
            image: {
                url: song.image?.url ?? null
            },
            footer: {
                text: `${song.requester.username} | ${DurationUtils.getTimeQueue(queue)} | 🎶: ${queue.songs.length}`,
                iconURL: song.requester.avatarURL(),
            }
        };
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Message сообщение о добавленном треке
     * @param client {WatKLOK} Клиент
     * @param color {Song<color>} Цвет
     * @param author {Song<author>} Автор трека
     * @param image {Song<image>} Картинка трека
     * @param title {Song<title>} Название трека
     * @param url {Song<url>} Ссылка на трек
     * @param duration {Song<duration>} Длительность трека
     * @param requester {Song<requester>} Кто включил трек
     * @param type {string} Платформа где была взята музыка
     * @param songs {Queue<songs>} Все треки
     */
    export function toPushSong(client: WatKLOK, {color, author, image, title, url, duration, requester, type}: Song, {songs}: Queue): EmbedConstructor {
        return {
            color,
            author: {
                name: client.replaceText(author.title, 45, false),
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification,
                url: author.url,
            },
            thumbnail: {
                url: !image?.url ? author?.image.url : image?.url ?? Images.NotImage,
            },
            fields: [{
                name: "Добавлено в очередь",
                value: `**❯** [${client.replaceText(title, 40, true)}](${url}})\n**❯** [${duration.StringTime}]`
            }],
            footer: {
                text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`,
                iconURL: requester.avatarURL(),
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем Message сообщение для отправки в чат
     * @param client {WatKLOK} Бот
     * @param DisAuthor {ClientMessage.author} Автор сообщения
     * @param author {InputPlaylist.author} Автор плейлиста
     * @param image {InputPlaylist.image} Картинка плейлиста
     * @param url {InputPlaylist.url} Ссылка на плейлист
     * @param title {InputPlaylist.title} Название плейлиста
     * @param items {InputPlaylist.items} Треки плейлиста
     */
    export function toPushPlaylist({client, author: DisAuthor}: ClientMessage, {author, image, url, title, items}: InputPlaylist): EmbedConstructor {
        return {
            color: Colors.BLUE,
            author: {
                name: author?.title,
                iconURL: author?.image?.url ?? Images.NotImage,
                url: author?.url,
            },
            thumbnail: {
                url: typeof image === "string" ? image : image.url ?? Images.NotImage
            },
            description: `Найден плейлист [${title}](${url})`,
            timestamp: new Date(),
            footer: {
                text: `${DisAuthor.username} | ${DurationUtils.getTimeQueue(items)} | 🎶: ${items?.length}`,
                iconURL: DisAuthor.displayAvatarURL({}),
            }
        };
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Message сообщение о добавленном треке
     * @param client {WatKLOK} Клиент
     * @param color {Song<color>} Цвет
     * @param author {Song<author>} Автор трека
     * @param image {Song<image>} Картинка трека
     * @param title {Song<title>} Название трека
     * @param url {Song<url>} Ссылка на трек
     * @param duration {Song<duration>} Длительность трека
     * @param requester {Song<requester>} Кто включил трек
     * @param type {string} Платформа где была взята музыка
     * @param songs {Queue<songs>} Все треки
     * @param err {Error} Ошибка выданная плеером
     */
    export function toError(client: WatKLOK, {color, author, image, title, url, duration, requester, type}: Song, {songs}: Queue, err: Error | string): EmbedConstructor {
        return {
            color,
            description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
            author: {
                name: client.replaceText(author.title, 45, false),
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification,
                url: author.url,
            },
            thumbnail: {
                url: image?.url ?? Images.NotImage,
            },
            timestamp: new Date(),
            footer: {
                text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`,
                iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL(),
            }
        }
    }
}

namespace CurrentPlayFunction {
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем Message<Fields>
     * @param song {Song} Трек
     * @param player {Queue<player>} Плеер
     * @param songs {Queue<songs>>} Все треки
     * @param audioFilters
     * @param client {WatKLOK} Клиент
     * @requires {ConvertTime, MusicDuration}
     */
    export function getFields(song: Song, {player, songs, audioFilters}: Queue, client: WatKLOK): { name: string, value: string }[] {
        const playbackDuration = ConvertTime(player, audioFilters);
        const VisualDuration = MusicDuration(song, playbackDuration);

        let fields = [{ name: "Щас играет", value: `**❯** [${client.replaceText(song.title, 29, true)}](${song.url})\n${VisualDuration}` }];
        if (songs[1]) fields.push({ name: "Потом", value: `**❯** [${client.replaceText(songs[1].title, 29, true)}](${songs[1].url})` });
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
        if (isLive) return `[${duration.StringTime}]`;

        const str = `${duration.StringTime}]`;
        const parsedTimeSong = curTime >= duration.seconds ? duration.StringTime : DurationUtils.ParsingTimeToString(curTime as number);
        const progress = ProgressBar(curTime as number, duration.seconds, 15);

        if (Bar.Enable) return `**❯** [${parsedTimeSong} - ${str}\n${progress}`;
        return `**❯** [${curTime} - ${str}`;
    }
//====================== ====================== ====================== ======================
    /**
     * @description Конвертируем секунды проигранные плеером
     * @param CurrentTime {number} Время проигрывания
     * @param filters {AudioFilters} Фильтры
     * @constructor
     */
    function ConvertTime({playbackDuration}: AudioPlayer, filters: AudioFilters): number | string {
        if (Bar.Enable) return playbackDuration;
        return DurationUtils.ParsingTimeToString(playbackDuration);
    }
//====================== ====================== ====================== ======================
    /**
     * @description Вычисляем прогресс бар
     * @param currentTime {number} Текущие время
     * @param maxTime {number} Макс времени
     * @param size {number} Кол-во символов
     */
    function ProgressBar(currentTime: number, maxTime: number, size: number = 15): string {
        if (currentTime > maxTime) {
            const progressText = Bar.empty.repeat(15);

            return `${Bar.button}${progressText}`;
        }
        const progressSize = Math.round(size * (currentTime / maxTime));
        const progressText = Bar.full.repeat(progressSize);
        const emptyText = Bar.empty.repeat(size - progressSize);

        return `${progressText}${Bar.button}${emptyText}`;
    }
}