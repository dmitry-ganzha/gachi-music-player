import {Guild, GuildMember} from "discord.js";

export function getMe(guild: Guild): GuildMember {
    return guild.members.cache.get(guild.client.user.id);
}