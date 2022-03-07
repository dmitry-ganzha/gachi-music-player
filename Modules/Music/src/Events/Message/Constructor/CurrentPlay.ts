import {AsyncFullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Structures/Song";
import {Queue} from "../../../Manager/Queue/Structures/Queue";
import {EmbedConstructor, wClient} from "../../../../../../Core/Utils/TypesHelper";
import {audioPlayer} from "../../../Audio/AudioPlayer";
import {AsyncParserTimeSong} from "../../../Manager/Functions/ParserTimeSong";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";

const ProgressBarValue = true;

export async function CurrentPlay(client: wClient, song: Song, queue: Queue): Promise<EmbedConstructor> {
    return {
        color: song.color,
        author: {
            name: client.ConvertedText(song.author.title, 45, false),
            iconURL: song.author.isVerified === undefined ? NotFound : song.author.isVerified ? Ver : NotVer,
            url: song.author.url,
        },
        thumbnail: {
            url: song.author?.image?.url ?? NotImage,
        },
        fields: await createFields(song, queue, client),
        image: {
            url: song.image?.url ?? null
        },
        //timestamp: new Date(),
        footer: {
            text: `${song.requester.username} | ${await AsyncFullTimeSongs(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
            iconURL: song.requester.displayAvatarURL() ? song.requester.displayAvatarURL() : client.user.displayAvatarURL(),
        }
    };
}

async function createFields(song: Song, {player, songs}: Queue, client: wClient): Promise<{ name: string, value: string }[]> {
    const PlayingDuration = await ConvertCurrentTime(player, ProgressBarValue);
    const DurationMusic = await MusicTimer(song, PlayingDuration, ProgressBarValue);

    let fields = [{
        name: `Щас играет`,
        value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${DurationMusic}`
    }];
    if (songs[1]) fields.push({ name: `Потом`, value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
async function MusicTimer({isLive, duration}: Song, curTime: number | string, progressBar: boolean = true): Promise<string> {
    const str = `${duration.StringTime}]`;

    if (isLive) return `[${str}`;

    const parsedTimeSong = await AsyncParserTimeSong(curTime as number);
    const progress = await ProgressBar(curTime as number, duration.seconds, 12);

    if (progressBar) return `**❯** [${parsedTimeSong} - ${str}\n|${progress}|`;
    return `**❯** [${curTime} - ${str}`;
}
async function ConvertCurrentTime({state}: audioPlayer, sec: boolean = true): Promise<number | string> {
    const duration = state.resource?.playbackDuration ?? 0;
    const seconds = parseInt((duration / 1000).toFixed(0));

    if (sec) return seconds;
    return AsyncParserTimeSong(seconds);
}
async function ProgressBar(currentTime: number, maxTime: number, size: number = 15): Promise<string> {
    const progressSize = Math.round(size * (currentTime / maxTime));
    const emptySize = size - progressSize;

    const progressText = "█".repeat(progressSize);
    const emptyText = "ᅠ".repeat(emptySize);

    return progressText + emptyText;
}