/**
 * Level metering for the sample library.
 *
 * A sound can measure loud and still be inaudible in play. `ui-start` was: almost all of its
 * energy sat below 150 Hz, where laptop and phone speakers simply do not reproduce, so it read
 * as silence however loud the meter said it was. So every sample is measured twice — as it is,
 * and again through a high-pass — and it is the second number that says whether a player will
 * hear it.
 */
import { audio } from '../audio/audio';

export interface Level {
  /** Peak and RMS of the file as it is, in dBFS. */
  peak: number; rms: number;
  /** The same, of everything above 150 Hz: what a small speaker can actually reproduce. */
  midPeak: number; midRms: number;
}

/** Below this mid-band peak a sound will not read on a laptop speaker, whatever the meter says. */
export const QUIET_MID_PEAK = -18;
/** Where the small-speaker high-pass sits, roughly the low limit of a laptop speaker. */
const SMALL_SPEAKER_HZ = 150;

const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : -Infinity);

function peakRms(buf: AudioBuffer) {
  let peak = 0, sum = 0, n = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; }
  }
  return { peak, rms: n ? Math.sqrt(sum / n) : 0 };
}

/** Measure one file. Returns undefined if it could not be fetched or decoded. */
export async function measure(url: string): Promise<Level | undefined> {
  const buf = await audio.decode(url);
  if (!buf) return undefined;
  const full = peakRms(buf);

  const off = new OfflineAudioContext(1, buf.length, buf.sampleRate);
  const src = off.createBufferSource(); src.buffer = buf;
  const hp = off.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = SMALL_SPEAKER_HZ;
  src.connect(hp); hp.connect(off.destination); src.start();
  const mid = peakRms(await off.startRendering());

  return { peak: db(full.peak), rms: db(full.rms), midPeak: db(mid.peak), midRms: db(mid.rms) };
}

export const formatLevel = (l: Level) => `${l.midPeak.toFixed(1)} dB`;
export const isQuiet = (l: Level) => l.midPeak < QUIET_MID_PEAK;
