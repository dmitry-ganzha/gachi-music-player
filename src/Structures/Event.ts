import {WatKLOK} from "../Core/Client/Client";

export class Event<P1, P2> {
    //Название ивента (Discord.js)
    public readonly name: string = "undefined";

    //Загружать ли ивент
    public readonly enable: boolean = false;

    //Функция, которая будет запущена при вызове ивента
    public readonly run: (f: P1, f2: P2, client: WatKLOK) => void;
}