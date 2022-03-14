/**
 * @description Добавляем в 0 к числу. Пример: 01:10
 * @param duration {string | number} Число
 * @constructor
 */
export function StringTime(duration: string | number): string | number {
    return (duration < 10) ? ('0' + duration) : duration;
}