//Добавляем в 0 к числу. Пример: 01:10
export function StringTime(duration: string | number): string | number {
    return (duration < 10) ? ('0' + duration) : duration;
}