import {Command} from "../Constructor";
import * as os from 'node:os';
import {MessageActionRow, MessageButton, MessageEmbed} from "discord.js";
import * as pak from "../../package.json";
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";
import {W_Message} from "../../Core/Utils/W_Message";

const core = os.cpus()[0];
const Buttons = {
    MyUrl: new MessageButton().setURL('https://discord.com/oauth2/authorize?client_id=777195112576450580&permissions=8&scope=bot+applications.commands').setEmoji('🔗').setStyle('LINK').setLabel('Invite'),
    ServerUrl: new MessageButton().setURL('https://discord.gg/qMf2Sv3').setEmoji('🛡').setStyle('LINK').setLabel('My server'),
    MyWebSite: new MessageButton().setURL('https://watklok.herokuapp.com').setEmoji('🌐').setStyle('LINK').setLabel('Web site')
}
const RunButt = new MessageActionRow().addComponents(Buttons.MyUrl, Buttons.ServerUrl, Buttons.MyWebSite);

export default class CommandInfo extends Command {
    constructor() {
        super({
            name: 'info',
            aliases: ['information'],

            enable: true
        })
    };
    public run = async (message: W_Message): Promise<unknown> => message.channel.send({embeds: [new InfoEmbed(message)], components: [RunButt]}).then(async (msg: W_Message | any) => (this.DeleteMessage(msg, 35e3), this.DeleteMessage(message, 5e3)) ).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
}

function FormatBytes(heapUsed: number): string {
    if (heapUsed === 0) return '0 Байт';
    const sizes: string[] = ['Байт','КБ','МБ','ГБ','ТБ','ПБ','ЕБ','ЗБ','УБ'];
    const i: number = Math.floor(Math.log(heapUsed) / Math.log(1024));
    return `${parseFloat((heapUsed / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}
class InfoEmbed extends MessageEmbed {
    constructor(message: W_Message) {
        super({
            color: "GREEN",
            thumbnail: {
                url: message.client.user.displayAvatarURL({format: 'png', dynamic: true, size: 1024})
            },
            author: {
                name: 'Информация',
                icon_url: message.client.user.displayAvatarURL({format: 'png', dynamic: true, size: 1024}),
            },
            fields: [
                {
                    name: `Основные`,
                    value: `**❯ Команд:** ${message.client.commands.size}\n**❯ Version:** [${pak.version}]\n**❯ Процессор [${core?.model}]**`
                },
                {
                    name: 'Статистика',
                    value: `\`\`\`css\n• Uptime     => ${ParserTimeSong(message.client.uptime / 1000)}\n• Memory     => ${FormatBytes(process.memoryUsage().heapUsed)}\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n\n• Servers    => ${message.client.guilds.cache.size}\n• Channels   => ${message.client.channels.cache.size}\n\`\`\`\n`
                },
                {
                    name: 'Код написан на',
                    value: `\`\`\`css\nTypeScript: 81.3%\nJavaScript: 18.7%\`\`\``
                },
                {
                    name: 'Музыка',
                    value: `\`\`\`css\n• Queue      => ${message.client.queue.size}\n• Player     => ${message.client.queue.get(message.guild.id) ? message.client.queue.get(message.guild.id).player.state.status : 'Is not a work player'}\`\`\``
                }
            ],
            timestamp: new Date(),
            footer: {
                text: `Ping - ${Date.now() - message.createdTimestamp < 0 ? 5 : Date.now() - message.createdTimestamp} | Api - ${Math.round(message.client.ws.ping < 0 ? 5 : message.client.ws.ping)}`,
            }
        })
    };
}