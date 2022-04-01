import {Command} from "../Constructor";
import os from 'node:os';
import {ButtonStyle, ActionRowBuilder, ButtonBuilder} from "discord.js";
import pak from "../../../package.json";
import cfg from "../../../DataBase/Config.json";
import TSConfig from "../../../tsconfig.json";
import {ClientMessage} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/Colors";
import {ParserTimeSong} from "../../Core/Player/Manager/Functions/ParserTimeSong";

const core = os.cpus()[0];

export class CommandInfo extends Command {
    public constructor() {
        super({
            name: 'info',
            aliases: ['information'],

            slash: true,
            enable: true,
            CoolDown: 10
        })
    };
    public run = (message: ClientMessage): void => {
        const Buttons = {
            MyUrl: new ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${message.client.user.id}&permissions=8&scope=bot+applications.commands`).setEmoji({name: '🔗'}).setLabel('Invite').setStyle(ButtonStyle.Link),
            ServerUrl: new ButtonBuilder().setURL(cfg.Bot.DiscordServer).setEmoji({name: "🛡"}).setLabel('My server').setStyle(ButtonStyle.Link),
            Git: new ButtonBuilder().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji({name: "🗂"}).setLabel("GitHub").setStyle(ButtonStyle.Link)
        }
        const RunButt = new ActionRowBuilder().addComponents(Buttons.MyUrl, Buttons.ServerUrl, Buttons.Git);

        return getCPUUsage((cpu: number) => {
            return message.channel.send({
                embeds: [InfoEmbed(message, cpu.toFixed(2))],
                // @ts-ignore
                components: [RunButt]
            }).then((msg: ClientMessage) => Command.DeleteMessage(msg, 35e3)).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
        })
    };
}

function InfoEmbed(message: ClientMessage, cpu: string): EmbedConstructor {
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
                value: `\`\`\`css\n• Memory     => ${FormatBytes(process.memoryUsage().heapUsed)} + (${message.client.queue.size * 5} МБ)\n• CPU        => ${cpu}%\n• Platform   => ${process.platform}\n• Node       => ${process.version}\n• ECMAScript => ${TSConfig.compilerOptions.target}\n\n• Servers    => ${message.client.guilds.cache.size}\n• Channels   => ${message.client.channels.cache.size}\n\`\`\`\n`
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
            text: `Latency - 78 | Api - ${Math.round(message.client.ws.ping < 0 ? 5 : message.client.ws.ping)} | Uptime: ${ParserTimeSong(message.client.uptime / 1000)}`,
            iconURL: message.client.user.displayAvatarURL()
        }
    }
}
function FormatBytes(heapUsed: number): string {
    if (heapUsed === 0) return '0 Байт';
    const sizes: string[] = ['Байт', 'КБ', 'МБ', 'ГБ', 'ТБ', 'ПБ', 'ЕБ', 'ЗБ', 'УБ'];
    const i: number = Math.floor(Math.log(heapUsed) / Math.log(1024));
    return `${parseFloat((heapUsed / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}
function getCPUUsage(callback: Function, free = false) {
    const stats1 = getCPUInfo();
    const startIdle = stats1.idle;
    const startTotal = stats1.total;

    setTimeout(function() {
        const stats2 = getCPUInfo();
        const endIdle = stats2.idle;
        const endTotal = stats2.total;

        const idle 	= endIdle - startIdle;
        const total 	= endTotal - startTotal;
        const per	= idle / total;

        if(free === true)
            callback( per );
        else
            callback( (1 - per) );

    }, 1000 );
}
function getCPUInfo(){
    const cpus = os.cpus();

    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0, total;

    for (let cpu in cpus){
        if (!cpus.hasOwnProperty(cpu)) continue;
        user += cpus[cpu].times.user;
        nice += cpus[cpu].times.nice;
        sys += cpus[cpu].times.sys;
        irq += cpus[cpu].times.irq;
        idle += cpus[cpu].times.idle;
    }

    total = user + nice + sys + idle + irq;

    return { idle, total };
}