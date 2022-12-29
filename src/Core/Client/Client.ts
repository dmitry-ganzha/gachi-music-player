import {ActivityType, Client, IntentsBitField, Options} from "discord.js";
import {DurationUtils} from "@AudioPlayer/Managers/DurationUtils";
import {ClientMessage} from "@Client/interactionCreate";
import {Command} from "@Structures/Handle/Command";
import {Bot, Channels} from "@db/Config.json";
import {Player} from "@AudioPlayer/index";
import {LoadFiles} from "@FileSystem";
import {Queue} from "@Queue/Queue";
import {env} from "@env";

export function consoleTime(data: string) {
    const date = new Date();
    const reformatDate = [date.getHours(), date.getMinutes(), date.getSeconds()].map(DurationUtils.toFixed0);

    return console.log(`[${reformatDate.join(":")}.${date.getMilliseconds()}] ${data}`);
}

class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        const db: V[] = [];
        for (const [, value] of this.entries()) db.push(value);

        return db;
    };
}

export class WatKLOK extends Client {
    private _queue = new CollectionMap<string, Queue>();
    private _commands = new CollectionMap<string, Command>(); //База, со всеми командами
    private _player = Player; //Плеер
    private _ShardID = this.shard?.ids[0] ?? undefined; //Если запущен ShardManager, будет отображаться номер дубликата

    public get commands() { return this._commands; };
    public get queue() { return this._queue; };
    public get player() { return this._player; };
    public get ShardID() { return this._ShardID; };

    public constructor() {
        super({
            sweepers: { ...Options.DefaultSweeperSettings,
                messages: {
                    interval: 3600, // Every hour...
                    lifetime: 1800,	// Remove messages older than 30 minutes.
                }
            },
            intents: [
                //Message (Бот может писать в текстовые каналы)
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.DirectMessages,

                //Reaction (Бот может ставить emoji)
                IntentsBitField.Flags.GuildMessageReactions,
                IntentsBitField.Flags.DirectMessageReactions,

                //Emoji and stickers (Бот может получать данные о emoji или стакерах)
                IntentsBitField.Flags.GuildEmojisAndStickers,

                //Slash Commands (Пользователям доступны slash команды)
                IntentsBitField.Flags.GuildIntegrations,

                //Default Commands (Бот может читать сообщение пользователей)
                IntentsBitField.Flags.MessageContent,

                //Voice (Бот может получить данные кто находится в голосовом канале)
                IntentsBitField.Flags.GuildVoiceStates,

                //Guild (Бот может получить данные о серверах)
                IntentsBitField.Flags.Guilds,
                //IntentsBitField.Flags.GuildMembers,

            ],
            ws: { properties: { browser: "Web" as "Discord iOS" | "Web" } },
            presence: {
                activities: [{
                    name: "музыку в youtube, spotify, soundcloud, vk",
                    type: ActivityType.Listening
                }]
            }
        });
    };
    //Включаем бота
    public login(token: string = env.get("TOKEN")): Promise<string> {
        LoadFiles(this);

        return super.login(token);
    };
}
const client = new WatKLOK();

client.login().then(() => {
    if (Bot.ignoreErrors) process.on("uncaughtException", (err) => {
        if (err.message.match(/setting 'readableListening'/)) return;

        consoleTime(`[IgnoreError]: ${err.name} | ${err.message}\n${err.stack}`);

        try {
            const channel = client.channels.cache.get(Channels.sendErrors) as ClientMessage["channel"];

            if (channel) channel.send({content: `\`\`\`ts\nError: ${err.message}\nType: ${err.name}\n\nFull Error: ${err.stack}\n\`\`\``}).catch(() => null);
        } catch {/* Continue */}
    });
})