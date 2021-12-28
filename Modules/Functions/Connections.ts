import {Guild, VoiceState} from "discord.js";
import {getVoiceConnection} from "@discordjs/voice";
import {W_Message} from "../../Core/Utils/W_Message";

export default class Connections {
    public readonly enable: boolean;
    constructor() {
        this.enable = true;
    };
    public run = (client: W_Message["client"]): (Guild: Guild) => VoiceState[] => client.connections = (Guild: Guild): VoiceState[] => {
        const Users = [], set = getVoiceConnection(Guild.id);
        if (set) {
            Guild.voiceStates.cache.find((fn: VoiceState): any => {
                if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId)) {
                    return;
                }
                Users.push(fn);
            })
            return Users;
        } else return Users;
    };
}