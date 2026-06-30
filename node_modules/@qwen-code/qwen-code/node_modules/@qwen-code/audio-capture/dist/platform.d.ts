/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */
export type NativeAudioBackendName = 'coreaudio' | 'alsa-pulse' | 'wasapi';
export declare function getPlatformBackendName(platform?: NodeJS.Platform): NativeAudioBackendName;
