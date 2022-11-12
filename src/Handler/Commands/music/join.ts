import {Command} from "../../../Structures/Command";
import {StageChannel, VoiceChannel} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {Voice} from "../../../AudioPlayer/Structures/Voice/Voice";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Join extends Command {
    public constructor() {
        super({
            name: "join",
            aliases: ["summon", "j"],
            description: 'Подключение к вашему голосовому каналу!',

            permissions: {
                user: null,
                client: ['Speak', 'Connect']
            },
            slash: true,
            enable: true,
        });
    };

    public readonly run = (message: ClientMessage): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если пользователь пытается подключить бота к тому же каналу
        if (voiceChannel.id === message.guild.members.me.voice.id) return message.client.sendMessage({
            text: `${message.author}, Я уже в этом канале <#${queue.voice.id}>.`,
            message,
            color: "DarkRed"
        });

        if (queue) { //Если есть очередь, то
            const connection = Voice.Join(voiceChannel); //Подключаемся к голосовому каналу

            queue.message = message;
            queue.voice = voiceChannel;

            queue.player.voice(connection); //Подключаем голосовой канал к плееру

            queue.TimeDestroying("cancel"); //Отменяем удаление очереди
            return;
        }

        //Просто подключаемся к голосовому каналу
        Voice.Join(voiceChannel);
        return;
    };
}