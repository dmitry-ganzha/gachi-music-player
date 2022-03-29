"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connections = void 0;
const voice_1 = require("@discordjs/voice");
class Connections {
    constructor() {
        this.enable = true;
        this.run = (client) => client.connections = (Guild) => {
            const Users = [], set = (0, voice_1.getVoiceConnection)(Guild.id);
            if (set) {
                Guild.voiceStates.cache.find((fn) => {
                    if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId)) {
                        return;
                    }
                    Users.push(fn);
                });
                return Users;
            }
            else
                return Users;
        };
    }
}
exports.Connections = Connections;
