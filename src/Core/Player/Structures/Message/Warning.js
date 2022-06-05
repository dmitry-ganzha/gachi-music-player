"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Warning = void 0;
const Helper_1 = require("./Helper");
const DurationUtils_1 = require("../../Manager/DurationUtils");
function Warning(client, { color, author, image, title, url, duration, requester }, { songs }, err) {
    return {
        color,
        description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
        author: {
            name: client.ConvertedText(author.title, 45, false),
            iconURL: author.isVerified === undefined ? Helper_1.NotFound : author.isVerified ? Helper_1.Ver : Helper_1.NotVer,
            url: author.url,
        },
        thumbnail: {
            url: image?.url ?? Helper_1.NotImage,
        },
        timestamp: new Date(),
        footer: {
            text: `${requester.username} | ${(0, DurationUtils_1.TimeInArray)(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL() ? requester.displayAvatarURL() : client.user.displayAvatarURL(),
        }
    };
}
exports.Warning = Warning;
