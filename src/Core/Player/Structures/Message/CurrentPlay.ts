import {Song} from "../Queue/Song";
import {AudioFilters, Queue} from "../Queue/Queue";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";
import {WatKLOK} from "../../../Client";
import {EmbedConstructor} from "../../../Utils/TypeHelper";
import {TimeInArray, ParseTimeString} from "../../Manager/DurationUtils";

const ProgressBarValue: boolean = true;

/**
 * @description Message сообщение о текущем треке
 * @param client {WatKLOK} Клиент
 * @param song {Song} Текущий трек
 * @param queue {Queue} Очередь
 */
export function CurrentPlay(client: WatKLOK, song: Song, queue: Queue): EmbedConstructor {
    return {
        color: song.color,
        author: {
            name: client.ConvertedText(song.author.title, 45, false),
            iconURL: song.author.isVerified === undefined ? NotFound : song.author.isVerified ? Ver : NotVer,
            url: song.author.url,
        },
        thumbnail: {
            url: song.author?.image?.url ?? NotImage,
        },
        fields: createFields(song, queue, client),
        image: {
            url: song.image?.url ?? null
        },
        footer: {
            text: `${song.requester.username} | ${TimeInArray(queue)} | 🎶: ${queue.songs.length}`,
            iconURL: song.requester.avatarURL(),
        }
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем Message<Fields>
 * @param song {Song} Трек
 * @param player {Queue<player>} Плеер
 * @param songs {Queue<songs>>} Все треки
 * @param audioFilters
 * @param client {WatKLOK} Клиент
 */
function createFields(song: Song, {player, songs, audioFilters}: Queue, client: WatKLOK): { name: string, value: string }[] {
    const playbackDuration = ConvertCurrentTime(player, audioFilters);
    const VisualDuration = MusicDuration(song, playbackDuration);

    let fields = [{
        name: "Щас играет",
        value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${VisualDuration}`
    }];
    if (songs[1]) fields.push({ name: "Потом", value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем визуал таймера трека
 * @param isLive {Song<isLive>} Текущий трек, стрим?
 * @param duration {Song<duration>} Продолжительность трека
 * @param curTime {number | string} Текущее время проигрывания трека
 */
function MusicDuration({isLive, duration}: Song, curTime: number | string): string {
    if (isLive) return `[${duration.StringTime}]`;

    const str = `${duration.StringTime}]`;
    const parsedTimeSong = curTime >= duration.seconds ? duration.StringTime : ParseTimeString(curTime as number);
    const progress = ProgressBar(curTime as number, duration.seconds, 15);

    if (ProgressBarValue) return `**❯** [${parsedTimeSong} - ${str}\n${progress}`;
    return `**❯** [${curTime} - ${str}`;
}
//====================== ====================== ====================== ======================
/**
 * @description Конвертируем секунды проигранные плеером
 * @param CurrentTime {number} Время проигрывания
 * @param filters {AudioFilters} Фильтры
 * @constructor
 */
function ConvertCurrentTime({playbackDuration}: AudioPlayer, filters: AudioFilters): number | string {
    if (ProgressBarValue) return playbackDuration;
    return ParseTimeString(playbackDuration);
}
//====================== ====================== ====================== ======================
/**
 * @description Вычисляем прогресс бар
 * @param currentTime {number} Текущие время
 * @param maxTime {number} Макс времени
 * @param size {number} Кол-во символов
 */
function ProgressBar(currentTime: number, maxTime: number, size: number = 15): string {
    if (currentTime < maxTime) {
        const progressSize = Math.round(size * (currentTime / maxTime));
        const emptySize = size - progressSize;
        const progressText = "─".repeat(progressSize);
        const emptyText = "─".repeat(emptySize || size);

        if (progressText.length === emptyText.length) return `${progressText}⚪`;

        return `${progressText}⚪${emptyText}`;
    }
    const progressText = "─".repeat(15);

    return `${progressText}⚪`;
}