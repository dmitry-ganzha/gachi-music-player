import {wClient, wMessage} from "../Utils/TypesHelper";
import {httpsClient} from "../httpsClient";

const defaultApplications = require('../../db/Together/Aplications.json');

async function createTogetherCode(client: wClient, ChannelID: string, code: string): Promise<string> {
    const Application = defaultApplications.IDS[code];
    if (!Application) return "Not found!";

    const invite = await new httpsClient().parseJson(`https://discord.com/api/v8/channels/${ChannelID}/invites`, {
        request: {
            method: 'POST',
            body: JSON.stringify({
                max_age: 86400,
                max_uses: 0,
                target_application_id: Application,
                target_type: 2,
                temporary: false,
                validate: true,
            }),
            headers: {
                Authorization: `Bot ${client.token}`,
                'Content-Type': 'application/json',
            }
        },
        options: {zLibEncode: true}
    });
    if (!invite) return "Not found out data"
    if (invite.error || !invite.code) return "An error occured while retrieving data!";
    if (Number(invite.code) === 50013) return "Your bot lacks permissions to perform that action!";

    return `https://discord.com/invite/${invite.code}`;

}
export async function DiscordIntegration(client: wClient, message: wMessage, intType: string) {
    createTogetherCode(client, message.member.voice.channel.id, intType).then(async (invite) =>
        message.channel.send(invite).then(async (msg) => setTimeout(async () => msg.deletable ? msg.delete() : null, 25e3)));
}