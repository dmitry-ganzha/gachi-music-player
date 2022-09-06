import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";

export class shardReconnecting extends Event<null, null> {
    public readonly name: string = "shardReconnecting";
    public readonly enable: boolean = true;

    public readonly run = (f1: null, f2: null, client: WatKLOK): void => void client.console("[WS]: Reconnecting...");
}