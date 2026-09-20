/** Package-independent parity proof for Shonisaurus' authored body, puppet and LOD. */
import { auditPair } from '../_pipeline/paired-audit.mjs';

const result = await auditPair({
  id: 'shonisaurus',
  base: 'public/assets/triassic/creatures/shonisaurus',
  here: 'tools/triassic/creatures/shonisaurus',
  local: 'local/triassic-authoring/shonisaurus',
  joints: 21,
  sockets: 3,
});
result.write();
console.log(JSON.stringify({
  id: result.report.id,
  clips: result.report.clips,
  exactRigParity: result.report.exactRigParity,
  exactAnimationParity: result.report.exactAnimationParity,
  exactAnchorParity: result.report.exactAnchorParity,
  normalizedWeights: result.report.normalizedWeights,
}, null, 2));
