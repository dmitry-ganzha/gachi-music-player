"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunPlayer = exports.AudioPlayer = exports.StatusPlayerHasSkipped = void 0;
const Helper_1 = require("./Helper");
const MessageEmitter_1 = require("../Events/Message/MessageEmitter");
const voice_1 = require("@discordjs/voice");
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
exports.StatusPlayerHasSkipped = new Set(['playing', 'paused', 'buffering', 'autopaused']);
const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);
class AudioPlayer extends tiny_typed_emitter_1.TypedEmitter {
    constructor() {
        super();
        this.subscribers = [];
        this.checkPlayable = () => {
            if (this.state.status === "idle" || this.state.status === "buffering")
                return false;
            if (!this.state.resource.readable) {
                this.state = { status: "idle" };
                return false;
            }
            return true;
        };
        this.play = (resource) => {
            const onStreamError = (error) => {
                if (this.state.status !== "idle")
                    void this.emit('error', error);
                if (this.state.status !== "idle" && this.state.resource === resource)
                    this.state = { status: "idle" };
            };
            if (resource.started)
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
                void ['end', 'close', 'finish'].map((event) => resource.playStream.once(event, onFailureCallback));
                this.state = { status: "buffering", resource, onReadableCallback, onFailureCallback, onStreamError };
            }
            return;
        };
        this.pause = () => {
            if (this.state.status !== "playing")
                return false;
            this.state = { ...this.state, status: "paused" };
            return true;
        };
        this.unpause = () => {
            if (this.state.status !== "paused")
                return false;
            this.state = { ...this.state, status: "playing" };
            return true;
        };
        this.stop = (force = false) => {
            if (this.state.status === "idle")
                return false;
            if (force || this.state.resource.silencePaddingFrames === 0)
                this.state = { status: "idle" };
            else if (this.state.resource.silenceRemaining === -1)
                this.state.resource.silenceRemaining = this.state.resource.silencePaddingFrames;
            return true;
        };
        this.subscribe = (connection) => {
            const existingSubscription = this.subscribers.find((subscription) => subscription.connection === connection);
            if (!existingSubscription) {
                const subscription = new voice_1.PlayerSubscription(connection, this);
                this.subscribers.push(subscription);
                setImmediate(() => this.emit('subscribe', subscription));
                return subscription;
            }
            return existingSubscription;
        };
        this.unsubscribe = (subscription) => {
            const index = this.subscribers.indexOf(subscription);
            const exists = index !== -1;
            if (exists) {
                this.subscribers.splice(index, 1);
                subscription.connection.setSpeaking(false);
                this.emit('unsubscribe', subscription);
            }
            return exists;
        };
        this._sendPacket = () => {
            if (this.state.status === "idle" || this.state.status === "buffering")
                return;
            const Receivers = this.PlayableVoiceChannels;
            if (this.state.status === "autoPaused" && Receivers.length > 0)
                this.state = { ...this.state, status: "playing" };
            if (this.state.status === "paused" || this.state.status === "autoPaused")
                return;
            if (Receivers.length === 0) {
                this.state = { ...this.state, status: "autoPaused" };
                return;
            }
            if (this.state.status === "playing") {
                const packet = this.state.resource.read();
                if (packet)
                    this._playPacket(packet, Receivers);
                else {
                    this._signalStopSpeaking();
                    this.stop();
                }
            }
        };
        this._signalStopSpeaking = () => this.subscribers.forEach(({ connection }) => connection.setSpeaking(false));
        this._playPacket = (packet, receivers) => receivers.forEach((connection) => connection.playOpusPacket(packet));
        this._state = { status: "idle" };
        this.behaviors = { noSubscriber: "paused" };
    }
    get PlayableVoiceChannels() { return this.subscribers.filter(({ connection }) => connection.state.status === "ready").map(({ connection }) => connection); }
    ;
    get state() { return this._state; }
    ;
    set state(newState) {
        const OldState = this._state;
        const newResource = newState?.resource;
        if (OldState.status !== "idle" && OldState.resource !== newResource)
            setImmediate(() => OldState.resource.destroy().catch(() => undefined));
        if (newState.status === "idle") {
            this._signalStopSpeaking();
            (0, Helper_1.deleteAudioPlayer)(this);
        }
        if (newResource)
            (0, Helper_1.addAudioPlayer)(this);
        const isNewResources = OldState.status !== "idle" && newState.status === "playing" && OldState.resource !== newState.resource;
        this._state = newState;
        if (OldState.status !== newState.status || isNewResources) {
            this._signalStopSpeaking();
            this._playPacket(SILENCE_FRAME, this.PlayableVoiceChannels);
            this.emit(newState.status, OldState, this._state);
        }
    }
    ;
    ;
}
exports.AudioPlayer = AudioPlayer;
class RunPlayer extends AudioPlayer {
    constructor(msg) {
        super();
        this.seek = async (message, seek = 0) => {
            const queue = message.client.queue.get(message.guild.id);
            let stream;
            try {
                stream = await CreateResource(message, seek);
            }
            finally {
                CheckReadableStream(queue, stream, seek);
            }
        };
        try {
            this.on("idle", async () => onIdlePlayer(msg));
            this.on("buffering", async () => onBufferingPlayer(msg));
            this.on("autoPaused", async () => onAutoPausePlayer(msg));
        }
        catch (e) {
            this.emit("error", e);
        }
        this.on("error", async (err) => onErrorPlayer(err, msg));
        this.setMaxListeners(4);
    }
    set playingTime(time) { this.state.resource.playbackDuration = time; }
    ;
    ;
}
exports.RunPlayer = RunPlayer;
_a = RunPlayer;
RunPlayer.playStream = async (message) => {
    const { client, guild } = message;
    const queue = client.queue.get(guild.id);
    let stream;
    if (queue.songs?.length === 0)
        return void queue.events.queue.emit('DestroyQueue', queue, message);
    try {
        stream = await CreateResource(message);
    }
    finally {
        client.console(`[${guild.id}]: [${queue.songs[0].type}]: [${queue.songs[0].title}]`);
        CheckReadableStream(queue, stream, 0, true);
    }
};
function CheckReadableStream(queue, stream, seek = 0, sendMessage = false) {
    if (!stream)
        return void queue.player.emit('error', 'Error: AudioResource has not found');
    if (stream?.ended)
        return void queue.player.emit('error', `[AudioPlayer]: [Message: Fail to load a ended stream]`);
    if (!stream?.readable)
        return setTimeout(() => CheckReadableStream, 50);
    let QueueFunctions = [queue.player.play(stream)];
    if (sendMessage)
        QueueFunctions.push(queue.events.message.PlaySongMessage(queue.channels.message));
    Promise.all(QueueFunctions).catch((err) => new Error(`[AudioPlayer]: [Message: Fail to promise.all] [Reason]: ${err}`));
    if (seek)
        queue.player.playingTime = seek * 1000;
}
async function CreateResource(message, seek = 0) {
    const queue = message.client.queue.get(message.guild.id);
    const song = queue.songs[0];
    if (!song.format?.url)
        await Promise.all([(0, Helper_1.FindResource)(song)]);
    if (song.isLive)
        return new Helper_1.FFmpegStream(song.format.url, null);
    return new Helper_1.FFmpegStream(song.format.url, { ...queue.audioFilters, seek });
}
async function onIdlePlayer(message) {
    const { client, guild } = message;
    const queue = client.queue.get(guild.id);
    if (!queue || queue?.songs?.length <= 0)
        return null;
    setTimeout(() => {
        isRemoveSong(queue);
        if (queue.options.random)
            return Shuffle(message, queue);
        return RunPlayer.playStream(message);
    }, 750);
}
async function onErrorPlayer(err, message) {
    const queue = message.client.queue.get(message.guild.id);
    await (0, MessageEmitter_1.WarningMessage)(message, queue.songs[0], err);
    if (queue.songs.length === 1)
        queue.events.queue.emit("DestroyQueue", queue, message);
    if (queue.songs)
        queue.player.stop();
    return;
}
async function onBufferingPlayer(message) {
    const { client, guild } = message;
    return setTimeout(async () => {
        const queue = client.queue.get(guild.id);
        const song = queue?.songs[0];
        if (!queue)
            return;
        if (queue.player.state.status === 'buffering' && !queue.player.state?.resource?.started && !song.format?.work) {
            console.log(`[Fail load] -> `, song.format?.url);
            await client.Send({ text: `${song.requester}, не удалось включить эту песню! Пропуск!`, message: queue.channels.message });
            queue.player.stop();
            return;
        }
    }, 15e3);
}
async function onAutoPausePlayer(message) {
    const { channels, player } = message.client.queue.get(message.guild.id);
    if (!channels.connection?.subscribe)
        channels.connection.subscribe = player;
}
function isRemoveSong({ options, songs }) {
    if (options.loop === "song")
        return null;
    else if (options.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    }
    else
        songs.shift();
    return null;
}
function Shuffle(message, { songs }) {
    const set = Math.floor(Math.random() * songs.length);
    const LocalQueue2 = songs[set];
    songs[set] = songs[0];
    songs[0] = LocalQueue2;
    return RunPlayer.playStream(message);
}
