"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = exports.NotImage = exports.NotVer = exports.NotFound = exports.Ver = void 0;
const discord_js_1 = require("discord.js");
const Ver = 'https://cdn.discordapp.com/attachments/646399394517614622/858791356628205598/Untitled.png';
exports.Ver = Ver;
const NotVer = 'https://cdn.discordapp.com/attachments/646399394517614622/858791801494437898/Untitled2.png';
exports.NotVer = NotVer;
const NotFound = 'https://cdn.discordapp.com/attachments/860113484493881365/916587315378388992/UntitledNotFound.png';
exports.NotFound = NotFound;
const NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
exports.NotImage = NotImage;
const Button = new discord_js_1.ActionRowBuilder().addComponents([
    new discord_js_1.ButtonBuilder().setCustomId("last").setEmoji({ id: "963787068264288346" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("resume_pause").setEmoji({ id: "963787098547171438" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("skip").setEmoji({ id: "963787083992940605" }).setStyle(discord_js_1.ButtonStyle.Secondary),
    new discord_js_1.ButtonBuilder().setCustomId("replay").setEmoji({ id: "963788841603457064" }).setStyle(discord_js_1.ButtonStyle.Secondary)
]);
exports.Button = Button;
