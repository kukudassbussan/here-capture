/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
export type MicrophoneAuthorizationStatus = 'granted' | 'denied' | 'prompt' | 'unknown';
export interface AudioCaptureOptions {
    sampleRate: number;
    channels: number;
    /** Flag sustained silence so the caller can auto-stop (tap mode). */
    silenceDetection?: boolean;
}
export interface NativeAudioCaptureBackend {
    startRecording: (options: AudioCaptureOptions) => void;
    stopRecording: () => Uint8Array;
    isRecording: () => boolean;
    /** True once sustained silence was detected. Absent on older addons. */
    silenceDetected?: () => boolean;
    /** Return & clear PCM captured since the last call (for streaming uploads). */
    drainAudio?: () => Uint8Array;
    /** Recent input level 0..1 (for waveform display). */
    audioLevel?: () => number;
    microphoneAuthorizationStatus: () => MicrophoneAuthorizationStatus;
}
interface NativeBinding {
    startRecording: (options?: Partial<AudioCaptureOptions>) => void;
    stopRecording: () => Uint8Array;
    isRecording: () => boolean;
    silenceDetected?: () => boolean;
    drainAudio?: () => Uint8Array;
    audioLevel?: () => number;
    microphoneAuthorizationStatus?: () => MicrophoneAuthorizationStatus;
}
export declare function createNativeAudioCaptureBackend(binding?: NativeBinding): NativeAudioCaptureBackend;
export { getPlatformBackendName } from './platform.js';
