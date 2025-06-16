// File: services/audioCapture.js
const fs = require('fs');
const path = require('path');
const { exec, execSync } = require('child_process');
const logger = require('../utils/logger');

function ffmpegExists() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function createAudioCaptureStream() {
  const outputPath = path.join(__dirname, '../temp/audio.wav');
  logger.log('Capturing audio using ffmpeg');

  if (!ffmpegExists()) {
    throw new Error('FFmpeg is not installed or not in PATH');
  }

  return new Promise((resolve, reject) => {
    exec(`ffmpeg -y -f avfoundation -i ":0" -t 10 ${outputPath}`, (err) => {
      if (err) reject(err);
      else resolve(outputPath);
    });
  });
}

// ✅ Must be exported like this
module.exports = {
  createAudioCaptureStream
};
