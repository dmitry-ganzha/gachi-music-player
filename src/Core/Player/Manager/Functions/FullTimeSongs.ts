import {ParserTimeSong} from './ParserTimeSong';
import {Song} from "../../Queue/Structures/Song";
import {Queue} from "../../Queue/Structures/Queue";

/**
 * @description Совмещаем время всех треков из очереди
 * @param queue {Queue | any[]} Очередь
 * @constructor
 */
export function FullTimeSongs (queue: Queue | any[]): string {
    let Timer: number = 0;

    if (queue instanceof Queue) queue.songs.map((song: Song) => Timer += song.duration.seconds);
    else queue.map((song: {duration: {seconds: string}}) => Timer += parseInt(song.duration.seconds));

    return ParserTimeSong(Timer);
}