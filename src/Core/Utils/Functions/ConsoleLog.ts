export class ConsoleLog {
    public run = (set: string): NodeJS.Timeout => setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${set}`), 25);
}