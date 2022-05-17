import {
    ActivityType,
    Client,
    GuildMember,
    IntentsBitField,
    Interaction,
    Message,
    MessageEditOptions,
    User,
    Options} from "discord.js";
import {FileSystemLoad} from "./FileSystem";
import {Channel, MessageChannel, sendType} from "./Utils/TypeHelper";
import {MessageChannelSend} from "./Utils/Functions/Send";
import {ConvertedText} from "./Utils/Functions/ConvertedText";
import {ConsoleLog} from "./Utils/Functions/ConsoleLog";
import {Connections} from "./Utils/Functions/Connections";
import {PlayerEmitter} from "./Player/execute";
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
            makeCache: Options.cacheWithLimits({
                BaseGuildEmojiManager: 0,       // guild.emojis
                GuildBanManager: 0,             // guild.bans
                GuildInviteManager: 0,          // guild.invites
                GuildStickerManager: 0,         // guild.stickers
                GuildScheduledEventManager: 0,  // guild.scheduledEvents
                PresenceManager: 0,             // guild.presences
                StageInstanceManager: 0,        // guild.stageInstances
                ThreadManager: 0,               // channel.threads
                ThreadMemberManager: 0,         // threadchannel.members

                UserManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id === value.client.user.id
                },
                GuildMemberManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id !== value.client.user.id,
                },
                VoiceStateManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id === value.client.user.id
                },
                MessageManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id === value.client.user.id
                },
                ReactionManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.client.user.id === value.client.user.id
                },
                ReactionUserManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id === value.client.user.id
                },
                GuildEmojiManager: {
                    maxSize: 100,
                    keepOverLimit: (value) => value.id === value.client.user.id
                }
            }),
            intents: (Object.keys(IntentsBitField.Flags)) as any,
            ws: {
                properties: {
                    $browser: "Web" as ClientDevice
                }
            },
            presence: {
                activities: [{
                    name: "music on youtube, spotify, vk, soundcloud",
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

export class ClientInteraction extends Interaction {
    member: GuildMember;
    customId: string;
    commandName: string;
    commandId: string;
    author: User;
    options?: {
        _hoistedOptions: any[]
    }

    delete: () => void;
    deferReply: () => Promise<void>
    deleteReply: () => Promise<void>
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
            } catch {/* Continue */}
        });
    }
});