import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";

const Ver = 'https://cdn.discordapp.com/attachments/646399394517614622/858791356628205598/Untitled.png';
const NotVer = 'https://cdn.discordapp.com/attachments/646399394517614622/858791801494437898/Untitled2.png';
const NotFound = 'https://cdn.discordapp.com/attachments/860113484493881365/916587315378388992/UntitledNotFound.png';
const NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
const Button = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("resume_pause").setEmoji({name: "⏯"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("skip").setEmoji({name: "⏭"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("replay").setEmoji({name: "🔄"}).setStyle(ButtonStyle.Secondary)
)


export {Ver, NotFound, NotVer, NotImage, Button};