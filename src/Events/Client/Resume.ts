import {WatKLOK} from "../../Core/Client";

export default class shardResume {
    public readonly name: string = "shardResume";
    public readonly enable: boolean = true;

    public readonly run = (f1: null, f2: null, client: WatKLOK): void => void client.console("[Shard]: Resume...");
}