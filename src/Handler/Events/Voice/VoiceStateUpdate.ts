import {consoleTime, WatKLOK} from "@Client/Client";
import {GuildMember, VoiceState} from "discord.js";
import {Event} from "@Structures/Handle/Event";
import {Debug} from "@db/Config.json";
import {Voice} from "@VoiceManager";
import {Queue} from "@Queue/Queue";

export class voiceStateUpdate extends Event<VoiceState, VoiceState> {
    public readonly name: string = "voiceStateUpdate";
    public readonly isEnable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const ChannelID = oldState?.channel?.id || newState?.channel?.id;
        const Guild = oldState.guild;
        const filter = (member: GuildMember) => this.#filter(member, ChannelID);
        const filterBot = (member: GuildMember) => member.user.id === client.user.id;

        setImmediate(() => {
            const voice = Voice.getVoice(Guild.id), isBotVoice = !!newState.channel?.members?.find(filterBot) ?? !!oldState.channel?.members?.find(filterBot);
            const usersSize = newState.channel?.members?.filter(filter)?.size ?? oldState.channel?.members?.filter(filter)?.size;

            //Если есть голосовое подключение и пользователей меньше одного и каналы соответствуют и выключен радио режим, то отключаемся от голосового канала
            if (voice && usersSize < 1 && voice.joinConfig.channelId === oldState?.channelId && !queue?.options?.radioMode) Voice.Disconnect(Guild);

            //Если есть очередь и нет радио режима
            if (queue && !queue?.options?.radioMode) {
                if (usersSize < 1 && !isBotVoice) queue.TimeDestroying("start"); //Если есть очередь сервера, удаляем!
                else if (usersSize > 0) queue.TimeDestroying("cancel"); //Если есть очередь сервера, отмена удаления!
            }

            if (Debug) consoleTime(`[Debug] -> [voiceStateUpdate]: [Voice: ${!!voice} | inVoice: ${isBotVoice} | Users: ${usersSize} | Queue: ${!!queue}]`);
        });
    };
    //Фильтруем пользователей в голосовом канале
    readonly #filter = (member: GuildMember, channelID: string) => !member.user.bot && member.voice?.channel?.id === channelID;
}