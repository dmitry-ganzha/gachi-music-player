import {StringTime} from "./StringTime";

/**
 * @description Создаем готовый формат времени. Пример 00:00:00:00 (Days:Hours:Minutes:Seconds)
 * @param duration {number} Число
 * @constructor
 */
export function ParserTimeSong (duration: number ): string {
    let days = toStringTime(duration / ((60 * 60) * 24) % 24);
    let hours = toStringTime(duration / (60 * 60) % 24);
    let minutes = toStringTime((duration / 60) % 60);
    let seconds = toStringTime(duration % 60);

    return (days > 0 ? `${days}:` : '') + (hours > 0 || days > 0 ? `${hours}:` : '') + (minutes > 0 ? `${minutes}:` : '00:') + (seconds > 0 ? `${seconds}` : '00');
}
export function ParserTime(duration: string): number {
    const Splitter = duration?.split(":");

    if (Splitter.length === 4) {
        const days = Number(Splitter[0]) * ((60 * 60) * 24) % 24;
        const hours = Number(Splitter[1]) * (60 * 60) % 24;
        const minutes = (Number(Splitter[2]) * 60) % 60;
        const seconds = Number(Splitter[3]) % 60;

        return days + hours + minutes + seconds;
    } else if (Splitter.length === 3) {
        const hours = Number(Splitter[0]) * (60 * 60) % 24;
        const minutes = (Number(Splitter[1]) * 60) % 60;
        const seconds = Number(Splitter[2]) % 60;

        return hours + minutes + seconds;
    } else if (Splitter.length === 2) {
        const minutes = (Number(Splitter[0]) * 60) % 60;
        const seconds = Number(Splitter[1]) % 60;

        return minutes + seconds;
    }

    return Number(duration) % 60;
}
//====================== ====================== ====================== ======================

function toStringTime(duration: number): string | number {
    return StringTime(parseInt(String(duration)));
}