"""Imagegen microcuticle plus region-specific pigmentation and deliberate PBR maps.

v2: the dorsal/belly world-z shading thresholds below are retuned for the v2 body's flatter
opisthosoma. Measured segment heights: shipped mean h=.19708 (segs [.235,.25,.25,.244,.23,.218,
.20,.18,.164,.149,.132,.113]), v2 mean h=.16583 (segs [.19,.20,.20,.20,.195,.185,.17,.15,.14,.13,
.12,.11]) -> h_ratio=.8414, applied to the dorsal offset/range (which track the dorsal surface's
h-driven peak). The ventral term shrank separately (vent .125->.08, ratio .64, build_v2.py), so
the belly offset/range - which track ventral depth - are scaled by that vent ratio instead:
  dorsal (z+.08)/.28   -> (z+.0673)/.2356   (.08*.8414, .28*.8414)
  belly  (-z-.025)/.22 -> (-z-.016)/.1408   (.025*.64, .22*.64)
A direct numeric check (tools/devonian/creatures/jaekelopterus, scratch measure.py) confirms these
keep the two bands at closely the same relative position on the new surface: old dorsal boundary
fractions of the shell's z-range were .137/.836, the scaled thresholds land v2's at .074/.847;
old belly fractions were .274/-.275, v2's land at .242/-.220.
"""
TX=768;V,U=np.mgrid[0:TX,0:TX].astype(np.float32)/(TX-1);arrays={};maps={}
im=bpy.data.images.load(str(H/'cuticle-source.png'));iw,ih=im.size;src=np.array(im.pixels[:],np.float32).reshape(ih,iw,4);micro=src[(V*(ih-1)).astype(int),(U*(iw-1)).astype(int),:3].mean(2);micro=np.clip((micro-micro.mean())/(micro.std()+1e-6),-2,2)
def image_map(name,arr,noncolor=False):
 im=bpy.data.images.new(name,width=TX,height=TX);im.pixels.foreach_set(arr.astype(np.float32).ravel());im.filepath_raw=str(H/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
for region in ['head','body','legs','paddle']:
 edge=np.exp(-((U-.93)/.026)**2)if region=='body'else np.zeros_like(U)
 # Fine crescent ornament, sparse on appendages; no macroscopic fake plates.
 density=1 if region in ['head','body']else .60
 relief=.026*micro*density-.035*edge
 factor=.94+.022*micro*density-.08*edge
 if region=='paddle':
  margin=np.clip((abs(np.cos(2*pi*V))-.65)/.35,0,1);factor-=.12*margin+.06*np.exp(-((U-.77)/.010)**2);relief-=.03*np.exp(-((U-.77)/.01)**2)
 rgba=np.ones((TX,TX,4),np.float32);rgba[:,:,:3]=factor[:,:,None];arrays[region]=rgba.copy();albedo=image_map(region+'-albedo',rgba)
 gx=(np.roll(relief,1,1)-np.roll(relief,-1,1))*.9;gy=(np.roll(relief,1,0)-np.roll(relief,-1,0))*.9;length=np.sqrt(gx*gx+gy*gy+1);rgba[:,:,0]=.5+.5*gx/length;rgba[:,:,1]=.5+.5*gy/length;rgba[:,:,2]=.5+.5/length;normal=image_map(region+'-normal',rgba,True)
 rgba[:,:,:3]=(.41+.026*micro+.055*edge)[:,:,None];rough=image_map(region+'-roughness',rgba,True);maps[region]=(albedo,normal,rough)
for o in objects:
 mat=o.data.materials[0].name;col=o.data.color_attributes['Color'];uv={l.vertex_index:o.data.uv_layers[0].data[i].uv for i,l in enumerate(o.data.loops)}
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;c=np.array(M[mat].diffuse_color[:3]);u,q=uv[i]
  if mat in ['head','body','legs','paddle']:
   dorsal=np.clip((z+.0673)/.2356,0,1);shade=.16*(1+sin(y*2.7+x*3.3)*sin(x*9+y*4.1));c*=1-shade*dorsal
   c*=1-.24*math.exp(-(x/.23)**4)*dorsal
   belly=np.clip((-z-.016)/.1408,0,1)*.40;c=c*(1-belly)+np.array([.22,.177,.102])*belly
   blotch=max(0,sin(x*14+y*9+.4*sin(x*24)))**6;c*=1-.10*blotch
   # Margin is an intrinsic colour transition, not a raised decorative border.
   if mat=='body':c*=1-.20*math.exp(-((u-.93)/.035)**2)
   if mat=='head':c*=1-.14*(abs(x)/.65)**4
  if mat=='eyes':c=np.ones(3)
  col.data[i].color=(*np.clip(c,0,1),1)
for name,mat in M.items():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.08 if name=='eyes'else .045
 if name=='eyes':continue
 vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name in maps:
  a,n,r=maps[name];tex=nodes.new('ShaderNodeTexImage');tex.image=a;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
  tx=nodes.new('ShaderNodeTexImage');tx.image=n;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);tx=nodes.new('ShaderNodeTexImage');tx.image=r;links.new(tx.outputs['Color'],bs.inputs['Roughness'])
