import {StringTime} from "./StringTime";

//Создаем готовый формат времени. Пример 00:00:00:00 (Days:Hours:Minutes:Seconds)
export function ParserTimeSong (duration: number): string {
    let days = ParseToDate(duration / ((60 * 60) * 24) % 24);
    let hours = ParseToDate(duration / (60 * 60) % 24);
    let minutes = ParseToDate((duration / 60) % 60);
    let seconds = ParseToDate(duration % 60);

    return (days > 0 ? `${days}:` : '') +  (hours > 0 || days > 0 ? `${hours}:` : '') + (minutes > 0 ? `${minutes}:` : '00:') + (seconds > 0 ? `${seconds}` : '00');
}
function ParseToDate(duration: number): string | number {
    return StringTime(parseInt(String(duration)));
}