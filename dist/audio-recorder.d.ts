declare module 'audio-recorder-web' {
  export interface AudioRecorderOptions {
    container: string | HTMLElement;
    theme?: 'dark' | 'light';
    variant?: 'standard' | 'compact' | 'minimal' | 'mini' | 'button';
    maxDuration?: number;
    sampleRate?: number;
    bitRate?: number;
    format?: 'wav' | 'webm' | 'mp3';
    flashPath?: string;
    showPause?: boolean;
    showPlay?: boolean;
    showDownload?: boolean;
    showTimer?: boolean;
    showStatus?: boolean;
    showSettings?: boolean;
    liveVisualization?: boolean;
    onStart?: () => void;
    onStop?: () => void;
    onPause?: () => void;
    onResume?: () => void;
    onData?: (data: AudioRecorderData) => void;
    onError?: (error: string) => void;
    onPermissionGranted?: () => void;
    onPermissionDenied?: () => void;
    onDeviceChange?: (deviceId: string | null, label: string) => void;
  }

  export interface AudioRecorderData {
    blob: Blob;
    url: string;
    duration: number;
  }

  export interface AudioRecorderCapabilities {
    mediaRecorder: boolean;
    getUserMedia: boolean;
    legacyGetUserMedia: boolean;
    audioContext: boolean;
    flash: boolean;
  }

  export interface AudioDevice {
    deviceId: string | null;
    label: string;
  }

  export default class AudioRecorder {
    constructor(options: AudioRecorderOptions);

    readonly isRecording: boolean;
    readonly isPaused: boolean;
    readonly duration: number;

    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    play(): void;
    download(filename?: string): void;
    getBlob(): Blob | null;
    getUrl(): string | null;
    getDuration(): number;
    reset(): void;
    destroy(): void;
    getSelectedDevice(): AudioDevice;
    setDevice(deviceId: string | null): void;

    static isSupported(): boolean;
    static getCapabilities(): AudioRecorderCapabilities;
  }
}

export = AudioRecorder;
export as namespace AudioRecorder;
