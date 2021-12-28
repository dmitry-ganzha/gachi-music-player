import {Command} from "../Constructor";
import {MessageEmbed, User} from "discord.js";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandAvatar extends Command {
    constructor() {
        super({
            name: 'avatar',
            aliases: ["av", "avt"],
            description: 'Аватар пользователя',

            enable: true
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<void | any> => {
        this.DeleteMessage(message, 5e3);
        let mentionedUser = await this.getUser(args, message);
        return this.SendMessage(message, mentionedUser).catch(async (err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    };

    private SendMessage = (message: W_Message, mentionedUser: User): any => message.channel.send({embeds: [this.CreateEmbedMessage(mentionedUser, message)]}).then(async (msg: W_Message | any) =>
        setTimeout(() => {msg.delete().catch(async () => null) }, 2e4)
    );
    private CreateEmbedMessage = (mentionedUser: User, message: W_Message): MessageEmbed => {
        return new MessageEmbed()
            .setImage(mentionedUser.displayAvatarURL({format: 'png', dynamic: true, size: 1024}))
            .setColor("RANDOM")
            .addField(`Пользователь`, `<@!${mentionedUser.id}>`)
            .setFooter(`${message.client.user.username}`, message.client.user.displayAvatarURL({format: 'png', dynamic: true, size: 1024}))
            .setTimestamp()
    };
    private getUser = async (args: string[], message: W_Message): Promise<User> => {
        let User;
        if (args.join(' ').match('!')) User = (args[0] ? await message.client.users.fetch(args.join().split('<@!')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        else if (!isNaN(Number(args[0]))) User = await (message.client.users.fetch(args[0]));
        else User = (args[0] ? await message.client.users.fetch(args.join().split('<@')[1].split('>')[0]) : await message.client.users.fetch(message.author.id));
        return User ?? message.author;
    };
}