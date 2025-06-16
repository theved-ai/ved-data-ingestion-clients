const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('../utils/logger');

async function transcribeAudio(audioPath) {
  logger.log(`Transcribing ${audioPath}`);
  const transcriptPath = path.join(__dirname, '../temp/transcript.txt');

  try {
    execSync(`whisper ${audioPath} --model base --output_format txt --output_dir temp`);
    const transcript = fs.readFileSync(transcriptPath, 'utf-8');
    return transcript;
  } catch (error) {
    logger.log('Transcription failed:', error);
    return 'Transcription failed';
  }
}

module.exports = { transcribeAudio };