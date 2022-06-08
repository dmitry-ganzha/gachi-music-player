import {WatKLOK} from "../../Core/Client";

export class shardDisconnect {
    public readonly name: string = "shardDisconnect";
    public readonly enable: boolean = true;

    public run = (f1: null, f2: null, client: WatKLOK): void => void client.console("[WS]: Disconnecting...");
}