#!/usr/bin/env node
/** Self-check for T2V batch fixes: prefix queue + video baseline filter. */

function createDownloadPrefixQueue() {
  const queue = [];
  let fallback = '';
  return {
    push(prefix) {
      fallback = String(prefix || '').trim();
      if (fallback) queue.push(fallback);
    },
    take() {
      return queue.length ? queue.shift() : fallback;
    },
  };
}

function filterStableNewVideos(videos, baselineSrcs, stableMs, now = Date.now(), cache = new Map()) {
  const candidates = videos.filter((v) => v.src && !baselineSrcs.has(v.src));
  return candidates.filter((v) => {
    const cached = cache.get(v);
    if (!cached || cached.src !== v.src) {
      cache.set(v, { src: v.src, firstSeen: now });
      return false;
    }
    return now - cached.firstSeen >= stableMs;
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testPrefixQueue() {
  const q = createDownloadPrefixQueue();
  q.push('001_stem_');
  q.push('002_stem_');
  q.push('003_stem_');
  assert(q.take() === '001_stem_', 'first prefix');
  assert(q.take() === '002_stem_', 'second prefix');
  assert(q.take() === '003_stem_', 'third prefix');
  assert(q.take() === '003_stem_', 'fallback after queue drained');
}

function testVideoBaseline() {
  const baseline = new Set(['https://grok.com/v1.mp4']);
  const video = { src: 'https://grok.com/v1.mp4' };
  const fresh = { src: 'https://grok.com/v2.mp4' };
  const stableMs = 3000;
  const cache = new Map();

  assert(filterStableNewVideos([video], baseline, stableMs, 1000, cache).length === 0, 'baseline src excluded');
  assert(filterStableNewVideos([fresh], baseline, stableMs, 1000, cache).length === 0, 'new src not stable yet');
  assert(filterStableNewVideos([fresh], baseline, stableMs, 5000, cache).length === 1, 'new src stable');
}

function isSubmitAcknowledged(state) {
  if (state.submitDisabled) return true;
  if (state.editorEmpty) return true;
  if (state.progress != null) return true;
  if (state.generating) return true;
  return false;
}

function testSubmitAck() {
  assert(isSubmitAcknowledged({ submitDisabled: true }), 'disabled button');
  assert(isSubmitAcknowledged({ editorEmpty: true }), 'empty editor');
  assert(isSubmitAcknowledged({ progress: 10 }), 'progress');
  assert(isSubmitAcknowledged({ generating: true }), 'generating');
  assert(!isSubmitAcknowledged({}), 'not acked');
}

function main() {
  testPrefixQueue();
  testVideoBaseline();
  testSubmitAck();
  console.log('  OK  T2V batch helpers (prefix queue + video baseline + submit ack)');
}

try {
  main();
} catch (e) {
  console.error(`  FAIL  T2V batch — ${e.message}`);
  process.exit(1);
}
