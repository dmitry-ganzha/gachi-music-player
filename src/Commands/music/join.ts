import {Command} from "../Constructor";
import {StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {JoinVoiceChannel} from "../../Core/Player/Manager/Voice/VoiceManager";

export class CommandJoin extends Command {
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

    public run = (message: ClientMessage): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        if (voiceChannel.id === message.guild.members.me.voice.id) return message.client.Send({
            text: `${message.author}, Я уже в этом канале <#${queue.channels.voice.id}>.`,
            message,
            color: "RED"
        });

        if (queue) { //Если есть очередь, то
            const connection = JoinVoiceChannel(voiceChannel); //Подключаемся к Vc
            queue.channels = {message, voice: voiceChannel, connection}; //Записываем необходимые данные в очередь
            queue.player.subscribe(connection); //Подключаем Vc к плееру
            queue.player.resume(); //Продолжаем воспроизведение

            queue.events.helper.emit("CancelQueueDestroy", queue.player); //Отменяем удаление очереди
            return;
        }

        JoinVoiceChannel(voiceChannel); //Просто подключаемся к Vc
        return;
    };
}