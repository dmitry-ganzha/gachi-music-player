import {ChannelType} from "discord.js";
import {Bot} from '../../../DataBase/Config.json';
import {ClientMessage} from "../../Core/Client";
import {DurationUtils} from "../../Core/Player/Manager/DurationUtils";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;
import {CoolDownBase, UtilsPermissions} from "../../Core/Utils/LiteUtils";

export class GuildMessage {
    public readonly name: string = "messageCreate";
    public readonly enable: boolean = true;

    public readonly run = (message: ClientMessage) => {
        const prefix = Bot.prefix;
        if (message.author.bot || !message.content.startsWith(prefix) || message.channel.type === ChannelType.DM) return;

        const args = message.content.split(" ").slice(1);
        const command = this.#getCommand(message, prefix);
        const CoolDownFind = CoolDownBase.get(message.author.id);

        if (UtilsPermissions.isOwner(true, message.author.id)) {
            if (CoolDownFind) return message.client.Send({
                text: `${message.author.username}, Воу воу, ты слишком быстро отправляешь сообщения. Подожди ${ParsingTimeToString(CoolDownFind.time)}`,
                message,
                type: "css"
            });

            CoolDownBase.set(message.author.id, {time: command?.CoolDown ?? 5});
            setTimeout(() => CoolDownBase.delete(message.author.id), (command?.CoolDown ?? 5) * 1e3 ?? 5e3);
        }

        if (command) {
            setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, 12e3);

            if (UtilsPermissions.isOwner(command?.isOwner, message.author.id)) return message.client.Send({ text: `${message.author}, Эта команда не для тебя!`, message, color: "RED"})
            if (UtilsPermissions.isPermissions(command?.permissions, message)) return;

            return command.run(message, args);
        }
        return message.client.Send({ text: `${message.author}, Я не нахожу такой команды, используй ${prefix}help  :confused:`, message, color: "RED"});
    };
    // Получаем данные о команде
    readonly #getCommand = ({content, client}: ClientMessage, prefix: string) => {
        let cmd = content.slice(prefix.length).trim().split(/ +/g).shift().toLowerCase();
        return client.commands.get(cmd) ?? client.commands.get(client.aliases.get(cmd));
    };
}