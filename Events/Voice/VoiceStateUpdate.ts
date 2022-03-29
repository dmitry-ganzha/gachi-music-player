import {getVoiceConnection, VoiceConnection} from "@discordjs/voice";
import {Guild, VoiceState} from "discord.js";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {wClient} from "../../Core/Utils/TypesHelper";

const IsDestroyStatus: Set<string> = new Set(['playing', 'paused', 'buffering', 'autopaused']);

export class voiceStateUpdate {
    public readonly name: string = 'voiceStateUpdate';
    public readonly enable: boolean = true;

    public run = async ({guild}: VoiceState, newState: VoiceState, client: wClient): Promise<void | boolean> => {
        const queue: Queue = client.queue.get(guild.id);

        if (queue) {
            const voiceConnection: VoiceState[] = client.connections(guild);
            if (!voiceConnection.find((fn: VoiceState) => fn.id === client.user.id)) {
                queue.songs = [];
                queue.options.stop = true;
                return void queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
            }
            return this.CheckToRun(voiceConnection, client, guild, queue);
        }
        return;
    };
    protected CheckToRun = async (voiceConnection: VoiceState[], client: wClient, guild: Guild, queue: Queue): Promise<void | boolean> => {
        const PlayableVoiceChannel: VoiceConnection = getVoiceConnection(guild.id);

        if (voiceConnection && PlayableVoiceChannel) return voiceConnection.length <= 1 && IsDestroyStatus.has(queue.player.state.status) ?
            void queue.events.helper.emit('StartTimerDestroyer', queue) :
            void queue.events.helper.emit('CancelTimerDestroyer', queue);
    };
}