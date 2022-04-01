import {ActivityType, Client, Collection, IntentsBitField, Message, MessageEditOptions, TextChannel} from "discord.js";
import {FileSystemLoad} from "./FileSystem";
import {Channel, sendType} from "./Utils/TypeHelper";
import {Send} from "./Utils/Functions/Send";
import {ConvertedText} from "./Utils/Functions/ConvertedText";
import {ConsoleLog} from "./Utils/Functions/ConsoleLog";
import {Connections} from "./Utils/Functions/Connections";
import {PlayerEmitter} from "./Player/emit";
import {Command} from "../Commands/Constructor";
import {Queue} from "./Player/Queue/Structures/Queue";

export type ClientDevice = "Discord iOS" | "Web";

export class WatKLOK extends Client {
    public commands: Collection<string, Command> = new Collection();
    public aliases: Collection<any, any> = new Collection();
    public queue: Collection<string, Queue> = new Collection();
    public cfg = require('../../DataBase/Config.json');

    public Send = new Send().run;
    public ConvertedText = new ConvertedText().run;
    public console = new ConsoleLog().run;
    public connections = new Connections().run;
    public player = new PlayerEmitter();

    public constructor() {
        super({
            intents: (Object.keys(IntentsBitField.Flags)) as any,
            ws: {
                properties: {
                    $browser: "Web" as ClientDevice
                }
            },
            presence: {
                activities: [{
                    name: "music on youtube, spotify, vk",
                    type: ActivityType.Listening
                }]
            }
        });
    };
}

// @ts-ignore
export class ClientMessage extends Message {
    client: WatKLOK;
    // @ts-ignore
    edit(content: sendType | MessageEditOptions): Promise<ClientMessage>
    // @ts-ignore
    channel: {
        send(options: sendType): Promise<ClientMessage>
    } & Channel
}

const client = new WatKLOK();

client.login(client.cfg.Bot.token).then(async () => {
    await Promise.all([FileSystemLoad(client)]);

    process.on('uncaughtException', (err: Error): Message | any => {
        console.error(err);
        if (err.toString() === 'Error: connect ECONNREFUSED 127.0.0.1:443') return null;
        try {
            const channel = client.channels.cache.get(client.cfg.Channels.SendErrors) as TextChannel
            if (channel) return channel.send(`${err.toString()}`);
            return null;
        } catch {/* Continue */}
    });
});