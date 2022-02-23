export class shardDisconnect {
    public readonly name: string = 'shardDisconnect';
    public readonly enable: boolean = true;

    public run = async (): Promise<void> => console.log(`[${(new Date).toLocaleString("ru")}] [WS]: Disconnecting...`);
}