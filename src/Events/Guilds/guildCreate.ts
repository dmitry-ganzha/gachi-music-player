import {
    Guild, Message,
} from "discord.js";
import {Colors} from "../../Core/Utils/Colors";
import {WatKLOK} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {getButtons} from "../../Core/Utils/Functions/Buttons";

export class guildCreate {
    public readonly name: string = 'guildCreate';
    public readonly enable: boolean = true;

    public run = (guild: Guild, f2: null, client: WatKLOK): void | Promise<Message> => {
        if (!guild.systemChannel) return;

        setImmediate(() => {
            try {
                // @ts-ignore
                return guild.systemChannel.send({ embeds: [ConstructEmbed(guild)], components: [getButtons(client.user.id)] })
            } catch (e) {
                console.log(e);
                return;
            }
        });
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