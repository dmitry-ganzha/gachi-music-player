import {ActivityType, Client, Colors, Guild, IntentsBitField, VoiceState} from "discord.js";
import {FileSystem, LoadFiles} from "../FileSystem";
import {PlayerEmitter} from "../../AudioPlayer";
import {Command} from "../../Structures/Command";
import {Queue} from "../../AudioPlayer/Structures/Queue/Queue";
import {messageUtils} from "../Utils/LiteUtils";
import {Bot, Channels, Debug} from "../../../db/Config.json";
import {ClientInteraction, ClientMessage, EmbedConstructor} from "../../Handler/Events/Activity/interactiveCreate";
import {Voice} from "../../AudioPlayer/Structures/Voice/Voice";

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
            intents: (Object.keys(IntentsBitField.Flags)) as any,
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
    //Отправить не полное embed сообщение
    public readonly sendMessage = ({color, text, type, message}: SendOptions) => {
        let Embed: EmbedConstructor;

        if (typeof text === "string") Embed = { color: typeof color === "number" ? color : Colors[color] ?? Colors.Blue, description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text };
        else Embed = text;

        //Отправляем сообщение с упоминанием
        if ("isChatInputCommand" in message) {
            message.reply({embeds: [Embed as any]}).catch((): null => null);
            setTimeout(() => message.deleteReply().catch((): null => null), 15e3);
        } else { //Отправляем обычное сообщение
            const sendMessage = message.channel.send({embeds: [Embed as any]}) as Promise<ClientMessage>;
            sendMessage.then(messageUtils.deleteMessage);
            sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
        }
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
    public readonly connections = (Guild: Guild): VoiceState[] | "Fail" => {
        const connection = Voice.getVoice(Guild.id), Users: VoiceState[] = [];

        if (connection) Guild.voiceStates.cache.forEach((state: VoiceState): any => {
            if (!(state.channelId === connection.joinConfig.channelId && state.guild.id === connection.joinConfig.guildId)) return;
            Users.push(state);
        });

        return Users.length > 0 ? Users : "Fail";
    };
    //Включаем бота
    public login(token: string = FileSystem.env("TOKEN")): Promise<string> {
        LoadFiles(this);

        if (Bot.ignoreErrors) process.on("uncaughtException", (err: Error): void => {
            //undici используется в discord.js, и выдает ошибки такие как (Connect Timeout Error)
            if (err.message.match("undici")) return;
            //Если выходит ошибка ETIMEDOUT
            else if (err.message.match("connect ETIMEDOUT")) return console.log(`[Timeout connection]: ${err.message.split("ETIMEDOUT")[1]}`);
            //Если нет libsodium
            else if (err.message.match(/sodium/)) return console.log("[Discord Voice]: необходимо установить sodium.\nSodium libs: sodium-native, sodium, tweetnacl, libsodium-wrappers.")

            console.log(`[IgnoreError]:`, err);
            try {
                const channel = this.channels.cache.get(Channels.sendErrors) as ClientMessage["channel"];

                if (channel) channel.send({content: `\`\`\`css\n${err}\n\`\`\``}).catch(console.log);
                return null;
            } catch {/* Continue */}
        });

        return super.login(token);
    };
}
new WatKLOK().login().catch(err => console.log("[Failed login]:", err));

type SendOptions = {
    text: string | EmbedConstructor;
    color?: "DarkRed" | "Blue" | "Green" | "Default" | "Yellow" | "Grey" | "Navy" | "Gold" | "Orange" | "Purple" | number;
    message: ClientMessage | ClientInteraction;
    type?: "css" | "js" | "ts" | "cpp" | "html" | "cs" | "json";
}