import {decipherFormats} from "../decipher";
import {ChannelData, parseChannelPage} from "./Channel";
import {Utils} from "../Utils";

export async function getVideoInfo(url: string): Promise<{LiveData: LiveData, html5player: string, format: any[], VideoData: VideoData}> {
    const video_id: string = new Utils().getID(url);
    let body: string = await new Utils().RequestExp(`https://www.youtube.com/watch?v=${video_id}&has_verified=1`);

    if (body.indexOf('Our systems have detected unusual traffic from your computer network.') !== -1) throw new Error('Google капча: Google понял что я бот! Это может занять много времени!');
    const player_data = new Utils().FindPlayer(body);
    if (!player_data) throw new Error('Данные на странице не были найдены');

    const player_response = JSON.parse(player_data);

    if (player_response.playabilityStatus.status !== 'OK') throw new Error(`Что-то пошло не так, не могу получить данные со страницы\n${url}`);

    const html5player = `https://www.youtube.com${body.split('"jsUrl":"')[1].split('"')[0]}`;
    const videoDetails = player_response.videoDetails;
    let format = [];

    const VideoData: VideoData = {
        id: videoDetails.videoId,
        url: `https://www.youtube.com/watch?v=${videoDetails.videoId}`,
        title: videoDetails.title,
        duration: {seconds: Number(videoDetails.lengthSeconds)},
        thumbnails: videoDetails.thumbnail.thumbnails[videoDetails.thumbnail.thumbnails.length - 1],
        author: await new parseChannelPage().callback({channelID: videoDetails.channelId}),
        isLive: videoDetails.isLiveContent,
        isPrivate: videoDetails.isPrivate,
    };
    const LiveData: LiveData = {
        isLive: videoDetails.isLiveContent,
        LiveUrl: player_response.streamingData?.dashManifestUrl || player_response.streamingData?.hlsManifestUrl || null
    };

    let VideoFormats: any[] = player_response.streamingData.formats && player_response.streamingData.adaptiveFormats;

    if (VideoFormats[0].signatureCipher || VideoFormats[0].cipher) {
        format = await decipherFormats(VideoFormats, html5player);
    } else {
        format.push(...(VideoFormats ?? []));
    }

    return {
        LiveData,
        html5player,
        format,
        VideoData,
    };
}

export interface VideoData {
    id: string,
    title: string,
    url: string,
    duration: {
        seconds: number
    },
    thumbnails: { url: string, height: number, width: number } | any,
    author: ChannelData | {title: string, url: string, id: string},
    isLive: boolean,
    isPrivate: boolean
}
interface LiveData {
    isLive: boolean,
    LiveUrl: string | null
}