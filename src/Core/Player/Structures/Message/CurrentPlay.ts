import {Song} from "../Queue/Song";
import {AudioFilters, Queue} from "../Queue/Queue";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";
import {WatKLOK} from "../../../Client";
import {EmbedConstructor} from "../../../Utils/TypeHelper";
import {TimeInArray, ParseTimeString} from "../../Manager/DurationUtils";

const ProgressBarValue: boolean = true;

/**
 * @description Embed сообщение о текущем треке
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
        //timestamp: new Date(),
        footer: {
            text: `${song.requester.username} | ${TimeInArray(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
            iconURL: song.requester.displayAvatarURL(),
        }
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем Embed<Fields>
 * @param song {Song} Трек
 * @param player {Queue<player>} Плеер
 * @param songs {Queue<songs>>} Все треки
 * @param audioFilters
 * @param client {WatKLOK} Клиент
 */
function createFields(song: Song, {player, songs, audioFilters}: Queue, client: WatKLOK): { name: string, value: string }[] {
    const PlayingDuration = ConvertCurrentTime(player, audioFilters);
    const DurationMusic = MusicDuration(song, PlayingDuration);

    let fields = [{
        name: "Щас играет",
        value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${DurationMusic}`
    }];
    if (songs[1]) fields.push({ name: "Потом", value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
//====================== ====================== ====================== ======================
/**
 * @description
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
 * @param state {audioPlayer<state>} Статус плеера
 * @param filters {AudioFilters}
 * @constructor
 */
function ConvertCurrentTime({state}: AudioPlayer, filters: AudioFilters): number | string {
    const duration = state.resource?.playbackDuration ?? 0;
    let seconds: number = parseInt((duration / 1000).toFixed(0));

    if (ProgressBarValue) return seconds;
    return ParseTimeString(seconds);
}
//====================== ====================== ====================== ======================
/**
 * @description Вычисляем прогресс бар
 * @param currentTime {number} Текущие время
 * @param maxTime {number} Макс времени
 * @param size {number} Кол-во символов
 */
function ProgressBar(currentTime: number, maxTime: number, size: number = 15): string {
    const progressSize = Math.round(size * (currentTime / maxTime));
    const emptySize = size - progressSize;

    const progressText = "─".repeat(progressSize); //Old: "█"
    const emptyText = "─".repeat(emptySize); //Old:

    return `${progressText}⚪${emptyText}`;
}