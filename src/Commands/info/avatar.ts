import {Command} from "../Constructor";
import {ApplicationCommandOptionType, User} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/Colors";

export class CommandAvatar extends Command {
    public constructor() {
        super({
            name: 'avatar',
            aliases: ["av", "avt"],
            description: 'Аватар пользователя',

            options: [
                {
                    name: "user",
                    description: "Какой пользователь!",
                    type: ApplicationCommandOptionType.User
                }
            ],

            slash: true,
            enable: true
        })
    };

    public run = async (message: ClientMessage, args: string[]): Promise<void | NodeJS.Timeout> => {
        const mentionedUser = await this.getUser(args, message);
        return this.SendMessage(message, mentionedUser).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    };
    protected SendMessage = (message: ClientMessage, mentionedUser: User): Promise<NodeJS.Timeout> => message.channel.send({embeds: [this.CreateEmbedMessage(mentionedUser, message)]}).then((msg: ClientMessage) => Command.DeleteMessage(msg, 2e4));

    protected CreateEmbedMessage = (mentionedUser: User, message: ClientMessage): EmbedConstructor => {
        return {
            color: mentionedUser?.accentColor ?? Colors.YELLOW,
            image: {url: mentionedUser.displayAvatarURL({size: 4096})},
            fields: [{
                name: `Пользователь`,
                value: `<@!${mentionedUser.id}>`
            }],
            footer: {
                text: `${message.client.user.username}`, iconURL: message.client.user.displayAvatarURL()
            },
            timestamp: new Date()
        }
    };
    protected getUser = async (args: string[], message: ClientMessage): Promise<User> => {
        if (!args) return message.author;
        let User;
        if (args.join(' ').match('!')) User = (args[0] ? await message.client.users.fetch(args.join().split('<@!')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        else if (!isNaN(Number(args[0]))) User = await (message.client.users.fetch(args[0]));
        else User = (args[0] ? await message.client.users.fetch(args.join().split('<@')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        return User ?? message.author;
    };
}