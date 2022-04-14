import {Guild, VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";
import {StatusPlayerHasSkipped} from "../../Core/Player/Audio/AudioPlayer";
import {getVoiceConnection, VoiceConnection} from "@discordjs/voice";

export class voiceStateUpdate {
    public readonly name: string = 'voiceStateUpdate';
    public readonly enable: boolean = true;

    public run = ({guild}: VoiceState, newState: VoiceState, client: WatKLOK): void | boolean => {
        const queue: Queue = client.queue.get(guild.id);

        if (!queue) return;

        const voiceConnection: VoiceState[] = client.connections(guild);
        if (!voiceConnection.find((fn: VoiceState) => fn.id === client.user.id)) {
            queue.songs = [];
            queue.options.stop = true;
            return void queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
        }
        return CheckToRun(voiceConnection, client, guild, queue);
    };
}

function CheckToRun(voiceConnection: VoiceState[], client: WatKLOK, guild: Guild, queue: Queue): void | boolean {
    const PlayableVoiceChannel: VoiceConnection = getVoiceConnection(guild.id);

    if (voiceConnection && PlayableVoiceChannel) return voiceConnection.length <= 1 && StatusPlayerHasSkipped.has(queue.player.state.status) ?
        void queue.events.helper.emit('StartTimerDestroyer', queue) :
        void queue.events.helper.emit('CancelTimerDestroyer', queue.player);
}