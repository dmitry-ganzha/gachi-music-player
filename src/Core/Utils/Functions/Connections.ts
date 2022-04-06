import {Guild, VoiceState} from "discord.js";
import {getVoiceConnection} from "@discordjs/voice";

export function Connections(Guild: Guild): VoiceState[] {
    const Users: VoiceState[] = [], set = getVoiceConnection(Guild.id);
    if (set) {
        Guild.voiceStates.cache.find((fn: VoiceState): any => {
            if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId)) return;
            Users.push(fn);
        })
        return Users;
    } else return Users;
}