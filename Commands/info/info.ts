import {Command} from "../Constructor";
import os from 'node:os';
import {ActionRow, ButtonComponent, ButtonStyle} from "discord.js";
import pak from "../../package.json";
import cfg from "../../db/Config.json";
import TSConfig from "../../tsconfig.json";
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";
import {EmbedConstructor, wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

const core = os.cpus()[0];

export class CommandInfo extends Command {
    public constructor() {
        super({
            name: 'info',
            aliases: ['information'],

            slash: true,
            enable: false,
            CoolDown: 10
        })
    };
    public run = async (message: wMessage): Promise<void | NodeJS.Timeout| any> => {
        const Buttons = {
            // @ts-ignore
            MyUrl: new ButtonComponent().setURL(`https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot+applications.commands`).setEmoji({name: '🔗'}).setLabel('Invite').setStyle(ButtonStyle.Link),
            // @ts-ignore
            ServerUrl: new ButtonComponent().setURL(cfg.Bot.DiscordServer).setEmoji({name: "🛡"}).setLabel('My server').setStyle(ButtonStyle.Link)
        }
        const RunButt = new ActionRow().addComponents(Buttons.MyUrl, Buttons.ServerUrl);

        return message.channel.send({embeds: [InfoEmbed(message)], components: RunButt}).then(async (msg: wMessage) => Command.DeleteMessage(msg, 35e3)).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    };
}

function InfoEmbed(message: wMessage): EmbedConstructor {
    return {
        color: Colors.GREEN,
        thumbnail: {
            url: message.client.user.displayAvatarURL()
        },
        author: {
            name: 'Информация'
        },
        fields: [
            {
                name: `Основные`,
                value: `**❯ Разработчик: SNIPPIK#4178 **\n**❯ Команд:** ${message.client.commands.size}\n**❯ Версия:** [${pak.version}]\n**❯ Процессор [${core?.model}]**`
            },
            {
                name: 'Статистика',
                value: `\`\`\`css\n• Uptime     => ${ParserTimeSong(message.client.uptime / 1000)}\n• Memory     => ${FormatBytes(process.memoryUsage().heapUsed)} + (${message.client.queue.size * 5} МБ)\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n• ECMAScript => ${TSConfig.compilerOptions.target}\n\n• Servers    => ${message.client.guilds.cache.size}\n• Channels   => ${message.client.channels.cache.size}\n\`\`\`\n`
            },
            {
                name: 'Код написан на',
                value: `\`\`\`css\nTypeScript: 100%\`\`\``
            },
            {
                name: 'Музыка',
                value: `\`\`\`css\n• Queue      => ${message.client.queue.size}\n• Player     => ${message.client.queue.get(message.guild.id) ? message.client.queue.get(message.guild.id).player.state.status : 'Is not a work player'}\`\`\``
            }
        ],
        timestamp: new Date(),
        footer: {
            text: `Ping - ${Date.now() - message.createdTimestamp < 0 ? 5 : Date.now() - message.createdTimestamp} | Api - ${Math.round(message.client.ws.ping < 0 ? 5 : message.client.ws.ping)}`,
            iconURL: message.client.user.displayAvatarURL()
        }
    }
}
 function FormatBytes(heapUsed: number): string {
     if (heapUsed === 0) return '0 Байт';
     const sizes: string[] = ['Байт','КБ','МБ','ГБ','ТБ','ПБ','ЕБ','ЗБ','УБ'];
     const i: number = Math.floor(Math.log(heapUsed) / Math.log(1024));
     return `${parseFloat((heapUsed / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
 }