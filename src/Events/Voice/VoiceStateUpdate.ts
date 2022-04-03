import {getVoiceConnection, VoiceConnection} from "@discordjs/voice";
import {Guild, VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Queue/Structures/Queue";
import {WatKLOK} from "../../Core/Client";

const IsDestroyStatus: Set<string> = new Set(['playing', 'paused', 'buffering', 'autopaused']);

export class voiceStateUpdate {
    public readonly name: string = 'voiceStateUpdate';
    public readonly enable: boolean = true;

    public run = ({guild}: VoiceState, newState: VoiceState, client: WatKLOK): void | boolean => {
        const queue: Queue = client.queue.get(guild.id);

        if (queue) {
            const voiceConnection: VoiceState[] = client.connections(guild);
            if (!voiceConnection.find((fn: VoiceState) => fn.id === client.user.id)) {
                queue.songs = [];
                queue.options.stop = true;
                return void queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
            }
            return CheckToRun(voiceConnection, client, guild, queue);
        }
        return;
    };
}

function CheckToRun(voiceConnection: VoiceState[], client: WatKLOK, guild: Guild, queue: Queue): void | boolean {
    const PlayableVoiceChannel: VoiceConnection = getVoiceConnection(guild.id);

    if (voiceConnection && PlayableVoiceChannel) return voiceConnection.length <= 1 && IsDestroyStatus.has(queue.player.state.status) ?
        void queue.events.helper.emit('StartTimerDestroyer', queue) :
        void queue.events.helper.emit('CancelTimerDestroyer', queue);
}