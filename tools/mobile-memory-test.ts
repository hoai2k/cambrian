import { conserveCreatureMemory, constrainedTouch, qualityForDevice, type DeviceHints } from '../src/shared/mobile-memory';

const limited: DeviceHints = { touch: true, memoryGB: 4, logicalCores: 8 };
const olderNoMemory: DeviceHints = { touch: true, logicalCores: 6 };
const powerful: DeviceHints = { touch: true, memoryGB: 8, logicalCores: 8 };
const desktop: DeviceHints = { touch: false, memoryGB: 4, logicalCores: 4 };
const check = (condition: boolean, message: string) => { if (!condition) throw new Error(message); };

check(constrainedTouch(limited), '4 GB touch device should use the lighter default');
check(constrainedTouch(olderNoMemory), 'limited CPU can stand in for an unavailable memory hint');
check(!constrainedTouch(powerful), 'capable touch hardware should keep high quality');
check(!constrainedTouch(desktop), 'desktop should keep high quality');
check(!constrainedTouch({ touch: true }), 'unknown hardware should not be classified as limited');
check(qualityForDevice(undefined, limited) === 'low', 'limited touch default should be low');
check(qualityForDevice({ quality: 'high' }, limited) === 'low', 'old automatic high should be re-evaluated');
check(qualityForDevice({ quality: 'high', qualityExplicit: true }, limited) === 'high', 'explicit high must win');
check(qualityForDevice({ quality: 'low', qualityExplicit: true }, powerful) === 'low', 'explicit low must win');
check(qualityForDevice(undefined, powerful) === 'high', 'capable touch default should be high');
check(qualityForDevice(undefined, desktop) === 'high', 'desktop default should stay high');
check(conserveCreatureMemory('low', limited, 'triassic'), 'Triassic low-touch should conserve NPC models');
check(conserveCreatureMemory('low', limited, 'devonian'), 'Devonian low-touch should conserve NPC models');
check(!conserveCreatureMemory('high', limited, 'triassic'), 'explicit high should enable full Triassic detail');
check(!conserveCreatureMemory('low', limited, 'cambrian'), 'Cambrian does not need the large-model policy');
check(!conserveCreatureMemory('low', desktop, 'triassic'), 'desktop low should not use the touch policy');
console.log('PASS: device quality defaults, explicit choices, and era memory policy');
