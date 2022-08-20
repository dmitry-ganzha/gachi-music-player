import {WatKLOK} from "../../Core/Client/Client";
import {Event} from "../../Structures/Event";

export class shardDisconnect extends Event<null, null> {
    public readonly name: string = "shardDisconnect";
    public readonly enable: boolean = true;

    public readonly run = (f1: null, f2: null, client: WatKLOK): void => void client.console("[WS]: Disconnecting...");
}