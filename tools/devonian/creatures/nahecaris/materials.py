"""Nahecaris interrupted carapace striae and warm, region-specific chitin pigments."""
TX=768;V,U=np.mgrid[0:TX,0:TX].astype(np.float32)/(TX-1);arrays={};maps={}
im=bpy.data.images.load(str(H/'cuticle-source.png'));iw,ih=im.size;src=np.array(im.pixels[:],np.float32).reshape(ih,iw,4);micro=src[(V*(ih-1)).astype(int),(U*(iw-1)).astype(int),:3].mean(2);micro=np.clip((micro-micro.mean())/(micro.std()+1e-6),-2,2)
def image_map(name,arr,noncolor=False):
 im=bpy.data.images.new(name,width=TX,height=TX);im.pixels.foreach_set(arr.astype(np.float32).ravel());im.filepath_raw=str(H/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
for region in ['carapace','body','antenna']:
 if region=='carapace':
  arc=V+.095*np.sin(pi*U);striae=np.exp(-np.sin(pi*(arc*62+.15*np.sin(U*44)))**2/.045);broken=.3+.7*(np.sin(U*47+V*31)>.1);striae*=broken*(.4+.6*V);factor=.95-.08*striae+.018*micro;relief=-.037*striae+.007*micro
 elif region=='body':
  striae=np.exp(-np.sin(pi*(U*15+.4*np.cos(2*pi*V)))**2/.05);factor=.95-.045*striae+.013*micro;relief=-.021*striae+.009*micro
 else:striae=np.exp(-np.sin(pi*U*18)**2/.03);factor=.97-.045*striae+.009*micro;relief=-.015*striae
 rgba=np.ones((TX,TX,4),np.float32);rgba[:,:,:3]=factor[:,:,None];arrays[region]=rgba.copy();albedo=image_map(region+'-albedo',rgba);gx=(np.roll(relief,1,1)-np.roll(relief,-1,1))*.7;gy=(np.roll(relief,1,0)-np.roll(relief,-1,0))*.7;length=np.sqrt(gx*gx+gy*gy+1);rgba[:,:,0]=.5+.5*gx/length;rgba[:,:,1]=.5+.5*gy/length;rgba[:,:,2]=.5+.5/length;normal=image_map(region+'-normal',rgba,True);rgba[:,:,:3]=(.46+.035*striae+.018*micro)[:,:,None];rough=image_map(region+'-roughness',rgba,True);maps[region]=(albedo,normal,rough)
for o in objects:
 mat=o.data.materials[0].name;col=o.data.color_attributes['Color'];uv={l.vertex_index:o.data.uv_layers[0].data[i].uv for i,l in enumerate(o.data.loops)}
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;c=np.array(M[mat].diffuse_color[:3]);u,q=uv[i]
  if mat in ['head','body','carapace','limbs','antenna']:
   blotch=.5+.5*sin(x*14+y*7+.3*sin(y*31));c*=1-.12*blotch**4
   if mat=='carapace':
    dorsal=(1-q)**2;c*=1-.21*dorsal;edge=np.clip((q-.72)/.28,0,1)*.25;c=c*(1-edge)+np.array([.32,.232,.136])*edge;c*=1-.095*math.exp(-((q-.42)/.06)**2)
   elif mat=='body':c*=1-.22*np.clip((z+.07)/.35,0,1)
   elif mat=='antenna':c*=1-.12*u
  # The recessed continuous head surface forms the oral roof; give its interior
  # the same tissue pigment as the attached vestibule, not external cuticle.
  if mat=='head' and z<-.025:
   inside=(x/.071)**2+((y+1.265)/.091)**2
   amount=float(np.clip((1.18-inside)/.25,0,1))
   c=c*(1-amount)+np.array(M['oral'].diffuse_color[:3])*amount
  if mat=='eyes':c=np.ones(3)
  col.data[i].color=(*np.clip(c,0,1),1)
for name,mat in M.items():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.065 if name=='eyes'else .035
 if name=='eyes':continue
 vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name in maps:
  a,n,r=maps[name];tex=nodes.new('ShaderNodeTexImage');tex.image=a;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color']);tx=nodes.new('ShaderNodeTexImage');tx.image=n;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);tx=nodes.new('ShaderNodeTexImage');tx.image=r;links.new(tx.outputs['Color'],bs.inputs['Roughness'])
