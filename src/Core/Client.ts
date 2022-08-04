import {
    ActivityType,
    Client,
    GuildMember,
    IntentsBitField,
    BaseInteraction,
    Message,
    MessageEditOptions,
    User,
    Options,
} from "discord.js";
import {FileSystemLoad} from "./FileSystem";
import {Channel, MessageChannel, sendType} from "./Utils/TypeHelper";
import {PlayerEmitter} from "./Player/execute";
import {Command} from "../Commands/Constructor";
import {Queue} from "./Player/Structures/Queue/Queue";
import {LiteUtils, MessageSend} from "./Utils/LiteUtils";
import {Bot, Channels} from "../../DataBase/Config.json";
import {httpsClient} from "./httpsClient";
import * as fs from "fs";

const keepOverLimit = (value: any): boolean => value.id !== value.client.user.id;

export class WatKLOK extends Client {
    public readonly commands = new LiteUtils.CollectionMap<string, Command>(); //База, со всеми командами
    public readonly aliases = new LiteUtils.CollectionMap<string, string>(); //База, с сокращениями названий команд
    public readonly queue = new LiteUtils.CollectionMap<string, Queue>(); //База, в ней содержатся данные о серверах на которых играет музыка

    public readonly Send = MessageSend.Send; //Отправить не полное embed сообщение
    public readonly replaceText = LiteUtils.replaceText; //Обрезка текста
    public readonly console: (text: string) => NodeJS.Timeout; //Самый обычный console.log
    public readonly connections = LiteUtils.Connections; //Все пользователи в голосовом канале
    public readonly player = new PlayerEmitter(); //Плеер

    public readonly ShardID: number | null = this.shard?.ids[0]; //Если запущен ShardManager, будет отображаться номер дубликата

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

                UserManager: { keepOverLimit },
                GuildMemberManager: { keepOverLimit },
                VoiceStateManager: { keepOverLimit },
                MessageManager: { keepOverLimit },
                ReactionManager: { keepOverLimit },
                ReactionUserManager: { keepOverLimit },
                GuildEmojiManager: { keepOverLimit }
            }),
            intents: (Object.keys(IntentsBitField.Flags)) as any,
            ws: {
                properties: {
                    browser: "Web" as "Discord iOS" | "Web"
                }
            },
            presence: {
                activities: [{
                    name: "music on youtube, spotify, soundcloud, vk",
                    type: ActivityType.Listening
                }]
            }
        });
        this.console = (text: string) => {
            if (this.ShardID !== undefined) return LiteUtils.ConsoleLog(`[ShardID: ${this.ShardID}] -> ` + text);
            return LiteUtils.ConsoleLog(text);
        };
    };
}

// @ts-ignore
export interface ClientMessage extends Message {
    client: WatKLOK;
    // @ts-ignore
    edit(content: sendType | MessageEditOptions): Promise<ClientMessage>
    // @ts-ignore
    channel: {
        send(options: sendType): Promise<ClientMessage>
    } & Channel
}

// @ts-ignore
export interface ClientInteraction extends BaseInteraction {
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

client.login(Bot.token).then(() => {
    Promise.all([FileSystemLoad(client)]).catch(console.error);

    if (Bot.ignoreError) process.on("uncaughtException", (err: Error): void | Promise<ClientMessage> => {
        console.log(`[IgnoreError]:`, err);
        try {
            const channel = client.channels.cache.get(Channels.SendErrors) as MessageChannel
            if (channel) return channel.send(`${err.toString()}`);
            return null;
        } catch {/* Continue */}
    });
});