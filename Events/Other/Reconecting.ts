export default class shardReconnecting {
    public readonly name: string;
    public readonly enable: boolean;

    constructor() {
        this.name = 'shardReconnecting';
        this.enable = true;
    }
    public run = async (): Promise<void> => console.log(`[WS]: Reconnecting...`);
}