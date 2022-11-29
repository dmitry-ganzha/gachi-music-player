import {GuildMember} from "discord.js";
import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Handle/Event";
import {ClientMessage} from "../Activity/interactionCreate";
import {Channels} from "../../../../db/Config.json";

export class guildMemberRemove extends Event<GuildMember, null> {
    public readonly name: string = "guildMemberRemove";
    public readonly isEnable: boolean = true;

    public readonly run = (member: GuildMember, f2: null, client: WatKLOK): any => {
        const channel = client.channels.cache.get(Channels.removeUser) as ClientMessage["channel"];

        if (channel) channel.send({content: `Нас покинул: ${member.user.tag}`}).catch(() => null);
    };
}