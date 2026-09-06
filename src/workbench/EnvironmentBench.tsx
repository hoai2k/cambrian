import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import manifest from '../../public/assets/props/manifest.json';
import { loadPropGeometry, type PropId } from '../render/props';
import { BIOME_ART, biomeArtPath, RADAR_GLYPHS, radarGlyphPath } from '../shared/environment-assets';
import './environment.css';
const base = import.meta.env.BASE_URL.startsWith('/') ? import.meta.env.BASE_URL : '../';

function PropPreview({ id }: { id: PropId }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const el = host.current!;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#18323b');
    const camera = new THREE.PerspectiveCamera(35, 1, .01, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', `${id} interactive 3D preview`);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enablePan = false;
    scene.add(new THREE.HemisphereLight('#e6f6f6', '#605949', 2));
    const light = new THREE.DirectionalLight('#fff0d4', 3); light.position.set(3, 5, 4); scene.add(light);
    let disposed = false, geometry: THREE.BufferGeometry | undefined;
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .88, side: id === 'lettuce-tuft' ? THREE.DoubleSide : THREE.FrontSide });
    const draw = () => { if (!disposed) renderer.render(scene, camera); };
    controls.addEventListener('change', draw);
    const observer = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect(); renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); draw();
    }); observer.observe(el);
    void loadPropGeometry(id, base).then(g => {
      if (disposed) { g.dispose(); return; } geometry = g; g.computeBoundingBox();
      const bounds = g.boundingBox!, centre = bounds.getCenter(new THREE.Vector3()), size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z);
      scene.add(new THREE.Mesh(g, material)); controls.target.copy(centre);
      camera.position.copy(centre).add(new THREE.Vector3(1.25, .85, 1.8).multiplyScalar(radius));
      controls.minDistance = radius * .6; controls.maxDistance = radius * 5; controls.update();
      el.dataset.loaded = 'true'; draw();
    }).catch(() => { if (!disposed) setError('Preview failed to load. Download the GLB below.'); });
    return () => { disposed = true; observer.disconnect(); controls.dispose(); geometry?.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); };
  }, [id]);
  return <div className="prop-preview" ref={host}>{error && <p role="alert">{error}</p>}</div>;
}

export function EnvironmentBench() {
  return <div className="bench environment-bench">
    <header className="bench-head"><div><a className="back" href="./">← Workbenches</a><h1>Environment</h1>
      <p className="sub">Seven props, nine painted biomes, five radar marks. Drag a model to orbit; scroll to zoom.</p></div></header>
    <p className="environment-note">All props are static and need no rigging. Rounded props appear in the shallows and nurseries; angular rocks and sponges appear in the channels, escarpment and basin. Paintings appear behind biome announcements, and the radar uses the new marks.</p>
    <h2>Seabed props</h2><div className="environment-grid">
      {manifest.props.map(p => <article className="environment-card" key={p.id}>
        <PropPreview id={p.id as PropId}/><div className="environment-copy"><h3>{p.id.replaceAll('-', ' ')}</h3>
        <p>{p.width} × {p.height} units · {p.triangles} triangles · No rigging</p><p>{p.movement}</p>
        <a href={`${base}${p.file}`} download>Download GLB</a></div></article>)}
    </div>
    <h2>Biome paintings</h2><div className="environment-grid">
      {BIOME_ART.map(b => <article className="environment-card" key={b.id}><a href={`${base}${biomeArtPath(b.id)}`}><img className="biome-painting" src={`${base}${biomeArtPath(b.id)}`} alt={`${b.name}, Cambrian underwater landscape`} width="1024" height="576" loading="lazy"/></a><div className="environment-copy"><h3>{b.name}</h3><p>1024 × 576 · WebP</p></div></article>)}
    </div>
    <h2>Radar marks</h2><div className="radar-samples">{RADAR_GLYPHS.map(id => <a key={id} href={`${base}${radarGlyphPath(id)}`}><span aria-hidden="true" className="radar-glyph" style={{maskImage:`url(${base}${radarGlyphPath(id)})`}}/><span>{id}</span><span className="radar-glyph tiny" aria-hidden="true" style={{maskImage:`url(${base}${radarGlyphPath(id)})`}}/></a>)}</div>
  </div>;
}
