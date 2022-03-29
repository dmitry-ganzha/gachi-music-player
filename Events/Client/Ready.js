"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Ready = void 0;
const Config_json_1 = __importDefault(require("../../db/Config.json"));
const Colors_1 = require("../../Core/Utils/Colors");
class Ready {
    constructor() {
        this.name = "ready";
        this.enable = false;
        this.run = async (f1, f2, client) => {
            let channel = client.channels.cache.get(Config_json_1.default.Channels.Start);
            if (channel && !client.shard)
                return channel.send({ embeds: [await MessageEmbed(client)] });
            return null;
        };
    }
}
exports.Ready = Ready;
async function MessageEmbed(client) {
    return {
        color: Colors_1.Colors.WHITE,
        description: `**${client.user}**: Starting...`,
        timestamp: new Date(),
        footer: {
            text: `${client.user.username}`,
            iconURL: client.user.displayAvatarURL(),
        }
    };
}
