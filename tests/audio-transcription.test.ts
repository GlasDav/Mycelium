import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeReadyAudioTranscriptionJob,
  type AudioTranscriptionJob
} from '../src/audio-transcription';
import {
  AUDIO_IMPORT_FILE_ACCEPT,
  AUDIO_IMPORT_FILE_MAX_BYTES,
  summarizeAudioImportFile
} from '../src/note-import-files';

function readyAudioJob(overrides: Partial<AudioTranscriptionJob> = {}): AudioTranscriptionJob {
  return {
    id: 'audio-job-1',
    status: 'ready',
    filename: 'nvidia-expert-call.m4a',
    title: 'Nvidia expert call',
    observedAt: '2026-05-06',
    sourcePeople: ['Dana Lee'],
    chunks: [
      {
        startTime: '00:00:01.000',
        endTime: '00:00:04.500',
        speaker: 'Dana Lee',
        text: 'Nvidia demand remains strong through Q3.',
        confidence: 0.94
      },
      {
        startTime: '00:00:05.000',
        endTime: '00:00:08.000',
        speaker: 'Morgan Chen',
        text: 'Blackwell supply is still tight.'
      }
    ],
    ...overrides
  };
}

test('ready audio job with diarized chunks normalizes into parsed note import data', () => {
  const parsed = normalizeReadyAudioTranscriptionJob(readyAudioJob());

  assert.equal(parsed.title, 'Nvidia expert call');
  assert.equal(parsed.observedAt, '2026-05-06');
  assert.equal(
    parsed.body,
    'Dana Lee: Nvidia demand remains strong through Q3.\nMorgan Chen: Blackwell supply is still tight.'
  );
  assert.deepEqual(parsed.sourcePeople, ['Dana Lee', 'Morgan Chen']);
  assert.deepEqual(parsed.transcriptChunks, [
    {
      startTime: '00:00:01.000',
      endTime: '00:00:04.500',
      speaker: 'Dana Lee',
      text: 'Nvidia demand remains strong through Q3.',
      confidence: 0.94
    },
    {
      startTime: '00:00:05.000',
      endTime: '00:00:08.000',
      speaker: 'Morgan Chen',
      text: 'Blackwell supply is still tight.'
    }
  ]);
  assert.deepEqual(parsed.tickers, ['NVDA']);
  assert(parsed.companyTags.includes('Nvidia'));
});

test('empty ready audio job produces existing missing body warning style', () => {
  const parsed = normalizeReadyAudioTranscriptionJob(readyAudioJob({
    title: 'Empty audio transcript',
    sourcePeople: [],
    chunks: []
  }));

  assert.equal(parsed.title, 'Empty audio transcript');
  assert.equal(parsed.body, '');
  assert(parsed.warnings.some(warning => warning.code === 'missing_body'));
});

test('audio transcription normalization output has no claim-window fields', () => {
  const parsed = normalizeReadyAudioTranscriptionJob(readyAudioJob());
  const record = parsed as Record<string, unknown>;

  assert.equal('appliesToStart' in record, false);
  assert.equal('appliesToEnd' in record, false);
  assert.equal('horizon' in record, false);
});

test('audio file validation accepts supported extensions and rejects unsupported or oversized files', () => {
  assert.equal(AUDIO_IMPORT_FILE_ACCEPT, '.mp3,.m4a,.wav,.webm,.mp4,.aac');
  assert.equal(AUDIO_IMPORT_FILE_MAX_BYTES, 50 * 1024 * 1024);

  const accepted = summarizeAudioImportFile({ name: 'expert-call.WEBM', size: AUDIO_IMPORT_FILE_MAX_BYTES });
  assert.equal(accepted.filename, 'expert-call.WEBM');
  assert.equal(accepted.sizeBytes, AUDIO_IMPORT_FILE_MAX_BYTES);
  assert.equal(accepted.status, 'selected');

  assert.throws(
    () => summarizeAudioImportFile({ name: 'expert-call.mov', size: 42 }),
    /Unsupported audio import file type/
  );
  assert.throws(
    () => summarizeAudioImportFile({ name: 'expert-call.mp3', size: AUDIO_IMPORT_FILE_MAX_BYTES + 1 }),
    /Audio import file is too large/
  );
});
