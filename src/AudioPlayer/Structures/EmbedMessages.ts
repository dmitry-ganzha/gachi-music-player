import {WatKLOK} from "../../Core/Client/Client";
import {InputPlaylist, Song} from "./Queue/Song";
import {Queue} from "./Queue/Queue";
import {DurationUtils} from "../Managers/DurationUtils";
import {ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/interactiveCreate";
import {Colors} from "discord.js";
import {replacer} from "../../Structures/Handle/Command";

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
            author: { name: replacer.replaceText(song.author.title, 45, false), url: song.author.url,
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
            author: { name: replacer.replaceText(author.title, 45, false), iconURL: author?.image?.url ?? Images.NotImage, url: author.url },
            thumbnail: { url: !image?.url ? author?.image.url : image?.url ?? Images.NotImage },
            fields: [{ name: "Добавлено в очередь", value: `**❯** [${replacer.replaceText(title, 40, true)}](${url}})\n**❯** [\`\`${duration.full}]\`\`` }],
            footer: { text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester.avatarURL() }
        };
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
            author: { name: replacer.replaceText(author.title, 45, false), url: author.url,
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification },
            thumbnail: { url: image?.url ?? Images.NotImage },
            timestamp: new Date(),
            footer: { text: `${requester.username} | ${DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL() }
        };
    }
}
namespace toPlayFunctions {
    /**
     * @description Создаем Message<Fields>
     * @param queue {Queue} Очередь
     * @param client {WatKLOK} Клиент
     */
    export function getFields(queue: Queue, client: WatKLOK): { name: string, value: string }[] {
        const {songs, song, player} = queue;
        const VisualDuration = playTime.toString(song.duration, player.streamDuration);
        //Текущий трек
        const fields = [{ name: "Щас играет", value: `**❯** [${replacer.replaceText(song.title, 29, true)}](${song.url})\n${VisualDuration}` }];

        //Следующий трек
        if (songs.length > 1) fields.push({ name: "Потом", value: `**❯** [${replacer.replaceText(songs[1].title, 29, true)}](${songs[1].url})` });
        return fields;
    }
}

namespace playTime {
    /**
     * @description Получаем время трека для embed сообщения
     * @param duration
     * @param playDuration
     */
    export function toString(duration: { seconds: number, full: string }, playDuration: number) {
        if (duration.full === "Live" || !Bar.Enable) return `\`\`[${duration}]\`\``;

        const parsedDuration = DurationUtils.ParsingTimeToString(playDuration);
        const progress = matchBar(playDuration as number, duration.seconds, 20);
        const string = `**❯** \`\`[${parsedDuration} \\ ${duration.full}]\`\` \n\`\``;

        return `${string}${progress}\`\``;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Вычисляем прогресс бар
     * @param currentTime {number} Текущие время
     * @param maxTime {number} Макс времени
     * @param size {number} Кол-во символов
     */
    function matchBar(currentTime: number, maxTime: number, size: number = 15) {
        try {
            const CurrentDuration = isNaN(currentTime) ? 0 : currentTime;
            const progressSize = Math.round(size * (CurrentDuration / maxTime));
            const progressText = Bar.full.repeat(progressSize);
            const emptyText = Bar.empty.repeat(size - progressSize);

            return `${progressText}${Bar.button}${emptyText}`;
        } catch (err) {
            if (err === "RangeError: Invalid count value") return "**❯** \`\`[Error value]\`\`";
            return "**❯** \`\`[Loading]\`\`";
        }
    }
}