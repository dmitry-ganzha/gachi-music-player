import {Command} from "../Constructor";
import {ChannelType, TextChannel} from "discord.js";
import {ClientMessage} from "../../Core/Client";

export class CommandDeploy extends Command {
    public constructor() {
        super({
            name: 'linkguild',
            description: "Создание ссылки на любой сервер к которому я буду подключен!",
            aliases: ["lg"],

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        if (!args[0]) return message.client.Send({text: `${message.author}, Ты не указал ID сервера!`, message});

        const server = message.client.guilds.cache.filter((guild) => guild.id === args[0]).first();

        if (server) {
            // @ts-ignore
            const GuildChannel = server.channels.cache.filter((channel) => channel.type === ChannelType.GuildText).first();
            const channel: TextChannel = message.client.channels.cache.get(GuildChannel.id) as any;

            // @ts-ignore
            return message.client.channels.cache.get(channel.id).createInvite().then((invite) => message.client.Send({text: `${message.author}, ${invite.url}`, message}));
        }
        return message.client.Send({text: `${message.author}, Я не нашел сервер!`, message});
    };
}