"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guildMemberRemove = void 0;
const Event_1 = require("@Structures/Handle/Event");
const Config_json_1 = require("db/Config.json");
class guildMemberRemove extends Event_1.Event {
    name = "guildMemberRemove";
    isEnable = true;
    run = (member, f2, client) => {
        const channel = client.channels.cache.get(Config_json_1.Channels.removeUser);
        if (channel)
            channel.send({ content: `Нас покинул: ${member.user.tag}` }).catch(() => null);
    };
}
exports.guildMemberRemove = guildMemberRemove;
