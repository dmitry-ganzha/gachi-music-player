import {StringTime} from "./StringTime";

/**
 * @description Создаем готовый формат времени. Пример 00:00:00:00 (Days:Hours:Minutes:Seconds)
 * @param duration {number} Число
 * @constructor
 */
export function ParserTimeSong (duration: number): string {
    let days = toStringTime(duration / ((60 * 60) * 24) % 24);
    let hours = toStringTime(duration / (60 * 60) % 24);
    let minutes = toStringTime((duration / 60) % 60);
    let seconds = toStringTime(duration % 60);

    return (days > 0 ? `${days}:` : '') +  (hours > 0 || days > 0 ? `${hours}:` : '') + (minutes > 0 ? `${minutes}:` : '00:') + (seconds > 0 ? `${seconds}` : '00');
}
//====================== ====================== ====================== ======================

function toStringTime(duration: number): string | number {
    return StringTime(parseInt(String(duration)));
}
