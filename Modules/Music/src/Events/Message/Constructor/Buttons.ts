import {MessageButton, MessageActionRow, MessageButtonOptions} from "discord.js";

class Buttons extends MessageButton {
    constructor(options: MessageButtonOptions) {
        super(options);
    };
}
export function RunButt() {
    return new MessageActionRow().addComponents(
        new Buttons({
            customId: "skip",
            emoji: "⏭",
            style: "SECONDARY",
            label: "Skip"
        }),
        new Buttons({
            customId: "pause",
            emoji: "⏸",
            style: "SECONDARY",
            label: "Pause"
        }),
        new Buttons({
            customId: "resume",
            emoji: "▶️",
            style: "SECONDARY",
            label: "Resume"
        }),
        new Buttons({
            customId: "replay",
            emoji: "🔄",
            style: "SECONDARY",
            label: "Replay"
        }),
    );
}