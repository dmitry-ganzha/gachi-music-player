import {GuildMember, VoiceState} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";
import {Voice} from "../../../AudioPlayer/Structures/Voice";
import {Debug} from "../../../../db/Config.json";

export class voiceStateUpdate extends Event<VoiceState, VoiceState> {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const Guild = oldState.guild;
        const ChannelID = oldState?.channel?.id || newState?.channel?.id;
        const filter = (member: GuildMember) => this.#filter(member, ChannelID);
        const filterBot = (member: GuildMember) => member.user.id === client.user.id;

        setImmediate(() => {
            const voice = Voice.getVoice(Guild.id), isBotVoice = !!newState.channel?.members?.find(filterBot) ?? !!oldState.channel?.members?.find(filterBot);
            const usersSize = newState.channel?.members?.filter(filter)?.size ?? oldState.channel?.members?.filter(filter)?.size;

            //Если есть голосовое подключение и нет пользователей и чат соотвествует в котором сидит бот
            if (voice && usersSize < 1 && voice.joinConfig.channelId === oldState?.channelId) Voice.Disconnect(Guild);

            //Если есть очередь
            if (queue) {
                if (usersSize < 1 && !isBotVoice) queue.TimeDestroying("start"); //Если есть очередь сервера, удаляем!
                else if (usersSize > 0) queue.TimeDestroying("cancel"); //Если есть очередь сервера, отмена удаления!
            }

            if (Debug) client.console(`[Debug] -> [voiceStateUpdate]: [Voice: ${!!voice} | inVoice: ${isBotVoice} | Users: ${usersSize} | Queue: ${!!queue}]`);
        });
    };
    //Фильтруем пользователей в голосовом канале
    readonly #filter = (member: GuildMember, channelID: string) => !member.user.bot && member.voice?.channel?.id === channelID;
}