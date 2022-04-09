import { ActivityType, Client, IntentsBitField, Message, MessageEditOptions } from "discord.js";
import {FileSystemLoad} from "./FileSystem";
import {Channel, MessageChannel, sendType} from "./Utils/TypeHelper";
import {MessageChannelSend} from "./Utils/Functions/Send";
import {ConvertedText} from "./Utils/Functions/ConvertedText";
import {ConsoleLog} from "./Utils/Functions/ConsoleLog";
import {Connections} from "./Utils/Functions/Connections";
import {PlayerEmitter} from "./Player/emit";
import {Command} from "../Commands/Constructor";
import {Queue} from "./Player/Structures/Queue/Queue";
import {CollectionMap} from "./Utils/CollectionMap";

export type ClientDevice = "Discord iOS" | "Web";

export class WatKLOK extends Client {
    public commands = new CollectionMap<string, Command>();
    public aliases = new CollectionMap<string, string>();
    public queue = new CollectionMap<string, Queue>();
    public cfg = require('../../DataBase/Config.json');

    public Send = MessageChannelSend;
    public ConvertedText = ConvertedText;
    public console = ConsoleLog;
    public connections = Connections;
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

client.login(client.cfg.Bot.token).then(() => {
    Promise.all([FileSystemLoad(client)]).catch((e) => console.log(e));

    if (client.cfg.Bot.ignoreError) {
        process.on('uncaughtException', (err: Error): void | Promise<ClientMessage> => {
            console.error(err);
            if (err.toString() === 'Error: connect ECONNREFUSED 127.0.0.1:443') return null;

            try {
                const channel = client.channels.cache.get(client.cfg.Channels.SendErrors) as MessageChannel
                if (channel) return channel.send(`${err.toString()}`);
                return null;
            } catch {/* Continue */
            }
        });
    }
});