import {
    ActivityType,
    ChannelManager,
    Client,
    Collection,
    DiscordAPIError,
    GatewayIntentBits,
    Message, TextChannel
} from "discord.js";
import {Command} from "../../Commands/Constructor";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import cfg from "../../db/Config.json";
import {Spotify} from "../SPNK";
import {Load} from "./FileSystem";
import {ClientDevice} from "../Utils/TypesHelper";

class WatKLOK_BOT extends Client {
    public commands: Collection<Command, Command> = new Collection();
    public aliases: Collection<string[], string[]> = new Collection();
    public queue: Collection<Queue, Queue> = new Collection();
    public cfg: any = require('../../db/Config.json');

    public constructor() {
        super({
            intents: (Object.keys(GatewayIntentBits)) as any,
            ws: {
                properties: {
                    $browser: "Web" as ClientDevice
                }
            }
        });
    };
    /**
     * @description Настраиваем бота и запускаем
     */
    public Login = (): Promise<void> => {
        WatKLOK_BOT.SettingsProject(this);

        return this.login(cfg.Bot.token).then(() => {
            this.user.setPresence({
                activities: [{
                    name: "music on youtube, spotify, vk",
                    type: ActivityType.Listening
                }]
            });
            return Load(this as any);
        });
    };
    /**
     * @description Настройки бота (крутилочки)
     */
    protected static SettingsProject = (client: Client): void => {
        if (cfg.Bot.ignoreError) this.ProcessEvents(client.channels).catch(async (err: Error) => console.log(err));

        new Spotify().Settings(cfg.spotify.clientID, cfg.spotify.clientSecret);
    };
    /**
     * @description Настройки текущего процесса
     */
    protected static ProcessEvents = async (channels: ChannelManager): Promise<void> => {
        process.on('uncaughtException', async (err: Error): Promise<Message | any> => {
            console.error(err);
            if (err.toString() === 'Error: connect ECONNREFUSED 127.0.0.1:443') return null;
            try {
                const channel = channels.cache.get(cfg.Channels.SendErrors) as TextChannel
                if (channel) return channel.send(`${err.toString()}`);
                return null;
            } catch {/* Continue */}
        });
    };
}
new WatKLOK_BOT().Login().catch((e: Error | DiscordAPIError) => console.log("[Error]:", e));