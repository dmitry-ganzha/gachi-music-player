import {ActivityType, Client, IntentsBitField} from "discord.js";
import {LoadFiles} from "../FileSystem";
import {PlayerEmitter} from "../../AudioPlayer";
import {Command} from "../../Structures/Handle/Command";
import {Queue} from "../../AudioPlayer/Structures/Queue/Queue";
import {Bot, Debug, Channels} from "../../../db/Config.json";
import {env} from "../env";
import {DurationUtils} from "../../AudioPlayer/Managers/DurationUtils";
import {ClientMessage} from "../../Handler/Events/Activity/interactionCreate";

export function consoleTime(data: string) {
    const date = new Date();
    const reformatDate = [date.getHours(), date.getMinutes(), date.getSeconds()].map(DurationUtils.toFixed0);

    return console.log(`[${reformatDate.join(":")}.${date.getMilliseconds()}] ${data}`);
}

class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        const db: V[] = [];
        for (let [, value] of this.entries()) db.push(value);

        return db;
    };
}

export class WatKLOK extends Client {
    public readonly commands = new CollectionMap<string, Command>(); //База, со всеми командами
    public readonly queue = new CollectionMap<string, Queue>(); //База, в ней содержатся данные о серверах на которых играет музыка
    public readonly player = new PlayerEmitter(); //Плеер
    public readonly ShardID: number | undefined = this.shard?.ids[0] ?? undefined; //Если запущен ShardManager, будет отображаться номер дубликата

    public constructor() {
        super({
            intents: [
                //Message (Бот может писать в текстовые каналы)
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.DirectMessages,

                //Reaction (Бот может ставить emoji)
                IntentsBitField.Flags.GuildMessageReactions,
                IntentsBitField.Flags.DirectMessageReactions,

                //Emoji and stickers (Бот может получать данные о emoji или стакерах)
                //IntentsBitField.Flags.GuildEmojisAndStickers,

                //Typing (Бот может делать вид что пишет в текстовый канал)
                //IntentsBitField.Flags.GuildMessageTyping,
                //IntentsBitField.Flags.DirectMessageTyping,

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
        //Включаем режим отладки
        if (Debug) this.on("debug", null);
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
        consoleTime(`[IgnoreError]: ${err.name} | ${err.message}\n${err.stack}`);

        try {
            const channel = client.channels.cache.get(Channels.sendErrors) as ClientMessage["channel"];

            if (channel) channel.send({content: `\`\`\`ts\nError: ${err.message}\nType: ${err.name}\n\nFull Error: ${err.stack}\n\`\`\``}).catch(console.log);
        } catch {/* Continue */}
    });
})