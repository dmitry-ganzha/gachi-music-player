import {VoiceManager} from "../../Modules/Music/src/Manager/Voice/Voice";
import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import {StageChannel, VoiceChannel} from "discord.js";

export default class CommandJoin extends Command {
    constructor() {
        super({
            name: "join",
            aliases: ["summon", "j"],
            description: 'Подключение к голосовому каналу',

            permissions: {
                user: null,
                client: ['SPEAK', 'CONNECT']
            },
            enable: true,
        })
    };

    public run = async (message: W_Message): Promise<unknown> => {
        this.DeleteMessage(message, 5e3);
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({text: `${message.author}, Подключись к голосовому каналу!`, message: message, color: 'RED'});

        if (voiceChannel.id === message.guild.me.voice.id) return message.client.Send({text: `${message.author}, Я уже в этом канале <#${queue.channels.voice.id}>.`, message: message, color: "RED"});

        const VoiceConnection = new VoiceManager().Join(voiceChannel);

        if (queue) {
            queue.channels.voice = voiceChannel;
            queue.channels.connection = VoiceConnection;
        }
        return;
    };
}