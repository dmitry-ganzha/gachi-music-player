import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";

export namespace DurationUtils {
    /**
     * @description Совмещаем время всех треков из очереди
     * @param queue {Queue | any[]} Очередь
     * @constructor
     */
    export function getTimeQueue(queue: Queue | Array<any>): string {
        let Timer: number = 0;

        if (queue instanceof Queue) queue.songs.forEach((song: Song) => Timer += song.duration.seconds);
        else queue.forEach((song: {duration: {seconds: string}}) => Timer += parseInt(song.duration.seconds));

        return ParsingTimeToString(Timer);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем готовый формат времени. Пример 00:00:00:00 (Days:Hours:Minutes:Seconds)
     * @param duration {number} Число
     * @requires {toStringTime}
     * @constructor
     */
    export function ParsingTimeToString(duration: number): string {
        let days = toStringTime(duration / ((60 * 60) * 24) % 24);
        let hours = toStringTime(duration / (60 * 60) % 24);
        let minutes = toStringTime((duration / 60) % 60);
        let seconds = toStringTime(duration % 60);

        return (days > 0 ? `${days}:` : "") + (hours > 0 || days > 0 ? `${hours}:` : "") + (minutes > 0 ? `${minutes}:` : "00:") + (seconds > 0 ? `${seconds}` : "00");
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Из формата 00:00:00:00, получаем секунды
     * @param duration {string} Пример 00:00:00:00
     * @constructor
     */
    export function ParsingTimeToNumber(duration: string): number {
        const Splitter = duration?.split(":");

        if (Splitter.length === 4) {
            const days = Number(Splitter[0]) * ((60 * 60) * 24);
            const hours = Number(Splitter[1]) * (60 * 60);
            const minutes = (Number(Splitter[2]) * 60)
            const seconds = Number(Splitter[3]);

            return days + hours + minutes + seconds;
        } else if (Splitter.length === 3) {
            const hours = Number(Splitter[0]) * (60 * 60);
            const minutes = (Number(Splitter[1]) * 60);
            const seconds = Number(Splitter[2]);

            return hours + minutes + seconds;
        } else if (Splitter.length === 2) {
            const minutes = (Number(Splitter[0]) * 60);
            const seconds = Number(Splitter[1]);

            return minutes + seconds;
        }

        return Number(duration);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Делаем из числа строку, так-же добавляем к числу 0 если это надо
 * @param duration {number} Желательно число
 * @requires {NumberString}
 */
function toStringTime(duration: number): string | number {
    return NumberString(parseInt(duration as any));
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем 0 к числу. Пример: 01:10
 * @param duration {string | number} Число
 * @constructor
 */
function NumberString(duration: string | number): string | number {
    return (duration < 10) ? ("0" + duration) : duration;
}