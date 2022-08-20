import {WatKLOK} from "../Core/Client/Client";

export class Event<P1, P2> {
    public readonly name: string = "undefined";
    public readonly enable: boolean = false;

    public readonly run: (f: P1, f2: P2, client: WatKLOK) => void;
}