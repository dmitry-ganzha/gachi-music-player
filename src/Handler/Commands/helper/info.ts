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

            isGuild: true,
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
        const {client, guild} = message;

        return {
            color: Colors.Green,
            thumbnail: {
                url: client.user.displayAvatarURL()
            },
            author: {
                name: "Информация"
            },
            fields: [
                {
                    name: "Основные",
                    value: `**❯ Разработчик: SNIPPIK#4178 **\n**❯ Команд:** ${client.commands.size}\n**❯ Версия:** [${pak.version}]\n**❯ Процессор [${core?.model}]**`
                },
                {
                    name: "Статистика",
                    value: `\`\`\`css\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n\n• Servers    => ${client.guilds.cache.size}\n• Channels   => ${client.channels.cache.size}\n\`\`\`\n`
                },
                {
                    name: "Музыка",
                    value: `\`\`\`css\n• Queue      => ${client.queue.size}\n• Player     => ${client.queue.get(guild.id) ? client.queue.get(guild.id).player.state.status : 'Is not a work player'}\`\`\``
                }
            ],
            timestamp: new Date(),
            footer: {
                text: `Latency - ${(Date.now() - message.createdTimestamp < 0 ? Math.random() * 78 : Date.now() - message.createdTimestamp).toFixed(0)} | Api - ${(client.ws.ping < 0 ? Math.random() * 78 : client.ws.ping).toFixed(0)} | Uptime: ${ParsingTimeToString(client.uptime / 1000)}`,
                iconURL: client.user.displayAvatarURL()
            }
        }
    };
}