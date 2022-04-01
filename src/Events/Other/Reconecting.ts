export class shardReconnecting {
    public readonly name: string = 'shardReconnecting';
    public readonly enable: boolean = true;

    public run = async (): Promise<void> => console.log(`[${(new Date).toLocaleString("ru")}] [WS]: Reconnecting...`);
}