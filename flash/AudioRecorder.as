/*
 * Flash Audio Recorder Fallback
 * For compilation with Adobe Animate or Flash Professional CS6+
 * Compile to recorder.swf
 * 
 * This provides audio recording support for older browsers
 * that don't support MediaRecorder or getUserMedia APIs.
 */

package {
    import flash.display.Sprite;
    import flash.events.*;
    import flash.external.ExternalInterface;
    import flash.media.Microphone;
    import flash.system.Security;
    import flash.utils.ByteArray;
    import flash.utils.getTimer;
    import flash.utils.Timer;
    
    public class AudioRecorder extends Sprite {
        private var microphone:Microphone;
        private var audioData:ByteArray;
        private var isRecording:Boolean = false;
        private var isPaused:Boolean = false;
        private var sampleRate:int = 44100;
        private var callback:String;
        private var startTime:int;
        private var pausedTime:int = 0;
        
        public function AudioRecorder() {
            Security.allowDomain("*");
            Security.allowInsecureDomain("*");
            
            var flashVars:Object = loaderInfo.parameters;
            callback = flashVars.callback || "AudioRecorderFlashCallback";
            
            setupExternalInterface();
            notifyReady();
        }
        
        private function setupExternalInterface():void {
            try {
                ExternalInterface.addCallback("startRecording", startRecording);
                ExternalInterface.addCallback("stopRecording", stopRecording);
                ExternalInterface.addCallback("pauseRecording", pauseRecording);
                ExternalInterface.addCallback("resumeRecording", resumeRecording);
                ExternalInterface.addCallback("isReady", isReady);
                ExternalInterface.addCallback("getMicrophoneActivity", getMicrophoneActivity);
            } catch (e:Error) {
                trace("ExternalInterface setup failed: " + e.message);
            }
        }
        
        private function notifyReady():void {
            try {
                ExternalInterface.call(callback + ".ready");
            } catch (e:Error) {
                trace("Ready notification failed: " + e.message);
            }
        }
        
        private function notifyError(message:String):void {
            try {
                ExternalInterface.call(callback + ".error", message);
            } catch (e:Error) {
                trace("Error notification failed: " + e.message);
            }
        }
        
        private function notifyData(data:String):void {
            try {
                ExternalInterface.call(callback + ".data", data);
            } catch (e:Error) {
                trace("Data notification failed: " + e.message);
            }
        }
        
        public function isReady():Boolean {
            return microphone != null || Microphone.getMicrophone() != null;
        }
        
        public function getMicrophoneActivity():Number {
            if (microphone) {
                return microphone.activityLevel;
            }
            return 0;
        }
        
        public function startRecording():Boolean {
            if (isRecording) {
                return false;
            }
            
            microphone = Microphone.getMicrophone();
            
            if (microphone == null) {
                notifyError("No microphone found");
                return false;
            }
            
            microphone.rate = 44;
            microphone.gain = 50;
            microphone.setSilenceLevel(0, 2000);
            microphone.setLoopBack(false);
            microphone.setUseEchoSuppression(true);
            
            audioData = new ByteArray();
            
            microphone.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData);
            microphone.addEventListener(StatusEvent.STATUS, onMicrophoneStatus);
            
            isRecording = true;
            isPaused = false;
            startTime = getTimer();
            pausedTime = 0;
            
            return true;
        }
        
        public function stopRecording():Boolean {
            if (!isRecording) {
                return false;
            }
            
            isRecording = false;
            isPaused = false;
            
            if (microphone) {
                microphone.removeEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData);
                microphone.removeEventListener(StatusEvent.STATUS, onMicrophoneStatus);
            }
            
            processAndSendAudio();
            
            return true;
        }
        
        public function pauseRecording():Boolean {
            if (!isRecording || isPaused) {
                return false;
            }
            
            isPaused = true;
            pausedTime += getTimer() - startTime;
            
            return true;
        }
        
        public function resumeRecording():Boolean {
            if (!isRecording || !isPaused) {
                return false;
            }
            
            isPaused = false;
            startTime = getTimer();
            
            return true;
        }
        
        private function onSampleData(event:SampleDataEvent):void {
            if (isPaused) {
                return;
            }
            
            while (event.data.bytesAvailable > 0) {
                var sample:Number = event.data.readFloat();
                audioData.writeFloat(sample);
            }
        }
        
        private function onMicrophoneStatus(event:StatusEvent):void {
            if (event.code == "Microphone.Unmuted") {
                trace("Microphone access granted");
            } else if (event.code == "Microphone.Muted") {
                notifyError("Microphone access denied");
                stopRecording();
            }
        }
        
        private function processAndSendAudio():void {
            if (audioData == null || audioData.length == 0) {
                notifyError("No audio data recorded");
                return;
            }
            
            var wavData:ByteArray = createWAV();
            var base64:String = encodeBase64(wavData);
            
            notifyData(base64);
            
            audioData = null;
        }
        
        private function createWAV():ByteArray {
            var wav:ByteArray = new ByteArray();
            var numChannels:int = 1;
            var bitsPerSample:int = 16;
            var byteRate:int = sampleRate * numChannels * (bitsPerSample / 8);
            var blockAlign:int = numChannels * (bitsPerSample / 8);
            
            audioData.position = 0;
            var numSamples:int = audioData.length / 4;
            var dataSize:int = numSamples * 2;
            
            wav.endian = "littleEndian";
            
            wav.writeUTFBytes("RIFF");
            wav.writeInt(36 + dataSize);
            wav.writeUTFBytes("WAVE");
            
            wav.writeUTFBytes("fmt ");
            wav.writeInt(16);
            wav.writeShort(1);
            wav.writeShort(numChannels);
            wav.writeInt(sampleRate);
            wav.writeInt(byteRate);
            wav.writeShort(blockAlign);
            wav.writeShort(bitsPerSample);
            
            wav.writeUTFBytes("data");
            wav.writeInt(dataSize);
            
            audioData.position = 0;
            while (audioData.bytesAvailable > 0) {
                var sample:Number = audioData.readFloat();
                var intSample:int;
                if (sample < 0) {
                    intSample = sample * 32768;
                } else {
                    intSample = sample * 32767;
                }
                if (intSample > 32767) intSample = 32767;
                if (intSample < -32768) intSample = -32768;
                wav.writeShort(intSample);
            }
            
            return wav;
        }
        
        private function encodeBase64(data:ByteArray):String {
            var base64Chars:String = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
            var result:String = "";
            var padding:int = 0;
            
            data.position = 0;
            
            while (data.bytesAvailable > 0) {
                var byte1:int = data.bytesAvailable > 0 ? data.readUnsignedByte() : 0;
                var byte2:int = data.bytesAvailable > 0 ? data.readUnsignedByte() : (padding++, 0);
                var byte3:int = data.bytesAvailable > 0 ? data.readUnsignedByte() : (padding++, 0);
                
                var triplet:int = (byte1 << 16) | (byte2 << 8) | byte3;
                
                result += base64Chars.charAt((triplet >> 18) & 0x3F);
                result += base64Chars.charAt((triplet >> 12) & 0x3F);
                result += padding > 1 ? "=" : base64Chars.charAt((triplet >> 6) & 0x3F);
                result += padding > 0 ? "=" : base64Chars.charAt(triplet & 0x3F);
            }
            
            return result;
        }
    }
}
