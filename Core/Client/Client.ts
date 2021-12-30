import {Collection, Client, Intents, ClientPresence, TextChannel, Message} from "discord.js";
import {YouTubeDL} from "../../youtube-dl/youtube-dl";
import {Command} from "../../Commands/Constructor";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import cfg from "../../db/Config.json";
import {YouTube, setFFmpeg, Spotify} from "../SPNK";
import {Load} from "./FileSystem";
import {ClientDevice} from "../Utils/W_Message";

class WatKLOK_BOT extends Client {
    public commands: Collection<Command, Command>;
    public aliases: Collection<string[], string[]>;
    private queue: Collection<Queue, Queue>;
    private cfg: any;

    constructor() {
        super({
            intents: (Object.keys(Intents.FLAGS)) as any,
            ws: {
                properties: {
                    $browser: "Web" as ClientDevice
                }
            }
        })
        this.commands = new Collection();
        this.aliases = new Collection();
        this.queue = new Collection();
        this.cfg = cfg;
    };
    /**
     * @description Настраиваем бота и запускаем
     */
    public Login = (): Promise<void> => {
        this.SettingsProject();

        return this.login(cfg.Bot.token).then(() => {
            if (!this.shard) this.ClientStatus();
            return Load(this)
        });
    };
    /**
     * @description Настройки бота (крутилочки)
     */
    private SettingsProject = (): void => {
        if (cfg.Bot.ignoreError) this.ProcessEvents().catch(async (err: Error) => console.log(err));
        new YouTube().setCookie(cfg.youtube.cookie);
        new Spotify().Settings(cfg.spotify.clientID, cfg.spotify.clientSecret);
        setFFmpeg(cfg.Player.Other.FFMPEG);
        if (cfg.Player.Other.YouTubeDL) new YouTubeDL().download();
    };
    /**
     * @description Статус бота (во что бот играет)
     */
    private ClientStatus = (): ClientPresence => this.user.setPresence({
        activities: [
            {name: `twitch.tv`, type: "STREAMING", url: "https://www.twitch.tv/faeervoo"}
        ],
        status: 'online',
        shardId: 0
    });
    /**
     * @description Настройки текущего процесса
     */
    private ProcessEvents = async (): Promise<void> => {
        process.on('uncaughtException', async (err: Error): Promise<Message> => {
            console.error(err);
            if (err.toString() === 'Error: connect ECONNREFUSED 127.0.0.1:443') return null;
            try {
                return (this.channels.cache.get(cfg.Channels.SendErrors) as TextChannel).send(`${err.toString()}`);
            } catch (e) {
                return null;
            }
        });
    };
}
new WatKLOK_BOT().Login().catch(e => console.log("[Error]:", e));