import {Command} from "../../../Structures/Command";
import os from 'node:os';
import pak from "../../../../package.json";
import {EmbedConstructor} from "../../Events/Activity/Message";
import {Colors, GlobalUtils} from "../../../Core/Utils/LiteUtils";
import {DurationUtils} from "../../../AudioPlayer/Manager/DurationUtils";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;
import {ClientMessage} from "../../Events/Activity/Message";

const core = os.cpus()[0];
interface OptionsEmbed {
    queue: number;
    channels: number;
    guilds: number;
}

export default class Info extends Command {
    public constructor() {
        super({
            name: "info",
            description: "Здесь показана моя информация!",
            aliases: ["information"],

            slash: true,
            enable: true,
            CoolDown: 10
        });
    };

    public readonly run = async (message: ClientMessage): Promise<void> => {
        //Если запущен ShardManager
        if (message.client.shard) {
            let queue = message.client.queue.size, guilds = message.client.guilds.cache.size, channels = message.client.channels.cache.size;
            try {
                message.client.shard.fetchClientValues("channels.cache.size").then((numbers) => this.#AutoConverter(numbers, channels));
                message.client.shard.fetchClientValues("guilds.cache.size").then((numbers) => this.#AutoConverter(numbers, guilds));
                message.client.shard.fetchClientValues("queue.size").then((numbers) => this.#AutoConverter(numbers, queue));
            } finally {
                message.channel.send({embeds: [this.#EmbedConstructor(message, {channels, guilds, queue})]})
                    .then((msg) => GlobalUtils.DeleteMessage(msg, 25e3));
            }
            return;
        }

        message.channel.send({embeds: [this.#EmbedConstructor(message)]}).then((msg) => GlobalUtils.DeleteMessage(msg, 25e3));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем <EmbedConstructor>
     * @param message {ClientMessage} Сообщение
     * @param options {OptionsEmbed} Данные
     * @private
     */
    readonly #EmbedConstructor = (message: ClientMessage, options?: OptionsEmbed): EmbedConstructor => {
        return {
            color: Colors.GREEN,
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
                    value: `\`\`\`css\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n\n• Servers    => ${options?.guilds ?? message.client.guilds.cache.size}\n• Channels   => ${options?.channels ??message.client.channels.cache.size}\n\`\`\`\n`
                },
                {
                    name: "Музыка",
                    value: `\`\`\`css\n• Queue      => ${options?.queue ?? message.client.queue.size}\n• Player     => ${message.client.queue.get(message.guild.id) ? message.client.queue.get(message.guild.id).player.state.status : 'Is not a work player'}\`\`\``
                }
            ],
            timestamp: new Date(),
            footer: {
                text: `Latency - ${(Date.now() - message.createdTimestamp < 0 ? Math.random() * 78 : Date.now() - message.createdTimestamp).toFixed(0)} | Api - ${(message.client.ws.ping < 0 ? Math.random() * 78 : message.client.ws.ping).toFixed(0)} | Uptime: ${ParsingTimeToString(message.client.uptime / 1000)}`,
                iconURL: message.client.user.displayAvatarURL()
            }
        }
    };
    readonly #AutoConverter = (Array: any[], PushBase: any) => Array.forEach((number) => PushBase += number);
}