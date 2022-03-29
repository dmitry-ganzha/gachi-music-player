"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentPlay = void 0;
const FullTimeSongs_1 = require("../../../Manager/Functions/FullTimeSongs");
const ParserTimeSong_1 = require("../../../Manager/Functions/ParserTimeSong");
const Helper_1 = require("./Helper");
const ProgressBarValue = true;
async function CurrentPlay(client, song, queue) {
    return {
        color: song.color,
        author: {
            name: client.ConvertedText(song.author.title, 45, false),
            iconURL: song.author.isVerified === undefined ? Helper_1.NotFound : song.author.isVerified ? Helper_1.Ver : Helper_1.NotVer,
            url: song.author.url,
        },
        thumbnail: {
            url: song.author?.image?.url ?? Helper_1.NotImage,
        },
        fields: await createFields(song, queue, client),
        image: {
            url: song.image?.url ?? null
        },
        footer: {
            text: `${song.requester.username} | ${(0, FullTimeSongs_1.FullTimeSongs)(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
            iconURL: song.requester.displayAvatarURL(),
        }
    };
}
exports.CurrentPlay = CurrentPlay;
async function createFields(song, { player, songs, audioFilters }, client) {
    const PlayingDuration = await ConvertCurrentTime(player, ProgressBarValue, audioFilters);
    const DurationMusic = await MusicDuration(song, PlayingDuration, ProgressBarValue);
    let fields = [{
            name: `Щас играет`,
            value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${DurationMusic}`
        }];
    if (songs[1])
        fields.push({ name: `Потом`, value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
async function MusicDuration({ isLive, duration }, curTime, progressBar = true) {
    const str = `${duration.StringTime}]`;
    if (isLive)
        return `[${str}`;
    const parsedTimeSong = (0, ParserTimeSong_1.ParserTimeSong)(curTime);
    const progress = await ProgressBar(curTime, duration.seconds, 12);
    if (progressBar)
        return `**❯** [${parsedTimeSong} - ${str}\n|${progress}|`;
    return `**❯** [${curTime} - ${str}`;
}
async function ConvertCurrentTime({ state }, ProgressBar = true, filters) {
    const duration = state.resource?.playbackDuration ?? 0;
    let seconds;
    if (filters.speed)
        seconds = parseInt(((duration / 1000) * filters.speed).toFixed(0));
    else if (filters.nightcore)
        seconds = parseInt(((duration / 1000) * 1.25).toFixed(0));
    else if (filters.Vw)
        seconds = parseInt(((duration / 1000) * 0.8).toFixed(0));
    else
        seconds = parseInt((duration / 1000).toFixed(0));
    if (ProgressBar)
        return seconds;
    return (0, ParserTimeSong_1.ParserTimeSong)(seconds);
}
async function ProgressBar(currentTime, maxTime, size = 15) {
    const progressSize = Math.round(size * (currentTime / maxTime));
    const emptySize = size - progressSize;
    const progressText = "█".repeat(progressSize);
    const emptyText = "ᅠ".repeat(emptySize);
    return progressText + emptyText;
}
