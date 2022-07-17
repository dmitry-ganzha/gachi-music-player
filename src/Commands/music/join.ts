import {Command} from "../Constructor";
import {StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {Voice} from "../../Core/Player/Structures/Voice";

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

    public readonly run = (message: ClientMessage): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если пользователь пытается подключить бота к тому же каналу
        if (voiceChannel.id === message.guild.members.me.voice.id) return message.client.Send({
            text: `${message.author}, Я уже в этом канале <#${queue.channels.voice.id}>.`,
            message,
            color: "RED"
        });

        if (queue) { //Если есть очередь, то
            const connection = Voice.Join(voiceChannel); //Подключаемся к Vc

            queue.channels.message = message;
            queue.channels.connection = connection;
            queue.channels.voice = voiceChannel;

            queue.player.subscribe(connection); //Подключаем Vc к плееру
            queue.player.resume(); //Продолжаем воспроизведение

            queue.emitter.emit("CancelDelete", queue.player); //Отменяем удаление очереди
            return;
        }

        //Просто подключаемся к голосовому каналу
        Voice.Join(voiceChannel);
        return;
    };
}