import {Command, ResolveData} from "../../../Structures/Handle/Command";
import os from 'node:os';
import pak from "../../../../package.json";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactionCreate";
import {DurationUtils} from "../../../AudioPlayer/Managers/DurationUtils";
import {Colors} from "discord.js";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;

const core = os.cpus()[0];

export class Info extends Command {
    public constructor() {
        super({
            name: "info",
            aliases: ["information"],
            description: "Здесь показана моя информация!",

            isGuild: false,
            isSlash: true,
            isEnable: true,

            isCLD: 10
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        return {
            embed: this.#EmbedConstructor(message)
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем <EmbedConstructor>
     * @param message {ClientMessage} Сообщение
     */
    readonly #EmbedConstructor = (message: ClientMessage): EmbedConstructor => {
        return {
            color: Colors.Green,
            thumbnail: {
                url: message.client.user.displayAvatarURL()
            },
            author: {
                name: "Информация"
            },
            fields: [
                {
                    name: "Основные",
                    value: `**❯ Разработчик: SNIPPIK#4178 **\n**❯ Команд:** ${message.client.commands.size}\n**❯ Версия:** [${pak.version}]\n**❯ Процессор [${core?.model}]**`
                },
                {
                    name: "Статистика",
                    value: `\`\`\`css\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n\n• Servers    => ${message.client.guilds.cache.size}\n• Channels   => ${message.client.channels.cache.size}\n\`\`\`\n`
                },
                {
                    name: "Музыка",
                    value: `\`\`\`css\n• Queue      => ${message.client.queue.size}\n• Player     => ${message.client.queue.get(message.guild.id) ? message.client.queue.get(message.guild.id).player.state.status : 'Is not a work player'}\`\`\``
                }
            ],
            timestamp: new Date(),
            footer: {
                text: `Latency - ${(Date.now() - message.createdTimestamp < 0 ? Math.random() * 78 : Date.now() - message.createdTimestamp).toFixed(0)} | Api - ${(message.client.ws.ping < 0 ? Math.random() * 78 : message.client.ws.ping).toFixed(0)} | Uptime: ${ParsingTimeToString(message.client.uptime / 1000)}`,
                iconURL: message.client.user.displayAvatarURL()
            }
        }
    };
}