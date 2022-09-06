import {GuildMember, VoiceState} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";
import {Voice} from "../../../AudioPlayer/Structures/Voice";
import {getVoiceConnection} from "@discordjs/voice";

export class voiceStateUpdate extends Event<VoiceState, VoiceState> {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const Guild = oldState.guild;
        const ChannelID = oldState?.channel?.id || newState?.channel?.id;

        setImmediate(() => {
            const voice = getVoiceConnection(Guild.id);
            const usersSize = newState.channel?.members?.filter(member => this.#filter(member, ChannelID))?.size ?? 0;

            //Если есть голосовое подключение и нет пользователей
            if (voice && usersSize === 0) Voice.Disconnect(Guild);

            //Если нет очереди, то ничего не делаем
            if (!queue) return;

            //Бот не подключен к голосовому каналу
            if (!voice && usersSize > 0) return queue.TimeDestroying("start");

            //Если пользователей нет в голосовом канале
            if (usersSize > 0) queue.TimeDestroying("cancel"); //Если есть очередь сервера, отмена удаления!
            else if (usersSize < 1) queue.TimeDestroying("start"); //Если есть очередь сервера, удаляем!
        });
    };
    //Фильтруем пользователей в голосовом канале
    readonly #filter = (member: GuildMember, channelID: string) => !member.user.bot && member.voice?.channel?.id === channelID;
}