import assert from 'node:assert/strict';

/** Exporter bookkeeping is harmless only when the complete scale curve is identity. */
export function assertStaticIdentityScale(sampler, node, label) {
  const output = sampler.getOutput(), values = output.getArray();
  const interpolation = sampler.getInterpolation(), cubic = interpolation === 'CUBICSPLINE';
  assert(['LINEAR', 'STEP', 'CUBICSPLINE'].includes(interpolation), `${label}: unknown scale interpolation`);
  assert.equal(output.getType(), 'VEC3', `${label}: invalid scale vector`);
  assert(node.getScale().every(v => v === 1), `${label}: scale channel changes nonidentity bind scale`);
  const keys = sampler.getInput().getCount();
  assert(keys > 0 && output.getCount() === keys * (cubic ? 3 : 1), `${label}: invalid scale key/tangent count`);
  for (let i = 0; i < values.length; i++) {
    assert(Number.isFinite(values[i]), `${label}: nonfinite scale`);
    // glTF cubic keys contain in-tangent, value, out-tangent VEC3 triplets.
    // Identity values alone are insufficient: a nonzero tangent changes scale
    // between keys even when both endpoints are exactly one.
    const expected = cubic && Math.floor(i / 3) % 3 !== 1 ? 0 : 1;
    assert.equal(values[i], expected, `${label}: nonidentity scale value or nonzero cubic tangent`);
  }
}
