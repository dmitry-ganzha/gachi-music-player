"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentPlay = void 0;
const Helper_1 = require("./Helper");
const DurationUtils_1 = require("../../Manager/DurationUtils");
const ProgressBarValue = true;
function CurrentPlay(client, song, queue) {
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
        fields: createFields(song, queue, client),
        image: {
            url: song.image?.url ?? null
        },
        footer: {
            text: `${song.requester.username} | ${(0, DurationUtils_1.TimeInArray)(queue)} | 🎶: ${queue.songs.length} | Повтор: ${queue.options.loop}`,
            iconURL: song.requester.displayAvatarURL(),
        }
    };
}
exports.CurrentPlay = CurrentPlay;
function createFields(song, { player, songs, audioFilters }, client) {
    const PlayingDuration = ConvertCurrentTime(player, audioFilters);
    const DurationMusic = MusicDuration(song, PlayingDuration);
    let fields = [{
            name: `Щас играет`,
            value: `**❯** [${client.ConvertedText(song.title, 29, true)}](${song.url})\n${DurationMusic}`
        }];
    if (songs[1])
        fields.push({ name: `Потом`, value: `**❯** [${client.ConvertedText(songs[1].title, 29, true)}](${songs[1].url})` });
    return fields;
}
function MusicDuration({ isLive, duration }, curTime) {
    if (isLive)
        return `[${duration.StringTime}]`;
    const str = `${duration.StringTime}]`;
    const parsedTimeSong = curTime > duration.seconds ? duration.StringTime : (0, DurationUtils_1.ParseTimeString)(curTime);
    const progress = ProgressBar(curTime, duration.seconds, 15);
    if (ProgressBarValue)
        return `**❯** [${parsedTimeSong} - ${str}\n${progress}`;
    return `**❯** [${curTime} - ${str}`;
}
function ConvertCurrentTime({ state }, filters) {
    const duration = state.resource?.playbackDuration ?? 0;
    let seconds = parseInt((duration / 1000).toFixed(0));
    if (ProgressBarValue)
        return seconds;
    return (0, DurationUtils_1.ParseTimeString)(seconds);
}
function ProgressBar(currentTime, maxTime, size = 15) {
    const progressSize = Math.round(size * (currentTime / maxTime));
    const emptySize = size - progressSize;
    const progressText = "─".repeat(progressSize);
    const emptyText = "─".repeat(emptySize);
    return `${progressText}⚪${emptyText}`;
}
