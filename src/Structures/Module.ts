import {WatKLOK} from "../Core/Client/Client";

export class Module {
    public readonly enable: boolean = true;

    public run: (client: WatKLOK) => any;
}