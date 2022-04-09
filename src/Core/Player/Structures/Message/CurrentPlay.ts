import {FullTimeSongs} from "../../Manager/Duration/FullTimeSongs";
import {Song} from "../Queue/Song";
import {Queue} from "../Queue/Queue";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {ParserTimeSong} from "../../Manager/Duration/ParserTimeSong";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";
import {WatKLOK} from "../../../Client";
import {EmbedConstructor} from "../../../Utils/TypeHelper";
import {AudioFilters} from "../../FFmpeg";

const ProgressBarValue = true;

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
            text: `${song.requester.username} | ${FullTimeSongs(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
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
    const PlayingDuration = ConvertCurrentTime(player, ProgressBarValue, audioFilters);
    const DurationMusic = MusicDuration(song, PlayingDuration, ProgressBarValue);

    let fields = [{
        name: `Щас играет`,
        value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${DurationMusic}`
    }];
    if (songs[1]) fields.push({ name: `Потом`, value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
//====================== ====================== ====================== ======================
/**
 * @description
 * @param isLive {Song<isLive>} Текущий трек, стрим?
 * @param duration {Song<duration>} Продолжительность трека
 * @param curTime {number | string} Текущее время проигрывания трека
 * @param progressBar {boolean} Показать прогресс
 */
function MusicDuration({isLive, duration}: Song, curTime: number | string, progressBar: boolean = true): string {
    const str = `${duration.StringTime}]`;

    if (isLive) return `[${str}`;

    const parsedTimeSong = ParserTimeSong(curTime as number);
    const progress = ProgressBar(curTime as number, duration.seconds, 12);

    if (progressBar) return `**❯** [${parsedTimeSong} - ${str}\n|${progress}|`;
    return `**❯** [${curTime} - ${str}`;
}
//====================== ====================== ====================== ======================
/**
 * @description Конвертируем секунды проигранные плеером
 * @param state {audioPlayer<state>} Статус плеера
 * @param ProgressBar {boolean} Показать прогресс
 * @param filters {AudioFilters}
 * @constructor
 */
function ConvertCurrentTime({state}: AudioPlayer, ProgressBar: boolean = true, filters: AudioFilters): number | string {
    const duration = state.resource?.playbackDuration ?? 0;
    let seconds: number;

    if (filters.speed) seconds = parseInt(((duration / 1000) * filters.speed).toFixed(0));
    else if (filters.nightcore) seconds = parseInt(((duration / 1000) * 1.25).toFixed(0));
    else if (filters.Vw) seconds = parseInt(((duration / 1000) * 0.8).toFixed(0));
    else seconds = parseInt((duration / 1000).toFixed(0));

    if (ProgressBar) return seconds;
    return ParserTimeSong(seconds);
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

    const progressText = "█".repeat(progressSize);
    const emptyText = "ᅠ".repeat(emptySize);

    return progressText + emptyText;
}