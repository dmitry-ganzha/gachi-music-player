
export function ConsoleLog(set: string) {
    return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${set}`), 25)
}