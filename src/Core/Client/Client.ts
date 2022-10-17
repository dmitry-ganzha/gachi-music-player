import {ActivityType, Client, Colors, Guild, IntentsBitField, VoiceState} from "discord.js";
import {FileSystem, LoadFiles} from "../FileSystem";
import {PlayerEmitter} from "../../AudioPlayer/execute";
import {Command} from "../../Structures/Command";
import {Queue} from "../../AudioPlayer/Structures/Queue/Queue";
import {messageUtils} from "../Utils/LiteUtils";
import {Bot, Channels, Debug} from "../../../DataBase/Config.json";
import {ClientMessage, ColorResolvable, EmbedConstructor, MessageChannel} from "../../Handler/Events/Activity/Message";
import {Voice} from "../../AudioPlayer/Structures/Voice";

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
                    name: "музыку в youtube, spotify, soundcloud, vk",
                    type: ActivityType.Listening
                }]
            }
        });
        //Включаем режим отладки
        if (Debug) this.on("debug", null);
    };

    //Отправить не полное embed сообщение
    public readonly sendMessage = ({color, text, type, message}: SendOptions) => {
        const Embed: EmbedConstructor = {
            // @ts-ignore
            color: typeof color === "number" ? color : Colors[color] ?? Colors.Blue,
            description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text
        };

        const sendMessage = message.channel.send({embeds: [Embed]});
        sendMessage.then(messageUtils.deleteMessage);
        sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
    };
    //Обрезает текс до необходимых значений
    public readonly replaceText = (text: string, value: number | any, clearText: boolean = false) => {
        try {
            if (clearText) text = text.replace(/[\[,\]}{"`']/gi, "");
            if (text.length > value && value !== false) return `${text.substring(0, value)}...`;
            return text;
        } catch {
            return text;
        }
    };
    //Отправляет лог со временем
    public readonly console = (text: string) => {
        if (this.ShardID !== undefined) return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
        return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
    };
    //Все пользователи в голосовом канале
    public readonly connections = (Guild: Guild): VoiceState[] | 404 => {
        const connection = Voice.getVoice(Guild.id), Users: VoiceState[] = [];

        if (connection) Guild.voiceStates.cache.forEach((state: VoiceState): any => {
            if (!(state.channelId === connection.joinConfig.channelId && state.guild.id === connection.joinConfig.guildId)) return;
            Users.push(state);
        });

        return Users.length > 0 ? Users : 404;
    };

    //Включаем бота
    public login(token: string = FileSystem.env("TOKEN")): Promise<string> {
        LoadFiles(this);

        if (Bot.ignoreErrors) process.on("uncaughtException", (err: Error): void => {
            //undici используется в discord.js, и выдает ошибки такие как (Connect Timeout Error)
            if (err.message.match("undici")) return;
            //Если выходит ошибка ETIMEDOUT
            else if (err.message.match("connect ETIMEDOUT")) return console.log(`[Timeout connection]: ${err.message.split("ETIMEDOUT")[1]}`);
            //Если нет библиотеки sodium
            else if (err.message.match(/sodium/)) return console.log("[Discord Voice]: необходимо установить sodium.\nSodium libs: sodium-native, sodium, tweetnacl, libsodium-wrappers.")

            console.log(`[IgnoreError]:`, err);
            try {
                const channel = this.channels.cache.get(Channels.sendErrors) as MessageChannel;
                if (channel) channel.send(`${err.toString()}`).catch(console.log);
                return null;
            } catch {/* Continue */
            }
        });

        return super.login(token);
    };
}

new WatKLOK().login();