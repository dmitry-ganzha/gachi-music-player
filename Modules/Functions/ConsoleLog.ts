import {wClient} from "../../Core/Utils/TypesHelper";

export class ConsoleLog {
    public readonly enable: boolean = true;

    public run = (client: wClient): (set: string) => void => client.console = (set: string): NodeJS.Timeout => setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${set}`), 25);
}