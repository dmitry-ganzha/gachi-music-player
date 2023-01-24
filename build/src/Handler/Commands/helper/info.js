"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Info = void 0;
const tslib_1 = require("tslib");
const Command_1 = require("@Structures/Handle/Command");
const DurationUtils_1 = require("@Managers/DurationUtils");
const discord_js_1 = require("discord.js");
const package_json_1 = tslib_1.__importDefault(require("package.json"));
const node_os_1 = tslib_1.__importDefault(require("node:os"));
class Command_Info extends Command_1.Command {
    constructor() {
        super({
            name: "info",
            aliases: ["information"],
            description: "Здесь показана моя информация!",
            isGuild: true,
            isSlash: true,
            isEnable: true,
            isCLD: 10
        });
    }
    ;
    run = (message) => {
        const { client, guild } = message;
        return {
            embed: {
                color: discord_js_1.Colors.Green,
                thumbnail: {
                    url: client.user.displayAvatarURL()
                },
                author: {
                    name: "Информация"
                },
                fields: [
                    {
                        name: "Основные",
                        value: `**❯ Разработчик: SNIPPIK#4178 **\n**❯ Команд:** ${client.commands.size}\n**❯ Версия:** [${package_json_1.default.version}]\n**❯ Процессор [${node_os_1.default.cpus()[0].model}]**`
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
                    text: `Latency - ${(Date.now() - message.createdTimestamp < 0 ? Math.random() * 78 : Date.now() - message.createdTimestamp).toFixed(0)} | Api - ${(client.ws.ping < 0 ? Math.random() * 78 : client.ws.ping).toFixed(0)} | Uptime: ${DurationUtils_1.DurationUtils.ParsingTimeToString(client.uptime / 1000)}`,
                    iconURL: client.user.displayAvatarURL()
                }
            }
        };
    };
}
exports.Command_Info = Command_Info;
