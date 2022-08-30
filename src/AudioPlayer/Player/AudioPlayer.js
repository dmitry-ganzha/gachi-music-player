"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioPlayer = exports.StatusPlayerHasSkipped = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const Decoder_1 = require("../Structures/Media/Decoder");
const MessagePlayer_1 = require("../Manager/MessagePlayer");
const PlayerManager_1 = require("../Manager/PlayerManager");
exports.StatusPlayerHasSkipped = new Set(["playing", "paused", "buffering", "idle"]);
const SilentFrame = Buffer.from([0xf8, 0xff, 0xfe]);
class AudioPlayer extends tiny_typed_emitter_1.TypedEmitter {
    #_state = { status: "idle" };
    #_voices = [];
    get playbackDuration() {
        if (this.state.stream?.duration <= 0)
            return 0;
        return parseInt((this.state.stream?.duration / 1000).toFixed(0));
    }
    ;
    set playbackDuration(time) {
        this.state.stream.duration = time * 1e3;
    }
    ;
    set state(newState) {
        const oldState = this.#_state;
        const isNewResources = oldState.status !== "idle" && newState.status === "playing" && oldState.stream !== newState.stream;
        if (this.#_state.status === newState.status && isNewResources) {
            this.emit("error", "[AudioPlayer]: TypedError: Loop status. Reason: skip this song!");
            return;
        }
        this.#_state = newState;
        if (oldState.status === "playing" && newState.status === "idle" || oldState.status !== "idle" && oldState.stream !== newState.stream) {
            if (newState.status !== "paused") {
                oldState.stream.destroy();
                delete oldState.stream;
            }
        }
        if (newState.status === "idle") {
            this.#signalStopSpeaking();
            PlayerManager_1.PlayersManager.toRemove(this);
        }
        if (newState.stream)
            PlayerManager_1.PlayersManager.toPush(this);
        if (oldState.status !== newState.status || isNewResources) {
            this.#sendPackets(SilentFrame);
            this.emit(newState.status, oldState, newState);
        }
    }
    ;
    get state() {
        return this.#_state;
    }
    ;
    pause = () => {
        if (this.state.status !== "playing")
            return;
        this.state = { ...this.state, status: "paused" };
    };
    resume = () => {
        if (this.state.status !== "paused")
            return;
        this.state = { ...this.state, status: "playing" };
    };
    stop = () => {
        if (this.state.status === "idle")
            return;
        this.state = { status: "idle" };
    };
    subscribe = (connection) => {
        const FindVoiceChannel = this.#_voices?.find((sub) => sub === connection);
        if (!FindVoiceChannel)
            this.#_voices.push(connection);
    };
    unsubscribe = (subscription) => {
        const index = this.#_voices.indexOf(subscription.connection);
        if (index !== -1) {
            this.#_voices.splice(index, 1);
            subscription.connection.setSpeaking(false);
        }
    };
    play = (queue, seek = 0) => {
        const message = queue.channels.message;
        const { client, guild } = message;
        const song = queue?.songs[0];
        if (song) {
            song.resource(seek, queue.audioFilters).then((stream) => {
                this.#readStream(stream);
                if (!seek) {
                    client.console(`[GuildID: ${guild.id}]: ${song.title}`);
                    if (stream instanceof Decoder_1.Decoder.All)
                        MessagePlayer_1.MessagePlayer.toPlay(message);
                }
                else
                    this.playbackDuration = seek;
            });
        }
        else if (queue)
            queue.cleanup();
    };
    CheckStatusPlayer = () => {
        const state = this.state;
        if (state.status === "idle" || state.status === "buffering" || state.status === "paused")
            return;
        if (this.#_voices.length === 0) {
            this.state = { ...this.state, status: "autoPaused" };
            return;
        }
        else if (this.state.status === "autoPaused" && this.#_voices.length > 0) {
            this.state = { ...this.state, status: "playing", stream: this.state.stream };
        }
        if (state.status === "autoPaused") {
            this.#sendPackets(SilentFrame);
            this.#signalStopSpeaking();
            return;
        }
        if (this.state.status === "playing") {
            const packet = this.state.stream?.read();
            if (packet)
                return this.#sendPackets(packet);
            this.#signalStopSpeaking();
            this.stop();
        }
    };
    #readStream = (stream) => {
        if (!stream)
            return void this.emit("error", "[AudioPlayer]: stream is null");
        if (stream.hasStarted)
            this.state = { status: "playing", stream };
        else {
            const onReadableCallback = () => {
                if (this.state.status === "buffering" && this.state.stream === stream)
                    this.state = { status: "playing", stream };
            };
            const onFailureCallback = () => {
                if (this.state.status === "buffering" && this.state.stream === stream)
                    this.state = { status: "idle" };
            };
            stream.once("readable", onReadableCallback);
            ["end", "close", "finish"].forEach((event) => stream.once(event, onFailureCallback));
            this.state = { status: "buffering", stream };
        }
    };
    #sendPackets = (paket) => {
        const VoiceChannels = this.#_voices.filter((connection) => connection.state.status === "ready");
        VoiceChannels.forEach((connection) => connection.playOpusPacket(paket));
    };
    #signalStopSpeaking = () => this.#_voices.forEach((connection) => connection.setSpeaking(false));
}
exports.AudioPlayer = AudioPlayer;
