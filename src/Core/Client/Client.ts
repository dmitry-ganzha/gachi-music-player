import {ActivityType, Client, IntentsBitField, VoiceState, Guild, Colors} from "discord.js";
import {FileSystem} from "../FileSystem";
import {PlayerEmitter} from "../../AudioPlayer/execute";
import {Command} from "../../Structures/Command";
import {Queue} from "../../AudioPlayer/Structures/Queue/Queue";
import {GlobalUtils} from "../Utils/LiteUtils";
import {Bot, Channels, Debug} from "../../../DataBase/Config.json";
import {ClientMessage, ColorResolvable, EmbedConstructor, MessageChannel} from "../../Handler/Events/Activity/Message";
import {getVoiceConnection} from "@discordjs/voice";

type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: "css" | "js" | "ts" | "cpp" | "html" | "cs";
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
    public readonly ShardID: number | null = this.shard?.ids[0]; //Если запущен ShardManager, будет отображаться номер дубликата

    public constructor() {
        super({
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
    };
    //Отправить не полное embed сообщение
    public readonly sendMessage = ({color, text, type, message}: SendOptions) => {
        const Embed: EmbedConstructor = {
            // @ts-ignore
            color: typeof color === "number" ? color : Colors[color] ?? Colors.Blue,
            description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text
        };

        const sendMessage = message.channel.send({ embeds: [Embed] });
        sendMessage.then(GlobalUtils.DeleteMessage);
        sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
    };
    //Обрезает текс до необходимых значений
    public readonly replaceText = (text: string, value: number | any, clearText: boolean = false) => {
        try {
            if (clearText) text = text.replace(/[\[,\]}{"`']/gi, "");
            if (text.length > value && value !== false) return `${text.substring(0, value)}...`;
            return text;
        } catch { return text; }
    };
    //Отправляет лог со временем
    public readonly console = (text: string) => {
        if (this.ShardID !== undefined) return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
        return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
    };
    //Все пользователи в голосовом канале
    public readonly connections = (Guild: Guild): VoiceState[] | 404 => {
        const Voice = getVoiceConnection(Guild.id), Users: VoiceState[] = [];

        if (Voice) Guild.voiceStates.cache.forEach((state: VoiceState): any => {
            if (!(state.channelId === Voice.joinConfig.channelId && state.guild.id === Voice.joinConfig.guildId)) return;
            Users.push(state);
        });

        return Users.length > 0 ? Users : 404;
    };
}

const client = new WatKLOK();

client.login(Bot.token).then(() => {
    FileSystem.Load(client); //Включаем загрузчик файлов

    if (Bot.ignoreErrors) process.on("uncaughtException", (err: Error): void | Promise<ClientMessage> => {
        if (err.message.match("undici")) return; //undici используется в discord.js, и выдает ошибки такие как (Connect Timeout Error)

        console.log(`[IgnoreError]:`, err);
        try {
            const channel = client.channels.cache.get(Channels.sendErrors) as MessageChannel;
            if (channel) return channel.send(`${err.toString()}`);
            return null;
        } catch {/* Continue */}
    });

    if (Debug) client.on("debug", null);
});