# Audio Recorder Web Plugin

A powerful, embeddable audio recording widget with cross-browser compatibility including legacy Internet Explorer support.

![Audio Recorder Demo](https://via.placeholder.com/800x400/1a1a2e/ffffff?text=Audio+Recorder+Plugin)

## Features

- 🎙️ **High Quality Recording** - Records audio using MediaRecorder API with automatic codec selection
- 🌐 **Cross-Browser Support** - Works on Chrome, Firefox, Safari, Edge, and IE 9+ (via Flash fallback)
- 📊 **Live Visualization** - Real-time audio waveform visualization using Web Audio API
- 🎨 **Themeable** - Dark and light themes included, easy to customize
- 📦 **Easy Integration** - Simple drop-in plugin with minimal configuration
- ⬇️ **Export Options** - Download recordings as WAV or WebM files

## Browser Support

| Browser | Version | Method |
|---------|---------|--------|
| Chrome | 47+ | MediaRecorder API |
| Firefox | 25+ | MediaRecorder API |
| Safari | 11+ | MediaRecorder API |
| Edge | 79+ | MediaRecorder API |
| Opera | 36+ | MediaRecorder API |
| IE | 9-11 | Flash Fallback |
| IE | 6-8 | Flash Fallback (with polyfills) |

## Installation

### Option 1: NPM (Recommended)

```bash
npm install audio-recorder-web
```

**ES Modules (React, Vue, Angular, etc.):**

```javascript
import AudioRecorder from 'audio-recorder-web';
import 'audio-recorder-web/dist/audio-recorder.css';

const recorder = new AudioRecorder({
  container: '#my-recorder',
  theme: 'dark'
});
```

**CommonJS:**

```javascript
const AudioRecorder = require('audio-recorder-web');
```

### Option 2: Direct Download / CDN

Download the files and include them in your project:

```html
<!-- Include CSS -->
<link rel="stylesheet" href="path/to/audio-recorder.css">

<!-- Include polyfills for IE support (optional, include before main script) -->
<!--[if lt IE 10]>
<script src="path/to/polyfills.js"></script>
<![endif]-->

<!-- Include JS -->
<script src="path/to/audio-recorder.js"></script>
```

**unpkg CDN:**

```html
<link rel="stylesheet" href="https://unpkg.com/audio-recorder-web/dist/audio-recorder.css">
<script src="https://unpkg.com/audio-recorder-web/dist/audio-recorder.min.js"></script>
```

**jsDelivr CDN:**

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/audio-recorder-web/dist/audio-recorder.css">
<script src="https://cdn.jsdelivr.net/npm/audio-recorder-web/dist/audio-recorder.min.js"></script>
```

## Quick Start

1. Add a container element to your HTML:

```html
<div id="my-recorder"></div>
```

2. Initialize the recorder:

```javascript
var recorder = new AudioRecorder({
  container: '#my-recorder',
  theme: 'dark'
});
```

That's it! The recorder will automatically detect the best recording method for the current browser.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | String/Element | required | CSS selector or DOM element |
| `theme` | String | `'dark'` | Theme: `'dark'` or `'light'` |
| `variant` | String | `'standard'` | UI variant: `'standard'`, `'compact'`, `'minimal'`, or `'mini'` |
| `maxDuration` | Number | `300` | Maximum recording duration in seconds |
| `sampleRate` | Number | `44100` | Audio sample rate |
| `format` | String | `'wav'` | Output format |
| `flashPath` | String | `'flash/recorder.swf'` | Path to Flash fallback SWF |

### Button Visibility Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `showPause` | Boolean | `true` | Show/hide the pause button |
| `showPlay` | Boolean | `true` | Show/hide the play button |
| `showDownload` | Boolean | `true` | Show/hide the download button |
| `showTimer` | Boolean | `true` | Show/hide the timer display |
| `showStatus` | Boolean | `true` | Show/hide the status text |

### Event Callbacks

| Callback | Parameters | Description |
|----------|------------|-------------|
| `onStart` | - | Called when recording starts |
| `onStop` | - | Called when recording stops |
| `onPause` | - | Called when recording is paused |
| `onResume` | - | Called when recording resumes |
| `onData` | `{ blob, url, duration }` | Called when recording data is ready |
| `onError` | `message` | Called when an error occurs |
| `onPermissionGranted` | - | Called when microphone access is granted |
| `onPermissionDenied` | - | Called when microphone access is denied |

## API Methods

### Recording Control

```javascript
recorder.start();     // Start recording
recorder.stop();      // Stop recording
recorder.pause();     // Pause recording
recorder.resume();    // Resume recording
```

### Playback

```javascript
recorder.play();      // Play the recording
```

### Export

```javascript
recorder.download();              // Download with auto-generated filename
recorder.download('my-recording'); // Download with custom filename
```

### Data Access

```javascript
var blob = recorder.getBlob();     // Get the recorded blob
var url = recorder.getUrl();       // Get the blob URL
var duration = recorder.getDuration(); // Get duration in seconds
```

### Utility

```javascript
recorder.reset();     // Reset the recorder
recorder.destroy();   // Clean up and remove
```

### Static Methods

```javascript
AudioRecorder.isSupported();      // Check if recording is supported
AudioRecorder.getCapabilities();  // Get detailed capability info
```

## Full Example

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="audio-recorder.css">
</head>
<body>
  <div id="recorder"></div>
  
  <script src="audio-recorder.js"></script>
  <script>
    var recorder = new AudioRecorder({
      container: '#recorder',
      theme: 'dark',
      maxDuration: 180,
      onStart: function() {
        console.log('Recording started!');
      },
      onStop: function() {
        console.log('Recording stopped!');
      },
      onData: function(data) {
        console.log('Recording ready!', data.blob);
        console.log('Duration:', data.duration, 'seconds');
        
        // Upload to server
        var formData = new FormData();
        formData.append('audio', data.blob, 'recording.wav');
        
        fetch('/upload', {
          method: 'POST',
          body: formData
        });
      },
      onError: function(error) {
        console.error('Recording error:', error);
      }
    });
  </script>
</body>
</html>
```

## Variant Examples

### Mini Recorder

Perfect for embedding in forms or tight spaces:

```javascript
var recorder = new AudioRecorder({
  container: '#recorder',
  variant: 'mini',
  theme: 'dark',
  maxDuration: 60
});
```

### Record-Only (Simplified)

Hide all buttons except record and stop for simple voice capture:

```javascript
var recorder = new AudioRecorder({
  container: '#recorder',
  variant: 'mini',
  showPause: false,
  showPlay: false,
  showDownload: false,
  showTimer: false
});
```

### Compact with Custom Buttons

```javascript
var recorder = new AudioRecorder({
  container: '#recorder',
  variant: 'compact',
  showDownload: false,
  onData: function(data) {
    uploadToServer(data.blob);
  }
});
```

## Styling

### Custom Themes

You can customize the appearance using CSS variables:

```css
.ar-recorder {
  --ar-bg-primary: #1a1a2e;
  --ar-bg-secondary: #16213e;
  --ar-text-primary: #ffffff;
  --ar-text-secondary: #a0a0b0;
  --ar-accent: #ff6b6b;
  --ar-success: #48dbfb;
  --ar-warning: #feca57;
  --ar-border: #2d2d44;
  --ar-radius: 12px;
}
```

### Size Variants

Add these classes to the recorder container for different sizes:

```html
<!-- Compact -->
<div id="recorder" class="ar-recorder-compact"></div>

<!-- Minimal (no visualizer) -->
<div id="recorder" class="ar-recorder-minimal"></div>
```

## Flash Fallback (Legacy IE)

For Internet Explorer 9-11 and older browsers, the plugin uses a Flash fallback.

### Setup

1. Compile the Flash source (`flash/AudioRecorder.as`) to `flash/recorder.swf`
2. Place `recorder.swf` in your project
3. Set the `flashPath` option:

```javascript
var recorder = new AudioRecorder({
  container: '#recorder',
  flashPath: '/path/to/recorder.swf'
});
```

### Compiling Flash

You'll need Adobe Animate or Flash Professional CS6+ to compile the ActionScript file:

1. Create a new ActionScript 3.0 project
2. Import `flash/AudioRecorder.as`
3. Set the document class to `AudioRecorder`
4. Publish as `recorder.swf`

## Security Notes

- The plugin requires HTTPS in production for microphone access (except localhost)
- Flash fallback requires proper crossdomain.xml configuration for cross-origin usage
- Always handle the `onPermissionDenied` callback gracefully

## Troubleshooting

### "Permission denied" error
- Ensure your site is served over HTTPS
- Check browser settings for microphone permissions

### No audio recorded
- Check microphone is properly connected
- Test microphone in system settings

### Flash not working
- Ensure Flash Player is installed and enabled
- Check Flash path configuration
- Verify SWF is accessible

### IE compatibility issues
- Include polyfills.js before audio-recorder.js
- Ensure proper DOCTYPE declaration

## License

MIT License - feel free to use in personal and commercial projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.0.0
- Initial release
- MediaRecorder API support
- Web Audio API fallback
- Flash fallback for legacy browsers
- Dark and light themes
- Live audio visualization
