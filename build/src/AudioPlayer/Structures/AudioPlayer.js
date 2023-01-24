"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioPlayer = void 0;
const tiny_typed_emitter_1 = require("tiny-typed-emitter");
const _OpusAudio_1 = require("@OpusAudio");
const CycleStep_1 = require("@Managers/Players/CycleStep");
const NotSkippedStatuses = ["read", "pause", "autoPause"];
const UpdateMessage = ["idle", "pause", "autoPause"];
class AudioPlayer extends tiny_typed_emitter_1.TypedEmitter {
    _voice;
    _state = { status: "idle" };
    get streamDuration() { return this.state?.stream?.duration ?? 0; }
    ;
    get voice() { return this._voice; }
    ;
    set voice(voice) { this._voice = voice; }
    ;
    get state() { return this._state; }
    ;
    set state(state) {
        const oldState = this._state;
        const oldStatus = oldState.status, newStatus = state.status;
        if (isDestroy(oldState, state)) {
            oldState.stream.opus.removeAllListeners();
            oldState.stream.opus.destroy();
            oldState.stream.opus.read();
            oldState.stream.destroy();
        }
        delete this._state;
        this._state = state;
        if (oldStatus !== newStatus || oldStatus !== "idle" && newStatus === "read") {
            CycleStep_1.PlayerCycle.toRemove(this);
            this.sendPacket();
            this.emit(newStatus);
        }
        CycleStep_1.PlayerCycle.toPush(this);
    }
    ;
    get hasSkipped() { return NotSkippedStatuses.includes(this.state.status); }
    ;
    get hasUpdate() { return UpdateMessage.includes(this.state.status); }
    ;
    pause = () => {
        if (this.state.status !== "read")
            return;
        this.state = { ...this.state, status: "pause" };
    };
    resume = () => {
        if (this.state.status !== "pause")
            return;
        this.state = { ...this.state, status: "read" };
    };
    stop = () => {
        if (this.state.status === "idle")
            return;
        this.state = { status: "idle" };
    };
    readStream = (url, options) => {
        if (!url)
            return void this.emit("error", new Error(`Link to resource, not found`), true);
        const stream = new _OpusAudio_1.OpusAudio(url, options);
        if (!stream)
            return void this.emit("error", new Error(`Stream is null`), true);
        if (stream.readable)
            this.state = { status: "read", stream };
        else {
            stream.opus.once("readable", () => {
                this.sendPacket();
                this.state = { status: "read", stream };
            });
            stream.opus.once("error", () => this.emit("error", new Error("Fail read stream"), true));
        }
    };
    sendPacket = (packet = Buffer.from([0xf8, 0xff, 0xfe, 0xfae])) => {
        const voiceConnection = this.voice;
        if (packet && voiceConnection.state.status === "ready")
            voiceConnection.playOpusPacket(packet);
        else
            voiceConnection.setSpeaking(false);
    };
    preparePacket = () => {
        const state = this.state;
        if (state?.status === "pause" || state?.status === "idle" || !state?.status)
            return;
        if (!this.voice) {
            this.state = { ...state, status: "pause" };
            return;
        }
        else if (state.status === "autoPause") {
            this.state = { ...state, status: "read", stream: state.stream };
        }
        if (state.status === "autoPause")
            return;
        if (state.status === "read") {
            const packet = state.stream?.read();
            if (packet)
                this.sendPacket(packet);
            else
                this.stop();
        }
    };
    destroy = () => {
        this.removeAllListeners();
        this.stop();
        delete this._voice;
        delete this._state;
        CycleStep_1.PlayerCycle.toRemove(this);
    };
}
exports.AudioPlayer = AudioPlayer;
function isDestroy(oldS, newS) {
    if (!oldS.stream || oldS.stream?.destroyed)
        return false;
    if ((oldS.status === "read" && newS.status === "pause" || oldS.status === "pause" && newS.status === "read") && oldS.stream === newS.stream)
        return false;
    else if (oldS.status !== "idle" && newS.status === "read")
        return true;
    else if (oldS.status === "read" && newS.status === "idle")
        return true;
    return false;
}
