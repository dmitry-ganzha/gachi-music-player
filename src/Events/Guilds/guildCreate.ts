import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    DiscordAPIError,
    Guild,
} from "discord.js";
import cfg from "../../../DataBase/Config.json";
import {Colors} from "../../Core/Utils/Colors";
import {ClientMessage, WatKLOK} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";

export class guildCreate {
    public readonly name: string = 'guildCreate';
    public readonly enable: boolean = true;

    public run = (guild: Guild, f2: null, client: WatKLOK): Promise<void | number> => {
        const Buttons = {
            MyUrl: new ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot+applications.commands`).setEmoji({name: '🔗'}).setLabel('Invite').setStyle(ButtonStyle.Link),
            ServerUrl: new ButtonBuilder().setURL(cfg.Bot.DiscordServer).setEmoji({name: '🛡'}).setLabel('Help server').setStyle(ButtonStyle.Link),
            Git: new ButtonBuilder().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji({name: "🗂"}).setLabel("GitHub").setStyle(ButtonStyle.Link)
        };
        const RunButt = new ActionRowBuilder().addComponents(Buttons.MyUrl, Buttons.ServerUrl);

        // @ts-ignore
        return guild.systemChannel ? guild.systemChannel.send({ embeds: [ConstructEmbed(guild)], components: [RunButt]}).then((msg: ClientMessage) => setTimeout(async () => msg.delete().catch(async (err: DiscordAPIError) => console.log(`[Discord Message]: [guildCreate]: [Delete]: ${err}`)), 60e3)).catch(async (e: DiscordAPIError) => console.log(`[Discord event]: [guildCreate]: ${e}`)) : null;
    };
}

function ConstructEmbed(guild: Guild): EmbedConstructor {
    return {
        color: Colors.GREEN,
        author: {
            name: guild.name,
            iconURL: guild.iconURL({size: 512})
        },
        description: `**Спасибо что добавили меня 😉**\nМоя основная задача музыка, официальные платформы которые я поддерживаю (YouTube, Spotify, VK)\nЯ полностью бесплатный.\nНасчет ошибок и багов писать в лс SNIPPIK#4178.\nДанное сообщение будет удалено через 1 мин.\nРестарт каждые 24 часа.`,
        thumbnail: { url: guild.bannerURL({size: 4096})},
        timestamp: new Date()
    }
}