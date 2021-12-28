import {getVoiceConnection, VoiceConnection} from "@discordjs/voice";
import {VoiceState} from "discord.js";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import {W_Message} from "../../Core/Utils/W_Message";
const IsDestroyStatus: Set<string> = new Set(['playing', 'paused'])

export default class voiceStateUpdate {
    public readonly name: string;
    public readonly enable: boolean;

    constructor() {
        this.name = 'voiceStateUpdate';
        this.enable = true;
    }

    public run = async (oldState: VoiceState, newState: VoiceState, client: W_Message["client"]): Promise<any> => {
        const queue: Queue = client.queue.get(oldState.guild.id);
        if (queue) {
            let voiceConnection: VoiceState[] = client.connections(oldState.guild);
            if (!voiceConnection.find((fn: VoiceState) => fn.id === client.user.id)) {
                queue.songs = [];
                queue.options.stop = true;
                return queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
            }
            return this.CheckToRun(voiceConnection, client, oldState, queue);
        }
    };
    private CheckToRun = async (voiceConnection: VoiceState[], client: W_Message["client"], oldState: VoiceState, {player, AutoDisconnect, songs, options, channels, events}: Queue): Promise<void | any> => {
        const PlayableVoiceChannel: VoiceConnection = getVoiceConnection(oldState.guild.id);

        if (voiceConnection && PlayableVoiceChannel) {
            if (voiceConnection.length <= 1 && IsDestroyStatus.has(player.state.status)) return events.helper.emit('StartTimerDestroyer', {player, AutoDisconnect, songs, options, channels, events});
            else events.helper.emit('CancelTimerDestroyer', {AutoDisconnect, player});
        }
    };
}