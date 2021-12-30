import {Command} from "../Constructor";
import {Guild, MessageEmbed, User} from "discord.js";
import {W_Client, W_Message} from "../../Core/Utils/W_Message";

export default class CommandChristmas extends Command {
    constructor() {
        super({
            name: "cris",
            description: "Hide",

            enable: true,
            isOwner: true
        })
    };

    public run = async (message: W_Message): Promise<void> => {
        let guilds = message.client.guilds.cache;
        guilds.map((guild: Guild) => guild.systemChannel ? guild.systemChannel.send({
            embeds: [new ChristmasEmbed(guild, message.author, message.client, guilds.size)]
        }) : null);
    };
}

class ChristmasEmbed extends MessageEmbed {
    constructor(guild: Guild, author: User, client: W_Client, guildSize: number) {
        super({
            color: "RED",
            author: { name: `${guild.name} | ${client.users.cache.get(guild.ownerId).username}`, icon_url: guild.iconURL({format: "png"}) },
            description: `**${author}, поздравляет этот сервер с новым годом!**\nРабота над ботом продолжается, я рад что вы еще не выгнали меня!\n\nЗа 2021 год много что было доделано в боте.\nБыло исправлено множество критических ошибок\nЕсли вы это прочитали до конца, я нереально благодарен)`,
            timestamp: new Date(),
            thumbnail: { url: client.user.avatarURL({format: "png"}) },
            footer: { icon_url: author.avatarURL({format: "png"}), text: `${author.username} прислал сообщение | Это сообщение было отослано на ${guildSize} сервер(ов, а)` }
        });
    };
}