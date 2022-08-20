import {ActivityType, Client, IntentsBitField, VoiceState, Guild} from "discord.js";
import {FileSystemLoad} from "../FileSystem";
import {ColorResolvable, EmbedConstructor, MessageChannel} from "../Utils/TypeHelper";
import {PlayerEmitter} from "../AudioPlayer/execute";
import {Command} from "../../Structures/Command";
import {Queue} from "../AudioPlayer/Structures/Queue/Queue";
import {CollectionMap, Colors} from "../Utils/LiteUtils";
import {Bot, Channels, Debug} from "../../../DataBase/Config.json";
import {ClientMessage} from "../../Events/Activity/Message";
import {getVoiceConnection} from "@discordjs/voice";

type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: "css" | "js" | "ts" | "cpp" | "html" | "cs";
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
            color: typeof color === "number" ? color : Colors[color] ?? Colors.BLUE,
            description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text
        };

        const sendMessage = message.channel.send({ embeds: [Embed] });
        sendMessage.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete().catch(() => null) : null, 12e3));
        sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
    }
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
    public readonly connections = (Guild: Guild) => {
        const Users: VoiceState[] = [], set = getVoiceConnection(Guild.id);
        if (set) {
            Guild.voiceStates.cache.forEach((fn: VoiceState): any => {
                if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId)) return;
                Users.push(fn);
            });
        }

        return Users;
    };
}

const client = new WatKLOK();

client.login(Bot.token).then(() => {
    FileSystemLoad(client); //Включаем загрузчик файлов

    if (Bot.ignoreErrors) process.on("uncaughtException", (err: Error): void | Promise<ClientMessage> => {
        console.log(`[IgnoreError]:`, err);
        try {
            const channel = client.channels.cache.get(Channels.sendErrors) as MessageChannel;
            if (channel) return channel.send(`${err.toString()}`);
            return null;
        } catch {/* Continue */}
    });

    if (Debug) client.on("debug", null);
});