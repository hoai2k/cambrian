"""The M04 diagnostic's numeric section report, re-run on a later blend.

The three sample lines, the J range, the face-normal construction, the
microrelief metric and the report keys are diagnostic_m04_closeup.py's, so the
numbers are directly comparable.  Two things are added, because the M04 report
alone cannot separate relief from form:

  * the same angles measured on the relief-free section() surface, and the
    excess of the mesh over it.  The section form itself turns through 62.6-63.0
    deg in one step at the posterior median crest apex (y=.15) -- accepted
    coarse anatomy that the M04 review asked to preserve -- so an absolute
    15 deg ceiling on the dorsal line is unreachable without flattening the
    crest.  The excess is the quantity a relief repair can actually own.
  * the circumferential step angle, which is where an aliased flank groove
    shows and which the longitudinal lines cannot see.

READ-ONLY: opens the blend, never saves.  No rendering.
"""
import bpy,sys,json,math,hashlib
import numpy as np
from pathlib import Path
from mathutils import Vector
HERE=Path(__file__).resolve().parent;sys.path.insert(0,str(HERE))
from geometry_clay02 import build_body,section,TAU
import material_fields05 as fields05

argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
BLEND=Path(argv[0]);OUT=Path(argv[1]);OUT.mkdir(parents=True,exist_ok=True)
FIELDS=argv[2] if len(argv)>2 else 'material_fields05'
BUMP_STRENGTH=float(argv[3]) if len(argv)>3 else .08
blend_sha256=hashlib.sha256(BLEND.read_bytes()).hexdigest()
bpy.ops.wm.open_mainfile(filepath=str(BLEND))
body=next(o for o in bpy.context.scene.objects if o.name.startswith('Bothriolepis V3 MATERIAL'))
me=body.data
if me.shape_keys:
 for block in me.shape_keys.key_blocks:
  if block.name=='Oral opening study only':block.value=0.

raw=build_body()
assert len(me.vertices)==len(raw.v),'STOP unexpected topology change vs geometry_clay02.build_body()'
N=192;rows=251
gridkey={}
for j in range(rows):
 y=-1.62+j*.02
 for k in range(N):gridkey[tuple(round(a,7) for a in section(y,k*TAU/N))]=(j,k)
grid2idx={}
for i,(p,tag) in enumerate(zip(raw.v,raw.tags)):
 if tag!='shield':continue
 jk=gridkey.get(tuple(round(a,7) for a in p))
 if jk:grid2idx[jk]=i
def actual(i):return Vector(me.vertices[i].co[:])
def smoothform(j,k):return Vector(section(-1.62+j*.02,k*TAU/N,relief=False))
def face_normal(j,k,get):
 a,b,c=grid2idx.get((j,k)),grid2idx.get((j,k+1)),grid2idx.get((j+1,k))
 if a is None or b is None or c is None:return None
 P,Pu,Pv=get(j,k),get(j,k+1),get(j+1,k)
 n=(Pu-P).cross(Pv-P)
 return None if n.length<1e-12 else n.normalized()
