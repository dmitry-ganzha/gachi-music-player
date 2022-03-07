import {Command} from "../Constructor";
import {StageChannel, VoiceChannel} from "discord.js";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {DiscordIntegration} from "../../Core/Client/DiscordTogether";

const Integrations = require('../../db/Together/Aplications.json');
const IntegrationString = (() => {
    let base = '', num = 1;

    for (const [key] of Object.entries(Integrations.IDS)) {
        if (num === Object.keys(Integrations.IDS).length) base += `${key}`;
        else base += `${key}, `;
    }
    return base;
})();

export class DiscordIntegrationCommand extends Command {
    public constructor() {
        super({
            name: "integration",
            aliases: ["int"],
            description: "Совместный просмотр youtube",
            permissions: {client: ['Speak', 'Connect'], user: []},
            options: [
                {
                    name: "name",
                    description: `Name - ${IntegrationString}`,
                    required: true,
                    type: "STRING"
                },
            ],
            slash: true,
            enable: true
        })
    };

    public run = async (message: wMessage, args: string[]): Promise<void> => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;

        if (!voiceChannel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: 'RED'
        });

        if (!args[0]) return message.client.Send({
            text: `${message.author}, Ты не указал integration!`,
            message,
            color: 'RED'
        });

        if (!Integrations.IDS[args[0]]) return message.client.Send({
            text: `${message.author}, ${args[0]} не найдена!`,
            message,
            color: 'RED'
        });

        return DiscordIntegration(message.client, message, args[0].toLowerCase());
    }
}