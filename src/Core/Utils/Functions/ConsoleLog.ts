
export function ConsoleLog(text: string) {
    return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
}