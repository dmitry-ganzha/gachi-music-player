import {WatKLOK} from "../Core/Client/Client";

export class Module {
    //Включать модуль
    public readonly enable: boolean = true;

    //Функция, которая будет запущена
    public run: (client: WatKLOK) => any;
}