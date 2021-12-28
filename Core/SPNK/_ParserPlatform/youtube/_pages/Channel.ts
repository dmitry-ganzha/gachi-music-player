import {httpsClient} from "../https";

export class parseChannelPage {
    public callback = async (base: any): Promise<ChannelData> =>
        new httpsClient(`https://www.youtube.com/channel/${base.channelId || base.channelID}/channels?flow=grid&view=0&pbj=1`)._parseToJson({cookie: false}).then(async (channel: any) => {
        if (channel.error || typeof channel === "string") return this.IfError(base);
        let data = channel[1]?.response || null;
        return this.Out(data);
    })
    private Out = async (data: any): Promise<ChannelData> => {
        let channelMetaData = data.metadata.channelMetadataRenderer, channelHeaderData = data.header.c4TabbedHeaderRenderer;
        return {
            id: channelMetaData.externalId,
            title: channelMetaData.title,
            url: channelMetaData.vanityChannelUrl,
            thumbnails: channelHeaderData.avatar.thumbnails[2] ?? channelHeaderData.avatar.thumbnails[1] ?? channelHeaderData.avatar.thumbnails[0],
            isVerified: !!channelHeaderData.badges?.find((badge) => badge.metadataBadgeRenderer.tooltip === 'Verified' || badge.metadataBadgeRenderer.tooltip === 'Official Artist Channel'),
        }
    }
    private IfError = (base: any): Promise<ChannelData> => {
        return {
            // @ts-ignore
            id: base.channelId || base.channelID || "No found id",
            title: base.author || base.name || "No found name",
            url: `https://www.youtube.com/channel/${base.channelId || base.channelID || ""}`,
            thumbnails: {
                url: null,
                width: 0,
                height: 0
            },
            isVerified: undefined
        }
    }
}

export interface ChannelData {
    id: string,
    title: string,
    url: string,
    thumbnails: {
        url: string,
        width: number,
        height: number
    },
    isVerified: boolean
}