"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _Voice_Timer, _Voice_state, _Voice_onStartQueueDestroy, _Voice_onCancelQueueDestroy;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Voice = exports.JoinVoiceChannel = exports.Disconnect = void 0;
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const LiteUtils_1 = require("../../../Utils/LiteUtils");
function Disconnect(GuildID) {
    const connection = (0, voice_1.getVoiceConnection)(GuildID);
    if (connection)
        connection.disconnect();
}
exports.Disconnect = Disconnect;
function JoinVoiceChannel({ id, guild, type }) {
    const VoiceChannel = (0, voice_1.joinVoiceChannel)({
        selfDeaf: true,
        selfMute: false,
        channelId: id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
    });
    SpeakStateChannel((0, LiteUtils_1.getMe)(guild), type);
    return VoiceChannel;
}
exports.JoinVoiceChannel = JoinVoiceChannel;
function SpeakStateChannel(me, type) {
    if (type === discord_js_1.ChannelType.GuildStageVoice && me)
        me?.voice?.setRequestToSpeak(true).catch(() => undefined);
}
class Voice extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        _Voice_Timer.set(this, void 0);
        _Voice_state.set(this, void 0);
        _Voice_onStartQueueDestroy.set(this, (queue) => {
            if (!queue)
                return null;
            const { player, events, channels } = queue;
            if (!__classPrivateFieldGet(this, _Voice_Timer, "f"))
                __classPrivateFieldSet(this, _Voice_Timer, setTimeout(() => events.queue.emit('DestroyQueue', queue, channels.message, false), 15e3), "f");
            player.pause();
            __classPrivateFieldSet(this, _Voice_state, true, "f");
        });
        _Voice_onCancelQueueDestroy.set(this, (player) => {
            if (__classPrivateFieldGet(this, _Voice_state, "f")) {
                __classPrivateFieldSet(this, _Voice_state, false, "f");
                if (__classPrivateFieldGet(this, _Voice_Timer, "f"))
                    clearTimeout(__classPrivateFieldGet(this, _Voice_Timer, "f"));
                player.resume();
            }
        });
        this.destroy = () => {
            clearTimeout(__classPrivateFieldGet(this, _Voice_Timer, "f"));
            this.removeAllListeners();
        };
        this.on('StartQueueDestroy', __classPrivateFieldGet(this, _Voice_onStartQueueDestroy, "f"));
        this.on('CancelQueueDestroy', __classPrivateFieldGet(this, _Voice_onCancelQueueDestroy, "f"));
        this.setMaxListeners(2);
    }
    ;
}
exports.Voice = Voice;
_Voice_Timer = new WeakMap(), _Voice_state = new WeakMap(), _Voice_onStartQueueDestroy = new WeakMap(), _Voice_onCancelQueueDestroy = new WeakMap();
