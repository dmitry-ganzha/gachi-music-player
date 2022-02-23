import {Command} from "../Constructor";
import {User} from "discord.js";
import {EmbedConstructor, wMessage} from "../../Core/Utils/TypesHelper";
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
                    type: "USER"
                }
            ],

            slash: true,
            enable: true
        })
    };

    public run = async (message: wMessage, args: string[]): Promise<void | NodeJS.Timeout> => {
        const mentionedUser = await CommandAvatar.getUser(args, message);
        return CommandAvatar.SendMessage(message, mentionedUser).catch(async (err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    };

    protected static SendMessage = (message: wMessage, mentionedUser: User): Promise<NodeJS.Timeout> => message.channel.send({embeds: [this.CreateEmbedMessage(mentionedUser, message)]}).then(async (msg: wMessage | any) =>
        setTimeout(() => msg.deletable ? msg.delete().catch((): null => null) : null, 2e4)
    );
    protected static CreateEmbedMessage = (mentionedUser: User, message: wMessage): EmbedConstructor => {
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
    protected static getUser = async (args: string[], message: wMessage): Promise<User> => {
        let User;
        if (args.join(' ').match('!')) User = (args[0] ? await message.client.users.fetch(args.join().split('<@!')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        else if (!isNaN(Number(args[0]))) User = await (message.client.users.fetch(args[0]));
        else User = (args[0] ? await message.client.users.fetch(args.join().split('<@')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        return User ?? message.author;
    };
}