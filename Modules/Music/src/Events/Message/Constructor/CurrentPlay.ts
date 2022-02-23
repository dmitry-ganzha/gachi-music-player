import {FullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Structures/Song";
import {Queue} from "../../../Manager/Queue/Structures/Queue";
import {EmbedConstructor, wClient, wMessage} from "../../../../../../Core/Utils/TypesHelper";
import {audioPlayer} from "../../../Audio/AudioPlayer";
import {ParserTimeSong} from "../../../Manager/Functions/ParserTimeSong";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";

const ProgressBar = true;

export async function CurrentPlay({client, guild}: wMessage, song: Song, queue: Queue): Promise<EmbedConstructor> {
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
        fields: await CurrentPlayBase.createFields(song, queue, client),
        image: {
            url: song.image?.url ?? null
        },
        //timestamp: new Date(),
        footer: {
            text: `${song.requester.username} | ${FullTimeSongs(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
            iconURL: song.requester.displayAvatarURL() ? song.requester.displayAvatarURL() : client.user.displayAvatarURL(),
        }
    };
}

class CurrentPlayBase {
    public static createFields = async (song: Song, {player, songs}: Queue, client: wClient): Promise<{ name: string, value: string }[]> => {
        let fields = [{
            name: `Щас играет`,
            value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${await this.MusicTimer(song, await this.ConvertCurrentTime(player, ProgressBar), ProgressBar)}`
        }];
         if (songs[1]) fields.push({ name: `Потом`, value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
        return fields;
    };
    protected static MusicTimer = async ({isLive, duration}: Song, curTime: number | string, progressBar: boolean = true): Promise<string> => {
        let str = `${duration.StringTime}]`;
        if (isLive) return `[${str}`;
        return progressBar ? `**❯** [${ParserTimeSong(curTime as number)} - ${str}\n|${(await this.ProgressBar(curTime as number, duration.seconds, 12)).Bar}|` : `**❯** [${curTime} - ${str}`;
    };
    protected static ConvertCurrentTime = async ({state}: audioPlayer, sec: boolean = true): Promise<number | string> => {
        let duration = state.resource?.playbackDuration ?? 0;
        let seconds = parseInt((duration / 1000).toFixed(0));
        return sec ? seconds : ParserTimeSong(seconds);
    };
    protected static ProgressBar = async (currentTime: number, maxTime: number, size: number = 15): Promise<{ Bar: string, percentageText: string }> => {
        const percentage = currentTime / maxTime;
        const progress = Math.round(size * percentage);
        const emptyProgress = size - progress;

        const progressText = "█".repeat(progress); //Old: ▇
        const emptyProgressText = "ᅠ".repeat(emptyProgress);
        const percentageText = Math.round(percentage * 100) + "%";

        const Bar = progressText + emptyProgressText;
        return {Bar, percentageText};
    };
}