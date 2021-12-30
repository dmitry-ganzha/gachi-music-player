import {W_Client} from "../../Core/Utils/W_Message";

export default class ConsoleLog {
    public readonly enable: boolean;
    constructor() {
        this.enable = true;
    };
    public run = (client: W_Client): (set: string) => void => client.console = (set: string): void => console.log(`[${(new Date).toLocaleString("ru")}] ${set}`);
}