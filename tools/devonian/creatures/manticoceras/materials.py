"""Anatomy-led shell increments and soft-body pigment; original imagegen microtexture."""
TX=768;V,U=np.mgrid[0:TX,0:TX].astype(np.float32)/(TX-1);arrays={};maps={}
im=bpy.data.images.load(str(H/'shell-source.png'));iw,ih=im.size;src=np.array(im.pixels[:],np.float32).reshape(ih,iw,4);micro=src[(V*(ih-1)).astype(int),(U*(iw-1)).astype(int),:3].mean(2);micro=np.clip((micro-micro.mean())/(micro.std()+1e-6),-2,2);micro*=np.sin(pi*U)**2*np.sin(pi*V)**2
def image_map(name,arr,noncolor=False):
 im=bpy.data.images.new(name,width=TX,height=TX);im.pixels.foreach_set(arr.astype(np.float32).ravel());im.filepath_raw=str(H/(name+'.png'));im.file_format='PNG';im.save();im.pack()
 if noncolor:im.colorspace_settings.name='Non-Color'
 return im
for region in ['shell','body','arms']:
 if region=='shell':
  # Shell U follows whorl growth, V crosses flank/venter; biconvex increments.
  a=V*2*pi;course=U+.013*np.sin(2*a)-.006*np.sin(4*a);fine=np.exp(-np.sin(pi*(course*113))**2/.035);band=(.5+.5*np.sin(2*pi*(course*9+.065*np.sin(course*41))))**8;factor=1-.20*band-.035*fine+.019*micro;relief=-.036*fine+.005*micro
 elif region=='body':
  mottles=(.5+.5*np.sin(U*31+np.sin(6*pi*V))*np.cos(8*pi*V))**4;factor=.97-.13*mottles+.013*micro;relief=.006*micro+.007*mottles
 else:
  mottles=(.5+.5*np.sin(U*45+np.sin(4*pi*V)))**6;factor=.98-.09*mottles+.012*micro;relief=.004*micro
 rgba=np.ones((TX,TX,4),np.float32);rgba[:,:,:3]=factor[:,:,None];arrays[region]=rgba.copy();albedo=image_map(region+'-albedo',rgba);gx=(np.roll(relief,1,1)-np.roll(relief,-1,1))*.8;gy=(np.roll(relief,1,0)-np.roll(relief,-1,0))*.8;length=np.sqrt(gx*gx+gy*gy+1);rgba[:,:,0]=.5+.5*gx/length;rgba[:,:,1]=.5+.5*gy/length;rgba[:,:,2]=.5+.5/length;normal=image_map(region+'-normal',rgba,True);rgba[:,:,:3]=(.41+.025*micro+.035*(1-factor))[:,:,None];rough=image_map(region+'-roughness',rgba,True);maps[region]=(albedo,normal,rough)
for o in objects:
 mat=o.data.materials[0].name;col=o.data.color_attributes['Color'];uv={l.vertex_index:o.data.uv_layers[0].data[i].uv for i,l in enumerate(o.data.loops)}
 for i,v in enumerate(o.data.vertices):
  x,y,z=v.co;c=np.array(M[mat].diffuse_color[:3]);u,q=uv[i]
  if mat=='shell':
   flank=abs(sin(q*2*pi));c=c*(.88+.12*flank);c*=1-.10*(.5+.5*sin(17*u+2*sin(2*pi*q)))**8
  elif mat in ['body','arms']:
   if mat=='body':ventral=np.clip((-z-.06)/.34,0,1)*.42
   else:ventral=(.5-.5*cos(2*pi*q))*.35
   c=c*(1-ventral)+np.array(M['underside'].diffuse_color[:3])*ventral;c*=1-.10*(.5+.5*sin(x*29+y*23+z*19))**4
   if o.name=='head_envelope_closed' and y<-1.38:
    inside=(x/.080)**2+((z-.006)/.078)**2;amount=float(np.clip((1.15-inside)/.25,0,1));c=c*(1-amount)+np.array(M['oral'].diffuse_color[:3])*amount
  if mat=='eyes':c=np.ones(3)
  col.data[i].color=(*np.clip(c,0,1),1)
for name,mat in M.items():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Coat Weight'].default_value=.09 if name=='eyes'else .025
 if name=='eyes':continue
 vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name in maps:
  a,n,r=maps[name];tex=nodes.new('ShaderNodeTexImage');tex.image=a;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color']);tx=nodes.new('ShaderNodeTexImage');tx.image=n;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.55;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);tx=nodes.new('ShaderNodeTexImage');tx.image=r;links.new(tx.outputs['Color'],bs.inputs['Roughness'])
