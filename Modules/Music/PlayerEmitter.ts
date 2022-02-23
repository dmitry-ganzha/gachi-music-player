import {wClient} from "../../Core/Utils/TypesHelper";
import {PlayerEmitter} from "./src/emit";

export class ClientPlayer {
    public readonly enable: boolean = true;

    public run = (client: wClient): PlayerEmitter => client.player = new PlayerEmitter()
}