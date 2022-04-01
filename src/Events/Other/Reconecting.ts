export class shardReconnecting {
    public readonly name: string = 'shardReconnecting';
    public readonly enable: boolean = true;

    public run = (): void => console.log(`[${(new Date).toLocaleString("ru")}] [WS]: Reconnecting...`);
}