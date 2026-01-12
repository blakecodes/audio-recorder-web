(function(global) {
  'use strict';

  var STORAGE_KEY = 'audioRecorder_selectedDevice';

  var AudioRecorder = function(options) {
    this.options = this._extend({
      container: null,
      maxDuration: 300,
      sampleRate: 44100,
      bitRate: 128,
      format: 'wav',
      flashPath: 'flash/recorder.swf',
      onStart: function() {},
      onStop: function() {},
      onPause: function() {},
      onResume: function() {},
      onData: function() {},
      onError: function() {},
      onPermissionGranted: function() {},
      onPermissionDenied: function() {},
      onDeviceChange: function() {},
      theme: 'dark',
      variant: 'standard',
      showPause: true,
      showPlay: true,
      showDownload: true,
      showTimer: true,
      showStatus: true,
      showSettings: true,
      liveVisualization: true
    }, options || {});

    this.isRecording = false;
    this.isPaused = false;
    this.duration = 0;
    this.audioContext = null;
    this.mediaStream = null;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.selectedDeviceId = this._loadDeviceFromStorage();
    this.audioDevices = [];
    this.recordingMode = null;
    this.timerInterval = null;
    this.analyser = null;
    this.dataArray = null;
    this.animationFrame = null;
    this.previewStream = null;
    this.previewAnimationFrame = null;
    this.previewAnalyser = null;
    this.previewDataArray = null;

    this._detectCapabilities();
    this._init();
  };

  AudioRecorder.prototype._extend = function(target, source) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
    return target;
  };

  AudioRecorder.prototype._detectCapabilities = function() {
    var nav = navigator;
    
    this.hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    this.hasGetUserMedia = !!(nav.mediaDevices && nav.mediaDevices.getUserMedia);
    this.hasLegacyGetUserMedia = !!(nav.getUserMedia || nav.webkitGetUserMedia || 
      nav.mozGetUserMedia || nav.msGetUserMedia);
    this.hasAudioContext = !!(global.AudioContext || global.webkitAudioContext);
    this.hasFlash = this._detectFlash();

    if (this.hasMediaRecorder && this.hasGetUserMedia) {
      this.recordingMode = 'mediarecorder';
    } else if (this.hasAudioContext && (this.hasGetUserMedia || this.hasLegacyGetUserMedia)) {
      this.recordingMode = 'webaudio';
    } else if (this.hasFlash) {
      this.recordingMode = 'flash';
    } else {
      this.recordingMode = 'none';
    }
  };

  AudioRecorder.prototype._detectFlash = function() {
    var hasFlash = false;
    try {
      var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      if (fo) hasFlash = true;
    } catch (e) {
      if (navigator.mimeTypes && 
          navigator.mimeTypes['application/x-shockwave-flash'] !== undefined &&
          navigator.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
        hasFlash = true;
      }
    }
    return hasFlash;
  };

  AudioRecorder.prototype._init = function() {
    if (!this.options.container) {
      throw new Error('AudioRecorder: container option is required');
    }

    var container = typeof this.options.container === 'string' 
      ? document.querySelector(this.options.container) 
      : this.options.container;

    if (!container) {
      throw new Error('AudioRecorder: container element not found');
    }

    this.container = container;
    this._createUI();
    this._bindEvents();

    if (this.recordingMode === 'flash') {
      this._initFlash();
    }
  };

  AudioRecorder.prototype._createUI = function() {
    var opts = this.options;
    var isMini = opts.variant === 'mini';
    var isMinimal = opts.variant === 'minimal';
    var isButton = opts.variant === 'button';
    var variantClass = opts.variant !== 'standard' ? ' ar-variant-' + opts.variant : '';
    
    var html = ['<div class="ar-recorder ar-theme-' + opts.theme + variantClass + '">'];
    
    if (isButton) {
      html.push('  <div class="ar-button-wrapper">');
      html.push('    <button class="ar-btn-single" type="button" title="Click to record">');
      html.push('      <div class="ar-btn-single-icon">');
      html.push('        <svg class="ar-icon-mic" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>');
      html.push('        <svg class="ar-icon-stop" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>');
      html.push('      </div>');
      html.push('      <div class="ar-btn-single-content">');
      html.push('        <span class="ar-btn-single-label">Record</span>');
      html.push('        <span class="ar-btn-single-timer">00:00</span>');
      html.push('      </div>');
      html.push('      <div class="ar-btn-single-level"><div class="ar-btn-single-level-bar"></div></div>');
      html.push('    </button>');
      if (opts.showSettings) {
        html.push('    <div class="ar-settings-wrapper">');
        html.push('      <button class="ar-btn ar-btn-settings" type="button" title="Audio Settings">');
        html.push('        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>');
        html.push('      </button>');
        html.push('      <div class="ar-settings-panel">');
        html.push('        <div class="ar-settings-header">');
        html.push('          <span>Audio Input</span>');
        html.push('          <button class="ar-settings-close" type="button">&times;</button>');
        html.push('        </div>');
        html.push('        <div class="ar-settings-content">');
        html.push('          <select class="ar-device-select"><option value="">Default Microphone</option></select>');
        html.push('        </div>');
        html.push('      </div>');
        html.push('    </div>');
      }
      html.push('  </div>');
    } else if (isMini) {
      html.push('  <div class="ar-mini-wrapper">');
      html.push('    <div class="ar-level-indicator"><div class="ar-level-bar"></div></div>');
    } else if (!isMinimal) {
      html.push('  <div class="ar-visualizer">');
      html.push('    <canvas class="ar-canvas"></canvas>');
      if (opts.showStatus) {
        html.push('    <div class="ar-status"><span class="ar-status-text">Ready</span></div>');
      }
      if (opts.showSettings) {
        html.push('    <div class="ar-settings-wrapper ar-settings-overlay">');
        html.push('      <button class="ar-btn ar-btn-settings" type="button" title="Audio Settings">');
        html.push('        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>');
        html.push('      </button>');
        html.push('      <div class="ar-settings-panel">');
        html.push('        <div class="ar-settings-header">');
        html.push('          <span>Audio Input</span>');
        html.push('          <button class="ar-settings-close" type="button">&times;</button>');
        html.push('        </div>');
        html.push('        <div class="ar-settings-content">');
        html.push('          <select class="ar-device-select"><option value="">Default Microphone</option></select>');
        html.push('        </div>');
        html.push('      </div>');
        html.push('    </div>');
      }
      html.push('  </div>');
    }
    
    if (!isButton) {
      if (opts.showTimer && !isMini) {
        html.push('  <div class="ar-timer">00:00</div>');
      }
      
      html.push('  <div class="ar-controls">');
      html.push('    <button class="ar-btn ar-btn-record" type="button" title="Record">');
      html.push('      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>');
      html.push('    </button>');
      
      if (opts.showPause) {
        html.push('    <button class="ar-btn ar-btn-pause" type="button" title="Pause" disabled>');
        html.push('      <svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>');
        html.push('    </button>');
      }
      
      html.push('    <button class="ar-btn ar-btn-stop" type="button" title="Stop" disabled>');
      html.push('      <svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12"/></svg>');
      html.push('    </button>');
      
      if (opts.showPlay) {
        html.push('    <button class="ar-btn ar-btn-play" type="button" title="Play" disabled>');
        html.push('      <svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>');
        html.push('    </button>');
      }
      
      if (opts.showDownload) {
        html.push('    <button class="ar-btn ar-btn-download" type="button" title="Download" disabled>');
        html.push('      <svg viewBox="0 0 24 24"><path d="M12 16l-6-6h4V4h4v6h4l-6 6z"/><path d="M4 18h16v2H4z"/></svg>');
        html.push('    </button>');
      }
      
      if (opts.showSettings && (isMini || isMinimal)) {
        html.push('    <div class="ar-settings-wrapper">');
        html.push('      <button class="ar-btn ar-btn-settings" type="button" title="Audio Settings">');
        html.push('        <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>');
        html.push('      </button>');
        html.push('      <div class="ar-settings-panel">');
        html.push('        <div class="ar-settings-header">');
        html.push('          <span>Audio Input</span>');
        html.push('          <button class="ar-settings-close" type="button">&times;</button>');
        html.push('        </div>');
        html.push('        <div class="ar-settings-content">');
        html.push('          <select class="ar-device-select"><option value="">Default Microphone</option></select>');
        html.push('        </div>');
        html.push('      </div>');
        html.push('    </div>');
      }
      
      html.push('  </div>');
      
      if (isMini) {
        if (opts.showTimer) {
          html.push('    <div class="ar-timer ar-mini-timer">00:00</div>');
        }
        html.push('  </div>');
      }
    }
    
    html.push('  <div class="ar-flash-container"></div>');
    html.push('  <div class="ar-error"></div>');
    html.push('</div>');

    this.container.innerHTML = html.join('\n');

    this.elements = {
      recorder: this.container.querySelector('.ar-recorder'),
      canvas: this.container.querySelector('.ar-canvas'),
      timer: this.container.querySelector('.ar-timer'),
      status: this.container.querySelector('.ar-status-text'),
      btnRecord: this.container.querySelector('.ar-btn-record'),
      btnPause: this.container.querySelector('.ar-btn-pause'),
      btnStop: this.container.querySelector('.ar-btn-stop'),
      btnPlay: this.container.querySelector('.ar-btn-play'),
      btnDownload: this.container.querySelector('.ar-btn-download'),
      btnSettings: this.container.querySelector('.ar-btn-settings'),
      settingsPanel: this.container.querySelector('.ar-settings-panel'),
      settingsClose: this.container.querySelector('.ar-settings-close'),
      deviceSelect: this.container.querySelector('.ar-device-select'),
      flashContainer: this.container.querySelector('.ar-flash-container'),
      error: this.container.querySelector('.ar-error'),
      levelIndicator: this.container.querySelector('.ar-level-indicator'),
      levelBar: this.container.querySelector('.ar-level-bar'),
      btnSingle: this.container.querySelector('.ar-btn-single'),
      btnSingleLabel: this.container.querySelector('.ar-btn-single-label'),
      btnSingleTimer: this.container.querySelector('.ar-btn-single-timer'),
      btnSingleLevelBar: this.container.querySelector('.ar-btn-single-level-bar')
    };

    if (this.elements.canvas) {
      this.canvasCtx = this.elements.canvas.getContext('2d');
      this._resizeCanvas();
      this._drawIdleVisualization();
      if (this.options.liveVisualization) {
        this._startPreviewVisualization();
      }
    }
    
    if (this.options.liveVisualization && (this.options.variant === 'mini' || this.options.variant === 'button')) {
      this._startPreviewVisualization();
    }
  };

  AudioRecorder.prototype._loadDeviceFromStorage = function() {
    try {
      return localStorage.getItem(STORAGE_KEY) || null;
    } catch (e) {
      return null;
    }
  };

  AudioRecorder.prototype._saveDeviceToStorage = function(deviceId) {
    try {
      if (deviceId) {
        localStorage.setItem(STORAGE_KEY, deviceId);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {}
  };

  AudioRecorder.prototype._startPreviewVisualization = function() {
    var self = this;
    
    if (this.isRecording || this.previewStream) return;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    
    var constraints = { 
      audio: this.selectedDeviceId 
        ? { deviceId: { exact: this.selectedDeviceId } } 
        : true 
    };
    
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        if (self.isRecording) {
          stream.getTracks().forEach(function(track) { track.stop(); });
          return;
        }
        
        self.previewStream = stream;
        
        var AudioContext = global.AudioContext || global.webkitAudioContext;
        if (!AudioContext) return;
        
        if (!self.audioContext) {
          self.audioContext = new AudioContext();
        }
        
        self.previewAnalyser = self.audioContext.createAnalyser();
        self.previewAnalyser.fftSize = 256;
        
        var source = self.audioContext.createMediaStreamSource(stream);
        source.connect(self.previewAnalyser);
        
        self.previewDataArray = new Uint8Array(self.previewAnalyser.frequencyBinCount);
        self._visualizePreview();
      })
      .catch(function(err) {
        if (self.selectedDeviceId) {
          self.selectedDeviceId = null;
          self._saveDeviceToStorage(null);
          self._startPreviewVisualization();
        }
      });
  };

  AudioRecorder.prototype._stopPreviewVisualization = function() {
    if (this.previewAnimationFrame) {
      cancelAnimationFrame(this.previewAnimationFrame);
      this.previewAnimationFrame = null;
    }
    
    if (this.previewStream) {
      this.previewStream.getTracks().forEach(function(track) {
        track.stop();
      });
      this.previewStream = null;
    }
    
    this.previewAnalyser = null;
    this.previewDataArray = null;
  };

  AudioRecorder.prototype._visualizePreview = function() {
    var self = this;
    
    if (this.isRecording || !this.previewStream) return;
    
    this.previewAnimationFrame = requestAnimationFrame(function() {
      self._visualizePreview();
    });
    
    if (this.previewAnalyser) {
      this.previewAnalyser.getByteFrequencyData(this.previewDataArray);
    }
    
    if (this.options.variant === 'mini') {
      this._updateLevelIndicatorPreview();
    } else if (this.options.variant === 'button') {
      this._updateButtonLevelPreview();
    } else if (this.elements.canvas && this.canvasCtx) {
      this._drawPreviewVisualization();
    }
  };

  AudioRecorder.prototype._updateLevelIndicatorPreview = function() {
    if (!this.elements.levelBar || !this.previewDataArray) return;
    
    var sum = 0;
    for (var i = 0; i < this.previewDataArray.length; i++) {
      sum += this.previewDataArray[i];
    }
    var average = sum / this.previewDataArray.length;
    var level = Math.min(100, (average / 128) * 100);
    
    this.elements.levelBar.style.width = level + '%';
  };

  AudioRecorder.prototype._updateButtonLevelPreview = function() {
    if (!this.elements.btnSingleLevelBar || !this.previewDataArray) return;
    
    var sum = 0;
    for (var i = 0; i < this.previewDataArray.length; i++) {
      sum += this.previewDataArray[i];
    }
    var average = sum / this.previewDataArray.length;
    var level = Math.min(100, (average / 128) * 100);
    
    this.elements.btnSingleLevelBar.style.width = level + '%';
  };

  AudioRecorder.prototype._drawPreviewVisualization = function() {
    var canvas = this.elements.canvas;
    var ctx = this.canvasCtx;
    var width = canvas.width;
    var height = canvas.height;
    var isDark = this.options.theme === 'dark';
    
    ctx.fillStyle = isDark ? '#1a1a2e' : '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    if (!this.previewDataArray) return;
    
    var barWidth = (width / this.previewDataArray.length) * 2.5;
    var x = 0;
    
    for (var i = 0; i < this.previewDataArray.length; i++) {
      var barHeight = (this.previewDataArray[i] / 255) * height * 0.8;
      
      var gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
      gradient.addColorStop(0, '#48dbfb');
      gradient.addColorStop(1, isDark ? 'rgba(72, 219, 251, 0.3)' : 'rgba(72, 219, 251, 0.5)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
      
      x += barWidth + 1;
    }
  };

  AudioRecorder.prototype._resizeCanvas = function() {
    var rect = this.elements.canvas.parentElement.getBoundingClientRect();
    this.elements.canvas.width = rect.width || 300;
    this.elements.canvas.height = rect.height || 80;
  };

  AudioRecorder.prototype._bindEvents = function() {
    var self = this;

    if (this.elements.btnSingle) {
      this.elements.btnSingle.addEventListener('click', function() {
        if (self.isRecording) {
          self.stop();
        } else {
          self.start();
        }
      });
    }

    if (this.elements.btnRecord) {
      this.elements.btnRecord.addEventListener('click', function() {
        self.start();
      });
    }

    if (this.elements.btnPause) {
      this.elements.btnPause.addEventListener('click', function() {
        if (self.isPaused) {
          self.resume();
        } else {
          self.pause();
        }
      });
    }

    if (this.elements.btnStop) {
      this.elements.btnStop.addEventListener('click', function() {
        self.stop();
      });
    }

    if (this.elements.btnPlay) {
      this.elements.btnPlay.addEventListener('click', function() {
        self.play();
      });
    }

    if (this.elements.btnDownload) {
      this.elements.btnDownload.addEventListener('click', function() {
        self.download();
      });
    }

    if (this.elements.btnSettings) {
      this.elements.btnSettings.addEventListener('click', function(e) {
        e.stopPropagation();
        self._toggleSettings();
      });
    }

    if (this.elements.settingsClose) {
      this.elements.settingsClose.addEventListener('click', function() {
        self._hideSettings();
      });
    }

    if (this.elements.deviceSelect) {
      this.elements.deviceSelect.addEventListener('change', function() {
        self._selectDevice(this.value);
      });
    }

    document.addEventListener('click', function(e) {
      if (self.elements.settingsPanel && 
          self.elements.settingsPanel.classList.contains('ar-visible') &&
          !self.elements.settingsPanel.contains(e.target) &&
          (!self.elements.btnSettings || !self.elements.btnSettings.contains(e.target))) {
        self._hideSettings();
      }
    });

    global.addEventListener('resize', function() {
      if (self.elements.canvas) {
        self._resizeCanvas();
        if (!self.isRecording) {
          self._drawIdleVisualization();
        }
      }
    });
  };

  AudioRecorder.prototype._initFlash = function() {
    var self = this;
    var flashId = 'ar-flash-' + Date.now();
    
    global['AudioRecorderFlashCallback_' + flashId] = {
      ready: function() {
        self._flashReady = true;
      },
      data: function(data) {
        self._handleFlashData(data);
      },
      error: function(msg) {
        self._showError(msg);
      }
    };

    var html = [
      '<object id="' + flashId + '" type="application/x-shockwave-flash" ',
      'data="' + this.options.flashPath + '" width="1" height="1">',
      '<param name="movie" value="' + this.options.flashPath + '"/>',
      '<param name="allowScriptAccess" value="always"/>',
      '<param name="FlashVars" value="callback=AudioRecorderFlashCallback_' + flashId + '"/>',
      '</object>'
    ].join('');

    this.elements.flashContainer.innerHTML = html;
    this._flashObject = document.getElementById(flashId);
  };

  AudioRecorder.prototype.start = function() {
    var self = this;

    if (this.isRecording) return;

    this._stopPreviewVisualization();
    
    this._setStatus('Requesting permission...');
    this.audioChunks = [];
    this.duration = 0;

    if (this.recordingMode === 'mediarecorder') {
      this._startMediaRecorder();
    } else if (this.recordingMode === 'webaudio') {
      this._startWebAudio();
    } else if (this.recordingMode === 'flash') {
      this._startFlash();
    } else {
      this._showError('Audio recording is not supported in this browser');
      return;
    }
  };

  AudioRecorder.prototype._startMediaRecorder = function() {
    var self = this;
    var constraints = { 
      audio: this.selectedDeviceId 
        ? { deviceId: { exact: this.selectedDeviceId } } 
        : true 
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(stream) {
        self.mediaStream = stream;
        self.options.onPermissionGranted();

        var mimeType = self._getSupportedMimeType();
        var options = mimeType ? { mimeType: mimeType } : {};
        
        self.mediaRecorder = new MediaRecorder(stream, options);

        self.mediaRecorder.ondataavailable = function(e) {
          if (e.data.size > 0) {
            self.audioChunks.push(e.data);
          }
        };

        self.mediaRecorder.onstop = function() {
          self._processRecording();
        };

        self.mediaRecorder.start(100);
        self._onRecordingStarted(stream);
      })
      .catch(function(err) {
        self.options.onPermissionDenied();
        self._showError('Permission denied: ' + err.message);
      });
  };

  AudioRecorder.prototype._getSupportedMimeType = function() {
    var types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav'
    ];
    
    for (var i = 0; i < types.length; i++) {
      if (MediaRecorder.isTypeSupported(types[i])) {
        return types[i];
      }
    }
    return null;
  };

  AudioRecorder.prototype._startWebAudio = function() {
    var self = this;
    var getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || 
      navigator.mozGetUserMedia || navigator.msGetUserMedia;
    var constraints = { 
      audio: this.selectedDeviceId 
        ? { deviceId: { exact: this.selectedDeviceId } } 
        : true 
    };

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
          self._initWebAudioRecording(stream);
        })
        .catch(function(err) {
          self.options.onPermissionDenied();
          self._showError('Permission denied: ' + err.message);
        });
    } else if (getUserMedia) {
      getUserMedia.call(navigator, { audio: true }, function(stream) {
        self._initWebAudioRecording(stream);
      }, function(err) {
        self.options.onPermissionDenied();
        self._showError('Permission denied: ' + err.message);
      });
    }
  };

  AudioRecorder.prototype._initWebAudioRecording = function(stream) {
    var self = this;
    var AudioContext = global.AudioContext || global.webkitAudioContext;
    
    this.mediaStream = stream;
    this.audioContext = new AudioContext();
    this.options.onPermissionGranted();

    var source = this.audioContext.createMediaStreamSource(stream);
    var processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    
    this._audioBuffers = [];
    
    processor.onaudioprocess = function(e) {
      if (!self.isRecording || self.isPaused) return;
      var channelData = e.inputBuffer.getChannelData(0);
      self._audioBuffers.push(new Float32Array(channelData));
    };

    source.connect(processor);
    processor.connect(this.audioContext.destination);
    
    this._audioProcessor = processor;
    this._audioSource = source;
    
    this._onRecordingStarted(stream);
  };

  AudioRecorder.prototype._startFlash = function() {
    if (!this._flashReady) {
      this._showError('Flash is not ready. Please wait or enable Flash.');
      return;
    }

    try {
      this._flashObject.startRecording();
      this._onRecordingStarted(null);
    } catch (e) {
      this._showError('Flash recording failed: ' + e.message);
    }
  };

  AudioRecorder.prototype._onRecordingStarted = function(stream) {
    var self = this;
    
    this.isRecording = true;
    this.isPaused = false;
    
    this._setStatus('Recording');
    this._updateButtons('recording');
    this.elements.recorder.classList.add('ar-recording');
    
    if (this.elements.btnSingle) {
      this.elements.btnSingle.classList.add('ar-btn-single-recording');
      if (this.elements.btnSingleLabel) {
        this.elements.btnSingleLabel.textContent = 'Stop';
      }
    }
    
    this._startTimer();
    
    if (stream && this.hasAudioContext) {
      this._initVisualization(stream);
    } else if (this.options.variant !== 'mini' && this.options.variant !== 'button' && this.elements.canvas) {
      this._drawRecordingVisualization();
    }
    
    this.options.onStart();
  };

  AudioRecorder.prototype._initVisualization = function(stream) {
    var AudioContext = global.AudioContext || global.webkitAudioContext;
    
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    
    var source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this._visualize();
  };

  AudioRecorder.prototype._visualize = function() {
    var self = this;
    
    if (!this.isRecording) return;
    
    this.animationFrame = requestAnimationFrame(function() {
      self._visualize();
    });
    
    if (this.analyser) {
      this.analyser.getByteFrequencyData(this.dataArray);
    }
    
    if (this.options.variant === 'mini' || this.options.variant === 'button') {
      this._updateLevelIndicator();
    } else if (this.elements.canvas) {
      this._drawVisualization();
    }
  };

  AudioRecorder.prototype._updateLevelIndicator = function() {
    if (!this.dataArray) return;
    
    var sum = 0;
    for (var i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    var average = sum / this.dataArray.length;
    var level = Math.min(100, (average / 255) * 150);
    
    var color;
    if (level > 70) {
      color = '#ff6b6b';
    } else if (level > 40) {
      color = '#feca57';
    } else {
      color = '#48dbfb';
    }
    
    if (this.elements.levelBar) {
      this.elements.levelBar.style.width = level + '%';
      this.elements.levelBar.style.background = color;
    }
    
    if (this.elements.btnSingleLevelBar) {
      this.elements.btnSingleLevelBar.style.width = level + '%';
      this.elements.btnSingleLevelBar.style.background = color;
    }
  };

  AudioRecorder.prototype._drawVisualization = function() {
    var canvas = this.elements.canvas;
    var ctx = this.canvasCtx;
    var width = canvas.width;
    var height = canvas.height;
    var isDark = this.options.theme === 'dark';
    
    ctx.fillStyle = isDark ? '#1a1a2e' : '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    if (!this.dataArray) return;
    
    var barWidth = (width / this.dataArray.length) * 2.5;
    var barHeight;
    var x = 0;
    
    var gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.5, '#feca57');
    gradient.addColorStop(1, '#48dbfb');
    
    for (var i = 0; i < this.dataArray.length; i++) {
      barHeight = (this.dataArray[i] / 255) * height * 0.9;
      
      ctx.fillStyle = gradient;
      
      var radius = 2;
      ctx.beginPath();
      ctx.moveTo(x + radius, height - barHeight);
      ctx.lineTo(x + barWidth - radius, height - barHeight);
      ctx.quadraticCurveTo(x + barWidth, height - barHeight, x + barWidth, height - barHeight + radius);
      ctx.lineTo(x + barWidth, height);
      ctx.lineTo(x, height);
      ctx.lineTo(x, height - barHeight + radius);
      ctx.quadraticCurveTo(x, height - barHeight, x + radius, height - barHeight);
      ctx.fill();
      
      x += barWidth + 1;
    }
  };

  AudioRecorder.prototype._drawIdleVisualization = function() {
    var canvas = this.elements.canvas;
    var ctx = this.canvasCtx;
    var width = canvas.width;
    var height = canvas.height;
    var isDark = this.options.theme === 'dark';
    
    ctx.fillStyle = isDark ? '#1a1a2e' : '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = isDark ? '#2d2d44' : '#e9ecef';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  AudioRecorder.prototype._drawRecordingVisualization = function() {
    var self = this;
    var canvas = this.elements.canvas;
    var ctx = this.canvasCtx;
    var width = canvas.width;
    var height = canvas.height;
    var isDark = this.options.theme === 'dark';
    var time = 0;
    
    function draw() {
      if (!self.isRecording) return;
      
      self.animationFrame = requestAnimationFrame(draw);
      time += 0.05;
      
      ctx.fillStyle = isDark ? '#1a1a2e' : '#f8f9fa';
      ctx.fillRect(0, 0, width, height);
      
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      for (var x = 0; x < width; x++) {
        var y = height / 2 + Math.sin(x * 0.02 + time) * 20 * Math.sin(time * 0.5);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
    
    draw();
  };

  AudioRecorder.prototype._startTimer = function() {
    var self = this;
    
    this.timerInterval = setInterval(function() {
      if (!self.isPaused) {
        self.duration++;
        self._updateTimer();
        
        if (self.duration >= self.options.maxDuration) {
          self.stop();
        }
      }
    }, 1000);
  };

  AudioRecorder.prototype._updateTimer = function() {
    var minutes = Math.floor(this.duration / 60);
    var seconds = this.duration % 60;
    
    var display = (minutes < 10 ? '0' : '') + minutes + ':' + 
                  (seconds < 10 ? '0' : '') + seconds;
    
    if (this.elements.timer) {
      this.elements.timer.textContent = display;
    }
    
    if (this.elements.btnSingleTimer) {
      this.elements.btnSingleTimer.textContent = display;
    }
  };

  AudioRecorder.prototype.pause = function() {
    if (!this.isRecording || this.isPaused) return;
    
    this.isPaused = true;
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
    
    if (this.recordingMode === 'flash' && this._flashObject) {
      this._flashObject.pauseRecording();
    }
    
    this._setStatus('Paused');
    this._updateButtons('paused');
    this.elements.recorder.classList.add('ar-paused');
    
    this.options.onPause();
  };

  AudioRecorder.prototype.resume = function() {
    if (!this.isRecording || !this.isPaused) return;
    
    this.isPaused = false;
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
    
    if (this.recordingMode === 'flash' && this._flashObject) {
      this._flashObject.resumeRecording();
    }
    
    this._setStatus('Recording');
    this._updateButtons('recording');
    this.elements.recorder.classList.remove('ar-paused');
    
    this.options.onResume();
  };

  AudioRecorder.prototype.stop = function() {
    if (!this.isRecording) return;
    
    this.isRecording = false;
    this.isPaused = false;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    
    if (this.recordingMode === 'webaudio') {
      this._processWebAudioRecording();
    }
    
    if (this.recordingMode === 'flash' && this._flashObject) {
      this._flashObject.stopRecording();
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    
    this._setStatus('Processing...');
    this.elements.recorder.classList.remove('ar-recording', 'ar-paused');
    
    this.options.onStop();
  };

  AudioRecorder.prototype._processRecording = function() {
    var self = this;
    var mimeType = this.mediaRecorder && this.mediaRecorder.mimeType 
      ? this.mediaRecorder.mimeType 
      : 'audio/webm';
    
    this.recordedBlob = new Blob(this.audioChunks, { type: mimeType });
    this.recordedUrl = URL.createObjectURL(this.recordedBlob);
    
    this._setStatus('Ready to play');
    this._updateButtons('stopped');
    if (this.elements.canvas) {
      this._drawIdleVisualization();
    }
    this._resetLevelIndicator();
    this._resetButtonUI();
    
    if (this.options.liveVisualization) {
      this._startPreviewVisualization();
    }
    
    this.options.onData({
      blob: this.recordedBlob,
      url: this.recordedUrl,
      duration: this.duration
    });
  };

  AudioRecorder.prototype._resetButtonUI = function() {
    if (this.elements.btnSingle) {
      this.elements.btnSingle.classList.remove('ar-btn-single-recording');
      if (this.elements.btnSingleLabel) {
        this.elements.btnSingleLabel.textContent = 'Record';
      }
    }
  };

  AudioRecorder.prototype._resetLevelIndicator = function() {
    if (this.elements.levelBar) {
      this.elements.levelBar.style.width = '0%';
      this.elements.levelBar.style.background = '#48dbfb';
    }
    if (this.elements.btnSingleLevelBar) {
      this.elements.btnSingleLevelBar.style.width = '0%';
      this.elements.btnSingleLevelBar.style.background = '#48dbfb';
    }
  };

  AudioRecorder.prototype._processWebAudioRecording = function() {
    var self = this;
    
    if (!this._audioBuffers || this._audioBuffers.length === 0) {
      this._showError('No audio data recorded');
      return;
    }
    
    var totalLength = 0;
    for (var i = 0; i < this._audioBuffers.length; i++) {
      totalLength += this._audioBuffers[i].length;
    }
    
    var result = new Float32Array(totalLength);
    var offset = 0;
    
    for (var i = 0; i < this._audioBuffers.length; i++) {
      result.set(this._audioBuffers[i], offset);
      offset += this._audioBuffers[i].length;
    }
    
    var wavBlob = this._encodeWAV(result, this.audioContext.sampleRate);
    
    this.recordedBlob = wavBlob;
    this.recordedUrl = URL.createObjectURL(wavBlob);
    
    if (this._audioProcessor) {
      this._audioProcessor.disconnect();
    }
    if (this._audioSource) {
      this._audioSource.disconnect();
    }
    
    this._setStatus('Ready to play');
    this._updateButtons('stopped');
    if (this.elements.canvas) {
      this._drawIdleVisualization();
    }
    this._resetLevelIndicator();
    this._resetButtonUI();
    
    if (this.options.liveVisualization) {
      this._startPreviewVisualization();
    }
    
    this.options.onData({
      blob: this.recordedBlob,
      url: this.recordedUrl,
      duration: this.duration
    });
  };

  AudioRecorder.prototype._encodeWAV = function(samples, sampleRate) {
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);
    
    function writeString(view, offset, string) {
      for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
    
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);
    
    var index = 44;
    for (var i = 0; i < samples.length; i++) {
      var s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(index, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      index += 2;
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  };

  AudioRecorder.prototype._handleFlashData = function(base64Data) {
    var binaryString = atob(base64Data);
    var bytes = new Uint8Array(binaryString.length);
    
    for (var i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    this.recordedBlob = new Blob([bytes], { type: 'audio/wav' });
    this.recordedUrl = URL.createObjectURL(this.recordedBlob);
    
    this._setStatus('Ready to play');
    this._updateButtons('stopped');
    
    this.options.onData({
      blob: this.recordedBlob,
      url: this.recordedUrl,
      duration: this.duration
    });
  };

  AudioRecorder.prototype.play = function() {
    var self = this;
    
    if (!this.recordedUrl) return;
    
    if (this._audioElement) {
      this._audioElement.pause();
    }
    
    this._audioElement = new Audio(this.recordedUrl);
    
    this._audioElement.onplay = function() {
      self._setStatus('Playing');
      if (self.elements.btnPlay) {
        self.elements.btnPlay.classList.add('ar-playing');
      }
    };
    
    this._audioElement.onended = function() {
      self._setStatus('Ready to play');
      if (self.elements.btnPlay) {
        self.elements.btnPlay.classList.remove('ar-playing');
      }
    };
    
    this._audioElement.play();
  };

  AudioRecorder.prototype.download = function(filename) {
    if (!this.recordedBlob) return;
    
    var name = filename || 'recording-' + Date.now();
    var extension = this.recordedBlob.type.split('/')[1] || 'wav';
    if (extension.indexOf(';') > -1) {
      extension = extension.split(';')[0];
    }
    
    var a = document.createElement('a');
    a.href = this.recordedUrl;
    a.download = name + '.' + extension;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  AudioRecorder.prototype.getBlob = function() {
    return this.recordedBlob || null;
  };

  AudioRecorder.prototype.getUrl = function() {
    return this.recordedUrl || null;
  };

  AudioRecorder.prototype.getDuration = function() {
    return this.duration;
  };

  AudioRecorder.prototype.reset = function() {
    this.audioChunks = [];
    this.duration = 0;
    
    if (this.recordedUrl) {
      URL.revokeObjectURL(this.recordedUrl);
    }
    
    this.recordedBlob = null;
    this.recordedUrl = null;
    
    this._updateTimer();
    this._setStatus('Ready');
    this._updateButtons('idle');
    if (this.elements.canvas) {
      this._drawIdleVisualization();
    }
    this._resetLevelIndicator();
    this._resetButtonUI();
    
    if (this.options.liveVisualization) {
      this._startPreviewVisualization();
    }
  };

  AudioRecorder.prototype.destroy = function() {
    this._stopPreviewVisualization();
    this.stop();
    this.reset();
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.container.innerHTML = '';
  };

  AudioRecorder.prototype._updateButtons = function(state) {
    var btns = this.elements;
    
    if (btns.btnRecord) {
      btns.btnRecord.disabled = state !== 'idle' && state !== 'stopped';
    }
    
    if (btns.btnStop) {
      btns.btnStop.disabled = state !== 'recording' && state !== 'paused';
    }
    
    if (btns.btnPause) {
      btns.btnPause.disabled = state !== 'recording' && state !== 'paused';
      if (state === 'paused') {
        btns.btnPause.classList.add('ar-active');
        btns.btnPause.title = 'Resume';
      } else {
        btns.btnPause.classList.remove('ar-active');
        btns.btnPause.title = 'Pause';
      }
    }
    
    if (btns.btnPlay) {
      btns.btnPlay.disabled = state !== 'stopped';
    }
    
    if (btns.btnDownload) {
      btns.btnDownload.disabled = state !== 'stopped';
    }
  };

  AudioRecorder.prototype._toggleSettings = function() {
    if (this.elements.settingsPanel.classList.contains('ar-visible')) {
      this._hideSettings();
    } else {
      this._showSettings();
    }
  };

  AudioRecorder.prototype._showSettings = function() {
    var self = this;
    this.elements.settingsPanel.classList.add('ar-visible');
    this._loadDevices();
  };

  AudioRecorder.prototype._hideSettings = function() {
    this.elements.settingsPanel.classList.remove('ar-visible');
  };

  AudioRecorder.prototype._loadDevices = function() {
    var self = this;
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn('enumerateDevices not supported');
      return;
    }
    
    navigator.mediaDevices.enumerateDevices().then(function(devices) {
      self.audioDevices = devices.filter(function(d) {
        return d.kind === 'audioinput';
      });
      
      var storedDeviceId = self.selectedDeviceId;
      var deviceExists = storedDeviceId && self.audioDevices.some(function(d) {
        return d.deviceId === storedDeviceId;
      });
      
      if (storedDeviceId && !deviceExists) {
        self.selectedDeviceId = null;
        self._saveDeviceToStorage(null);
      }
      
      var select = self.elements.deviceSelect;
      var currentValue = self.selectedDeviceId || '';
      
      select.innerHTML = '<option value="">Default Microphone</option>';
      
      self.audioDevices.forEach(function(device, index) {
        var option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || ('Microphone ' + (index + 1));
        if (device.deviceId === currentValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }).catch(function(err) {
      console.warn('Could not enumerate audio devices:', err);
    });
  };

  AudioRecorder.prototype._selectDevice = function(deviceId) {
    this.selectedDeviceId = deviceId || null;
    this._saveDeviceToStorage(deviceId);
    this.options.onDeviceChange(deviceId, this._getSelectedDeviceLabel());
    this._hideSettings();
    
    if (this.options.liveVisualization && !this.isRecording) {
      this._stopPreviewVisualization();
      this._startPreviewVisualization();
    }
  };

  AudioRecorder.prototype._getSelectedDeviceLabel = function() {
    if (!this.selectedDeviceId) return 'Default Microphone';
    var device = this.audioDevices.find(function(d) {
      return d.deviceId === this.selectedDeviceId;
    }.bind(this));
    return device ? (device.label || 'Microphone') : 'Default Microphone';
  };

  AudioRecorder.prototype.getSelectedDevice = function() {
    return {
      deviceId: this.selectedDeviceId,
      label: this._getSelectedDeviceLabel()
    };
  };

  AudioRecorder.prototype.setDevice = function(deviceId) {
    this.selectedDeviceId = deviceId || null;
  };

  AudioRecorder.prototype._setStatus = function(text) {
    if (this.elements.status) {
      this.elements.status.textContent = text;
    }
  };

  AudioRecorder.prototype._showError = function(message) {
    this.elements.error.textContent = message;
    this.elements.error.style.display = 'block';
    this.options.onError(message);
    
    var self = this;
    setTimeout(function() {
      self.elements.error.style.display = 'none';
    }, 5000);
  };

  AudioRecorder.isSupported = function() {
    var nav = navigator;
    var hasMediaRecorder = typeof MediaRecorder !== 'undefined';
    var hasGetUserMedia = !!(nav.mediaDevices && nav.mediaDevices.getUserMedia);
    var hasLegacyGetUserMedia = !!(nav.getUserMedia || nav.webkitGetUserMedia || 
      nav.mozGetUserMedia || nav.msGetUserMedia);
    var hasAudioContext = !!(global.AudioContext || global.webkitAudioContext);
    var hasFlash = false;
    
    try {
      var fo = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
      if (fo) hasFlash = true;
    } catch (e) {
      if (nav.mimeTypes && 
          nav.mimeTypes['application/x-shockwave-flash'] !== undefined &&
          nav.mimeTypes['application/x-shockwave-flash'].enabledPlugin) {
        hasFlash = true;
      }
    }
    
    return hasMediaRecorder || hasAudioContext || hasFlash;
  };

  AudioRecorder.getCapabilities = function() {
    return {
      mediaRecorder: typeof MediaRecorder !== 'undefined',
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      legacyGetUserMedia: !!(navigator.getUserMedia || navigator.webkitGetUserMedia || 
        navigator.mozGetUserMedia || navigator.msGetUserMedia),
      audioContext: !!(global.AudioContext || global.webkitAudioContext),
      flash: AudioRecorder.prototype._detectFlash.call({})
    };
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioRecorder;
  } else if (typeof define === 'function' && define.amd) {
    define(function() { return AudioRecorder; });
  } else {
    global.AudioRecorder = AudioRecorder;
  }

})(typeof window !== 'undefined' ? window : this);
