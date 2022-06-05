"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddSong = void 0;
const Helper_1 = require("./Helper");
const DurationUtils_1 = require("../../Manager/DurationUtils");
function AddSong(client, { color, author, image, title, url, duration, requester }, { songs }) {
    return {
        color,
        author: {
            name: client.ConvertedText(author.title, 45, false),
            iconURL: author.isVerified === undefined ? Helper_1.NotFound : author.isVerified ? Helper_1.Ver : Helper_1.NotVer,
            url: author.url,
        },
        thumbnail: {
            url: !image?.url ? author?.image.url : image?.url ?? Helper_1.NotImage,
        },
        fields: [{
                name: `Добавлено`,
                value: `**❯** [${client.ConvertedText(title, 40, true)}](${url}})\n**❯** [${duration.StringTime}]`
            }],
        footer: {
            text: `${requester.username} | ${(0, DurationUtils_1.TimeInArray)(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL(),
        }
    };
}
exports.AddSong = AddSong;