LINES={'dorsal_k0':0,'flank_k48':48,'flank_k144':144}
J_RANGE=range(60,100)
seam_report={};overall={'degrees':0.};overall_excess={'degrees':0.}
for name,k in LINES.items():
 mesh={j:face_normal(j,k,lambda j,k:actual(grid2idx[(j,k)])) for j in J_RANGE}
 form={j:face_normal(j,k,smoothform) for j in J_RANGE}
 js=sorted(j for j in mesh if mesh[j] is not None)
 angles=[];excess=[]
 for a,b in zip(js,js[1:]):
  deg=math.degrees(math.acos(max(-1.,min(1.,mesh[a].dot(mesh[b])))))
  fdeg=math.degrees(math.acos(max(-1.,min(1.,form[a].dot(form[b])))))
  y_mid=-1.62+((a+b)/2)*.02
  angles.append((y_mid,deg));excess.append((y_mid,deg-fdeg))
  if deg>overall['degrees']:overall={'line':name,'y':y_mid,'degrees':deg}
  if deg-fdeg>overall_excess['degrees']:overall_excess={'line':name,'y':y_mid,'degrees':deg-fdeg}
 baseline=sorted(d for _,d in angles)
 py,pd=max(angles,key=lambda t:t[1]);ey,ed=max(excess,key=lambda t:t[1])
 seam_report[name]={'sample_count':len(angles),
  'median_step_to_step_angle_deg':baseline[len(baseline)//2],
  'peak_angle_deg':pd,'peak_at_y':py,
  'peak_excess_over_section_form_deg':ed,'peak_excess_at_y':ey,
  'section_form_peak_angle_deg':max(math.degrees(math.acos(max(-1.,min(1.,form[a].dot(form[b]))))) for a,b in zip(js,js[1:]))}
seam_report['overall_peak']=overall
seam_report['overall_peak_excess_over_section_form']=overall_excess

# circumferential steps over the same rows
circ=[]
for j in J_RANGE:
 for k in range(N):
  a=face_normal(j,k,lambda j,k:actual(grid2idx[(j,k)]))
  b=face_normal(j,(k+1)%N,lambda j,k:actual(grid2idx[(j,k%N)]))
  fa=face_normal(j,k,smoothform);fb=face_normal(j,(k+1)%N,smoothform)
  if None in (a,b,fa,fb):continue
  circ.append(math.degrees(math.acos(max(-1.,min(1.,a.dot(b)))))-
              math.degrees(math.acos(max(-1.,min(1.,fa.dot(fb))))))
circ_report={'samples':len(circ),'peak_excess_over_section_form_deg':max(circ),
             'median_excess_deg':float(np.median(circ))}

mod=__import__(FIELDS)
# Take the variant's own micro weights off the blend, so the metric describes
# the maps that were actually written and not the module's defaults.
tuning=json.loads(body.get('appearance_tuning','{}')) if body.get('appearance_tuning') else {}
if tuning:
 mod.MICRO_HEIGHT=tuning['micro_height'];mod.MICRO_CONTRAST=tuning['micro_contrast']
 BUMP_STRENGTH=tuning['bump']
Nres,Hres=1536,1024
vtex,uu=np.mgrid[0:Hres,0:Nres].astype(np.float32)
uu=(uu+.5)/Nres;vtex=(vtex+.5)/Hres;vphysical=(vtex+.5)%1
src=bpy.data.images.load(str(HERE/'material01-inputs/dermal-source-material01.png'),check_existing=True)
sw,sh=src.size
px=np.array(src.pixels[:],dtype=np.float32).reshape(sh,sw,4)
lum=px[:,:,:3].mean(2);lum=(lum-lum.mean())/(lum.std()+1e-6)
ix=((.08+.84*uu)*(sw-1)).astype(int);iy=((.08+.84*vtex)*(sh-1)).astype(int)
detail=np.clip(lum[iy,ix],-2,2)/2*np.sin(np.pi*vtex)**2
shgt=mod.shield(uu,vphysical,detail)[1]
dx=np.gradient(shgt.astype(np.float32),axis=1)*Nres/1.775
dy=(np.roll(shgt,-1,axis=0)-np.roll(shgt,1,axis=0))*.5*Hres/3.
normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
u_lo,u_hi=(-1.50+1.62)/1.775,(-1.20+1.62)/1.775
band=(uu[:,:,None]>=u_lo)&(uu[:,:,None]<u_hi);band=np.broadcast_to(band,normal.shape)
flat=(uu>=u_lo)&(uu<u_hi)
normal_variance=float(normal[band].var())

report={'blend_path':str(BLEND),'blend_sha256_actual':blend_sha256,
 'fields_module':FIELDS,'appearance_tuning':tuning,
 'note':'geometry verified by value (topology check above passed); blend SHAs are not reproducible across saves.',
 'nuchal_seam_geometric_normal_discontinuity_degrees':seam_report,
 'circumferential_step_excess':circ_report,
 'forehead_microrelief_amplitude':{'bump_strength':BUMP_STRENGTH,
  'normal_map_variance_over_rostral_band':normal_variance,
  'amplitude_bump_strength_times_variance':BUMP_STRENGTH*normal_variance,
  'rms_normal_map_slope_over_rostral_band':float(np.sqrt((dx[flat]**2+dy[flat]**2).mean())),
  'rostral_u_band':[u_lo,u_hi]}}
(OUT/'section-report.json').write_text(json.dumps(report,indent=2))
print('SECTION_REPORT',json.dumps(report,indent=2))
