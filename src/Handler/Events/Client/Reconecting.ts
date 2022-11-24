import {consoleTime} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Handle/Event";

export class shardReconnecting extends Event<null, null> {
    public readonly name: string = "shardReconnecting";
    public readonly isEnable: boolean = true;

    public readonly run = (_: null, __: null): void => void consoleTime("[WS]: Reconnecting...");
}