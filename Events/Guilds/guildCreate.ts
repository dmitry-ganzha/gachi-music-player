import {MessageButton, MessageActionRow, Guild, MessageEmbed, Message, DiscordAPIError} from "discord.js";
import {W_Client, W_Message} from "../../Core/Utils/W_Message";
import cfg from "../../db/Config.json";

export default class guildCreate {
    public readonly name: string;
    public readonly enable: boolean;

    constructor() {
        this.name = 'guildCreate';
        this.enable = true;
    }
    public run = async (guild: Guild, f2, client: W_Client): Promise<any> => {
        const Buttons = {
            MyUrl: new MessageButton().setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands`).setEmoji('🔗').setStyle('LINK').setLabel('Invite'),
            ServerUrl: new MessageButton().setURL(cfg.Bot.DiscordServer).setEmoji('🛡').setStyle('LINK').setLabel('Help server'),
            Git: new MessageButton().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji("🗂").setStyle("LINK").setLabel("GitHub")
        };
        const RunButt = new MessageActionRow().addComponents(Buttons.MyUrl, Buttons.ServerUrl);

        return guild.systemChannel ? guild.systemChannel.send({ embeds: [new ConstructEmbed(guild)], components: [RunButt]}).then(async (msg: W_Message | Message) => setTimeout(async () => msg.delete().catch(async (err: DiscordAPIError) => console.log(`[Discord Message]: [guildCreate]: [Delete]: ${err}`)), 60e3)).catch(async (e: DiscordAPIError) => console.log(`[Discord event]: [guildCreate]: ${e}`)) : null;
    }
}

class ConstructEmbed extends MessageEmbed {
    constructor(guild: Guild) {
        super({
            color: "GREEN",
            author: {
                name: guild.name,
                icon_url: guild.iconURL({size: 512})
            },
            description: `**Спасибо что добавили меня 😉**\nМоя основная задача музыка, официальные платформы которые я поддерживаю (YouTube, Spotify, SoundCloud, Yandex Music)\nПоддержка других языков дорабатывается.\nЯ полностью бесплатный\nНасчет ошибок и багов писать в GitHub.\nДанное сообщение будет удалено через 1 мин.`,
            thumbnail: { url: guild.bannerURL({size: 4096})},
            timestamp: new Date()
        });
    }
}