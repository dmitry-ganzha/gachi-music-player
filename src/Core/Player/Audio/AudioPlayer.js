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
var _AudioPlayer_instances, _AudioPlayer__state, _AudioPlayer_subscribers, _AudioPlayer_CurrentTime_set, _AudioPlayer_VoiceChannels_get, _AudioPlayer_play, _AudioPlayer_signalStopSpeaking, _AudioPlayer_playOpusPacket, _AudioPlayer_onIdlePlayer, _AudioPlayer_onErrorPlayer, _AudioPlayer_onAutoPaused;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioPlayer = exports.StatusPlayerHasSkipped = void 0;
const FindResource_1 = require("./FindResource");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const voice_1 = require("@discordjs/voice");
const ConstructorStream_1 = require("../FFmpeg/ConstructorStream");
const PlayersManager_1 = require("../Manager/PlayersManager");
const VoiceManager_1 = require("../Manager/Voice/VoiceManager");
const MessagePlayer_1 = require("../Manager/MessagePlayer");
exports.StatusPlayerHasSkipped = new Set(['playing', 'paused', 'buffering', 'idle']);
const EmptyFrame = Buffer.from([0xf8, 0xff, 0xfe]);
class AudioPlayer extends tiny_typed_emitter_1.TypedEmitter {
    constructor(msg) {
        super();
        _AudioPlayer_instances.add(this);
        _AudioPlayer__state.set(this, { status: "idle" });
        _AudioPlayer_subscribers.set(this, []);
        this.seek = (message, seek = 0) => {
            const { client, guild } = message;
            const queue = client.queue.get(guild.id);
            setImmediate(() => CreateResource(queue.songs[0], queue.audioFilters, seek).then((stream) => {
                __classPrivateFieldGet(this, _AudioPlayer_play, "f").call(this, stream);
                if (seek)
                    __classPrivateFieldSet(this, _AudioPlayer_instances, seek, "a", _AudioPlayer_CurrentTime_set);
            }));
        };
        this.PlayCallback = (message) => {
            const { client, guild } = message;
            const queue = client.queue.get(guild.id);
            if (!queue || !queue.songs || !queue.songs.length)
                return void queue?.events?.queue?.emit('DestroyQueue', queue, message);
            setImmediate(() => CreateResource(queue.songs[0], queue.audioFilters).then((stream) => {
                client.console(`[Queue]: [GuildID: ${guild.id}, Type: ${queue.songs[0].type}, Status: Playing]: [${queue.songs[0].title}]`);
                if (stream instanceof ConstructorStream_1.ConstructorStream)
                    (0, MessagePlayer_1.PlaySongMessage)(queue.channels.message);
                return __classPrivateFieldGet(this, _AudioPlayer_play, "f").call(this, stream);
            }));
        };
        this.pause = () => {
            if (this.state.status !== "playing")
                return;
            this.state = { ...this.state, status: "paused" };
        };
        this.resume = () => {
            if (this.state.status !== "paused")
                return;
            this.state = { ...this.state, status: "playing" };
        };
        this.stop = () => {
            if (this.state.status === "idle")
                return;
            this.state = { status: "idle" };
        };
        this.subscribe = (connection) => {
            const FindVoiceChannel = __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").find((sub) => sub.connection === connection);
            if (!FindVoiceChannel) {
                const PlayerSub = new voice_1.PlayerSubscription(connection, this);
                __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").push(PlayerSub);
            }
        };
        this.unsubscribe = (subscription) => {
            if (!subscription)
                return void (__classPrivateFieldSet(this, _AudioPlayer_subscribers, null, "f"));
            const index = __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").indexOf(subscription);
            const FindInIndex = index !== -1;
            if (FindInIndex) {
                __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").splice(index, 1);
                subscription.connection.setSpeaking(false);
            }
        };
        this.CheckStatusPlayer = () => {
            if (this.state.status === "idle" || this.state.status === "buffering" || this.state.status === "paused")
                return;
            const Receivers = __classPrivateFieldGet(this, _AudioPlayer_instances, "a", _AudioPlayer_VoiceChannels_get);
            if (this.state.status === "autoPaused" && Receivers.length > 0)
                this.state = { ...this.state, status: "playing" };
            if (this.state.status === "paused" || this.state.status === "autoPaused") {
                __classPrivateFieldGet(this, _AudioPlayer_playOpusPacket, "f").call(this, EmptyFrame, Receivers);
                __classPrivateFieldGet(this, _AudioPlayer_signalStopSpeaking, "f").call(this);
                return;
            }
            if (Receivers.length === 0)
                return void (this.state = { ...this.state, status: "autoPaused" });
            if (this.state.status === "playing") {
                const packet = this.state.resource?.read();
                if (packet)
                    return __classPrivateFieldGet(this, _AudioPlayer_playOpusPacket, "f").call(this, packet, Receivers);
                __classPrivateFieldGet(this, _AudioPlayer_signalStopSpeaking, "f").call(this);
                this.stop();
            }
        };
        _AudioPlayer_play.set(this, (resource) => {
            if (!resource)
                return void this.emit('error', '[AudioResource]: has not found!');
            if (resource?.ended)
                return void this.emit('error', `[AudioPlayer]: [Message: Fail to load stream]`);
            const onStreamError = (error) => {
                if (this.state.status !== "idle")
                    void this.emit('error', error);
                if (this.state.status !== "idle" && this.state.resource === resource)
                    this.state = { status: "idle" };
            };
            if (resource.hasStarted)
                this.state = { status: "playing", resource, onStreamError };
            else {
                const onReadableCallback = () => {
                    if (this.state.status === "buffering" && this.state.resource === resource)
                        this.state = { status: "playing", resource, onStreamError };
                };
                const onFailureCallback = () => {
                    if (this.state.status === "buffering" && this.state.resource === resource)
                        this.state = { status: "idle" };
                };
                resource.playStream.once('readable', onReadableCallback);
                ['end', 'close', 'finish'].forEach((event) => resource.playStream.once(event, onFailureCallback));
                this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
            }
        });
        _AudioPlayer_signalStopSpeaking.set(this, () => __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").forEach(({ connection }) => connection.setSpeaking(false)));
        _AudioPlayer_playOpusPacket.set(this, (packet, receivers) => receivers.forEach((connection) => connection.playOpusPacket(packet)));
        _AudioPlayer_onIdlePlayer.set(this, (message) => {
            const { client, guild } = message;
            const queue = client.queue.get(guild.id);
            setImmediate(() => {
                setTimeout(() => {
                    if (queue?.songs)
                        isRemoveSong(queue);
                    if (queue?.options?.random)
                        client.queue.swap(0, Math.floor(Math.random() * queue.songs.length), "songs", guild.id);
                    return this.PlayCallback(message);
                }, 700);
            });
        });
        _AudioPlayer_onErrorPlayer.set(this, (err, message) => {
            const queue = message.client.queue.get(message.guild.id);
            (0, MessagePlayer_1.ErrorPlayerMessage)(message, queue.songs[0], err);
            queue.songs.shift();
            return this.PlayCallback(message);
        });
        _AudioPlayer_onAutoPaused.set(this, (message) => {
            const queue = message.client.queue.get(message.guild.id);
            const connection = (0, VoiceManager_1.JoinVoiceChannel)(queue.channels.voice);
            if (__classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").length > 0) {
                const subscribe = __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").find((sub) => sub.connection === connection);
                if (subscribe)
                    this.unsubscribe(subscribe);
            }
            this.subscribe(connection);
            queue.channels.connection = connection;
            if (!this.state.resource.hasStarted)
                return this.seek(message, this.CurrentTime);
        });
        this.destroy = () => {
            if (__classPrivateFieldGet(this, _AudioPlayer_subscribers, "f"))
                __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").forEach(({ connection }) => connection?.destroy());
            this.removeAllListeners();
        };
        this.on("idle", () => __classPrivateFieldGet(this, _AudioPlayer_onIdlePlayer, "f").call(this, msg));
        this.on("error", (err) => __classPrivateFieldGet(this, _AudioPlayer_onErrorPlayer, "f").call(this, err, msg));
        this.on("autoPaused", () => __classPrivateFieldGet(this, _AudioPlayer_onAutoPaused, "f").call(this, msg));
        this.setMaxListeners(3);
    }
    get CurrentTime() {
        if (this.state.resource?.playbackDuration <= 0)
            return 0;
        return parseInt((this.state.resource?.playbackDuration / 1000).toFixed(0));
    }
    ;
    ;
    ;
    get checkPlayable() {
        if (this.state.status === "idle" || this.state.status === "buffering")
            return false;
        if (!this.state.resource?.readable) {
            this.state = { status: "idle" };
            return false;
        }
        return true;
    }
    ;
    get state() { return __classPrivateFieldGet(this, _AudioPlayer__state, "f"); }
    ;
    set state(newState) {
        const OldState = __classPrivateFieldGet(this, _AudioPlayer__state, "f");
        const newResource = newState?.resource;
        if (OldState.status !== "idle" && OldState.resource !== newResource)
            setImmediate(() => OldState.resource.destroy());
        if (newState.status === "idle") {
            __classPrivateFieldGet(this, _AudioPlayer_signalStopSpeaking, "f").call(this);
            (0, PlayersManager_1.deleteAudioPlayer)(this);
        }
        if (newResource)
            (0, PlayersManager_1.addAudioPlayer)(this);
        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        __classPrivateFieldSet(this, _AudioPlayer__state, newState, "f");
        if (OldState.status !== newState.status || isNewResources) {
            __classPrivateFieldGet(this, _AudioPlayer_playOpusPacket, "f").call(this, EmptyFrame, __classPrivateFieldGet(this, _AudioPlayer_instances, "a", _AudioPlayer_VoiceChannels_get));
            void this.emit(newState.status, OldState, __classPrivateFieldGet(this, _AudioPlayer__state, "f"));
        }
    }
    ;
    ;
}
exports.AudioPlayer = AudioPlayer;
_AudioPlayer__state = new WeakMap(), _AudioPlayer_subscribers = new WeakMap(), _AudioPlayer_play = new WeakMap(), _AudioPlayer_signalStopSpeaking = new WeakMap(), _AudioPlayer_playOpusPacket = new WeakMap(), _AudioPlayer_onIdlePlayer = new WeakMap(), _AudioPlayer_onErrorPlayer = new WeakMap(), _AudioPlayer_onAutoPaused = new WeakMap(), _AudioPlayer_instances = new WeakSet(), _AudioPlayer_CurrentTime_set = function _AudioPlayer_CurrentTime_set(time) {
    this.state.resource.playbackDuration = time * 1e3;
}, _AudioPlayer_VoiceChannels_get = function _AudioPlayer_VoiceChannels_get() {
    return __classPrivateFieldGet(this, _AudioPlayer_subscribers, "f").filter(({ connection }) => connection.state.status === "ready").map(({ connection }) => connection);
};
function CreateResource(song, audioFilters = null, seek = 0, req = 0) {
    return new Promise((resolve) => {
        if (req > 4)
            return resolve(null);
        (0, FindResource_1.FindResource)(song).catch(() => {
            req++;
            return CreateResource(song, audioFilters, seek, req);
        }).then(() => {
            if (song.isLive)
                return resolve(new ConstructorStream_1.ConstructorStream({
                    stream: song.format.url
                }));
            return resolve(new ConstructorStream_1.ConstructorStream({
                stream: song.format.url, seek, Filters: audioFilters
            }));
        });
    });
}
function isRemoveSong({ options, songs }) {
    if (options?.loop === "song")
        return;
    else if (options?.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    }
    else
        songs.shift();
}
