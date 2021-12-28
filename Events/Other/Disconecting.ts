export default class shardDisconnect {
    public readonly name: string;
    public readonly enable: boolean;

    constructor() {
        this.name = 'shardDisconnect';
        this.enable = true;
    }
    public run = async (): Promise<void> => console.log(`[WS]: Disconnecting...`);
}