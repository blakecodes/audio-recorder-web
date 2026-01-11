const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'src', 'audio-recorder.js');
const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const source = fs.readFileSync(srcPath, 'utf8');

fs.writeFileSync(path.join(distPath, 'audio-recorder.js'), source);

const esmSource = source
  .replace(
    /\(function\(global\) \{[\s\S]*?'use strict';/,
    `// ES Module version
const global = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this;
`
  )
  .replace(
    /if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?\} else \{[\s\S]*?global\.AudioRecorder = AudioRecorder;[\s\S]*?\}/,
    'export default AudioRecorder;'
  )
  .replace(
    /\}\)\(typeof window !== 'undefined' \? window : this\);/,
    ''
  );

fs.writeFileSync(path.join(distPath, 'audio-recorder.esm.js'), esmSource);

const umdSource = source;
fs.writeFileSync(path.join(distPath, 'audio-recorder.umd.js'), umdSource);

let minified = source;
try {
  const { minify } = require('terser');
  minify(source, {
    compress: {
      drop_console: false,
      passes: 2
    },
    mangle: {
      reserved: ['AudioRecorder']
    },
    format: {
      comments: false,
      preamble: '/*! audio-recorder-widget v1.0.0 | MIT License */'
    }
  }).then(result => {
    fs.writeFileSync(path.join(distPath, 'audio-recorder.min.js'), result.code);
    console.log('Built minified version');
  }).catch(err => {
    console.warn('Terser minification failed, using unminified:', err.message);
    fs.writeFileSync(path.join(distPath, 'audio-recorder.min.js'), source);
  });
} catch (e) {
  console.warn('Terser not available, copying unminified version');
  fs.writeFileSync(path.join(distPath, 'audio-recorder.min.js'), source);
}

console.log('Build complete!');
console.log('  - dist/audio-recorder.js (CommonJS)');
console.log('  - dist/audio-recorder.esm.js (ES Module)');
console.log('  - dist/audio-recorder.umd.js (UMD)');
console.log('  - dist/audio-recorder.min.js (Minified)');
