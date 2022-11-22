import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";

export class shardReconnecting extends Event<null, null> {
    public readonly name: string = "shardReconnecting";
    public readonly isEnable: boolean = true;

    public readonly run = (_: null, __: null, client: WatKLOK): void => void client.console("[WS]: Reconnecting...");
}