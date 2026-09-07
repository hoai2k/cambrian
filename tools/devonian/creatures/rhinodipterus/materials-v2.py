"""Regional cosmine, exposed scale fields and compliant fin pigments; no baked lighting."""
TX=1024;V,U=np.mgrid[0:TX,0:TX].astype(np.float32)/(TX-1);maps={};arrays={}
im=bpy.data.images.load(str(H/'cosmine-source-v2.png'));iw,ih=im.size;source=np.array(im.pixels[:],np.float32).reshape(ih,iw,4)
micro=source[(V*(ih-1)).astype(int),(U*(iw-1)).astype(int),:3].mean(2);micro=np.clip((micro-micro.mean())/(micro.std()+1e-6),-2,2)
def distance(lines):
 d=np.full_like(U,9)
 for points in lines:
  for (ax,ay),(bx,by)in zip(points,points[1:]):
   dx=bx-ax;dy=by-ay;t=np.clip(((U-ax)*dx+(V-ay)*dy)/(dx*dx+dy*dy),0,1);d=np.minimum(d,np.hypot(U-ax-t*dx,V-ay-t*dy))
 return d
seams=[[(.06,.19),(.23,.185),(.43,.20),(.58,.235),(.64,.25)],[(.06,.31),(.23,.315),(.43,.30),(.58,.265),(.64,.25)],[(.40,.20),(.46,.10),(.62,.07)],[(.40,.30),(.46,.40),(.62,.43)],[(.59,.24),(.71,.17),(.80,.16),(.86,.09)],[(.59,.26),(.71,.33),(.80,.34),(.86,.41)],[(.70,.17),(.74,.06),(.85,.015)],[(.70,.33),(.74,.44),(.85,.485)],[(.80,.16),(.87,.25),(.80,.34)]]
seam=np.exp(-(distance(seams)/.00125)**2);fade=np.clip(U/.06,0,1)*np.clip((1-U)/.04,0,1)*np.clip(np.minimum(abs(V),abs(V-.5))/.025,0,1)*(V<.5)
# Pores are a restrained material feature; sensory grooves occupy selected regions.
pore=(np.sin(U*977+np.sin(V*89))*np.sin(V*1059+np.cos(U*101)))**12
headfactor=np.clip(.93+.014*micro-.09*seam-.022*pore,.76,.98);headrelief=(.035*micro-.24*seam-.055*pore)*fade
# Offset cycloid rows give overlapping exposed fields with a smooth anterior shoulder.
row=np.floor(V*45);sx=(U*82+.5*(row%2))%1;sy=(V*45)%1
arc=np.sqrt(((sx-.48)/.60)**2+((sy+.2)/1.18)**2);scaleedge=np.exp(-((arc-1)/.033)**2)
scalefade=np.clip(U/.055,0,1)*np.clip((1-U)/.05,0,1);bodyfactor=.945-.074*scaleedge*scalefade+.014*micro;bodyrelief=(-.22*scaleedge+.014*micro)*scalefade
side=np.cos(2*pi*V);finrays=np.exp(-(np.sin(pi*(side*(7+7*U)+.13*np.sin(U*8)))**2)/.035)*np.clip((U-.20)/.4,0,1)
finfactor=.97-.20*finrays+.012*micro;finrelief=-.028*finrays+.007*micro
def image_map(name,array,noncolor=False):
 img=bpy.data.images.new(name,width=TX,height=TX);img.pixels.foreach_set(array.astype(np.float32).ravel());img.filepath_raw=str(H/(name+'.png'));img.file_format='PNG';img.save();img.pack()
 if noncolor:img.colorspace_settings.name='Non-Color'
 return img
for region,factor,relief,rough in [('head',headfactor,headrelief,.43+.025*micro+.04*seam),('body',bodyfactor,bodyrelief,.48+.025*scaleedge),('fins',finfactor,finrelief,.57+.025*finrays)]:
 rgba=np.ones((TX,TX,4),np.float32);rgba[:,:,:3]=factor[:,:,None];arrays[region]=rgba.copy();albedo=image_map(region+'-albedo-v2',rgba)
 gx=(np.roll(relief,1,1)-np.roll(relief,-1,1))*.45;gy=(np.roll(relief,1,0)-np.roll(relief,-1,0))*.45;length=np.sqrt(gx*gx+gy*gy+1);rgba[:,:,0]=.5+.5*gx/length;rgba[:,:,1]=.5+.5*gy/length;rgba[:,:,2]=.5+.5/length;normal=image_map(region+'-normal-v2',rgba,True)
 rgba[:,:,:3]=np.clip(rough,.3,.7)[:,:,None];roughness=image_map(region+'-roughness-v2',rgba,True);maps[region]=(albedo,normal,roughness)
def pigment(p,material):
 x,y,z=p;base=np.array(M[material].diffuse_color[:3])
 if material in ['head','body','jaw','fins']:
  dorsal=np.clip((z+.10)/.42,0,1);base*=1-.20*dorsal
  ventral=np.clip((-z-.025)/.30,0,1);blend=(.43 if material!='fins'else .16)*ventral;base=base*(1-blend)+np.array([.245,.240,.147])*blend
  band=max(0,sin(y*7.4+.75*sin(z*9)+.3*cos(x*11)))**5
  side=math.exp(-((z-.05)/.24)**2);base*=1-.20*band*side
  freckle=max(0,sin(y*51+x*73+sin(z*61))*sin(z*73-y*29))**8;base*=1-.15*freckle*side
 return(*np.clip(base,0,1),1)
for o in objects:
 # Material boundaries need distinct colour vertices; the eye audit welds geometry.
 bm=bmesh.new();bm.from_mesh(o.data);edges=[e for e in bm.edges if len({f.material_index for f in e.link_faces})>1]
 if edges:bmesh.ops.split_edges(bm,edges=edges)
 bm.to_mesh(o.data);bm.free()
 col=o.data.color_attributes['Color'];materials={i:set()for i in range(len(o.data.vertices))}
 for p in o.data.polygons:
  for i in p.vertices:materials[i].add(o.data.materials[p.material_index].name)
 uv={l.vertex_index:o.data.uv_layers[0].data[i].uv.copy()for i,l in enumerate(o.data.loops)}
 for i,v in enumerate(o.data.vertices):
  names=materials[i];mat='oral'if 'oral'in names else next(iter(names));c=np.array(pigment(v.co,mat)[:3])
  if o==head and mat=='oral':
   w=float(interp(HEAD,v.co.y)[0]);edge=np.clip((abs(v.co.x)/max(.001,w)-.82)/.13,0,1);front=np.clip((-v.co.y-2.08)/.15,0,1);back=np.clip((v.co.y+.99)/.18,0,1);blend=max(edge,front,back);c=c*(1-blend)+np.array(pigment(v.co,'head')[:3])*blend
  if o==jaw and mat=='oral':
   w=float(interp(JAW,v.co.y)[0]);edge=np.clip((abs(v.co.x)/max(.001,w)-.76)/.17,0,1);front=np.clip((-v.co.y-2.14)/.12,0,1);back=np.clip((v.co.y+1.02)/.18,0,1);blend=max(edge,front,back);c=c*(1-blend)+np.array(pigment(v.co,'jaw')[:3])*blend
  if mat=='fins':
   t=uv[i].x;root=np.array(pigment(v.co,'body')[:3]);q=np.clip(t/.42,0,1);c=root*(1-q)+c*q
  if mat=='eyes':c=np.ones(3)
  col.data[i].color=(*c,1)
 # Shared oral aperture edge stays tissue-pigmented, including UV seam duplicates.
 if o==body:
  for i in range(len(o.data.vertices)):
   if materials[i]=={'oral'}:col.data[i].color=pigment(o.data.vertices[i].co,'oral')
# Blend cheek shading into the adjacent cranial plane, rather than retaining a
# hard seam between two independently parameterized skin patches.
for o in objects:
 if not o.name.startswith('Continuous dermal commissure'):continue
 sign=1 if o.name.endswith('1') and not o.name.endswith('-1')else -1
 norms=[];uv=o.data.uv_layers[0];qv={l.vertex_index:uv.data[i].uv.y for i,l in enumerate(o.data.loops)}
 for vertex in o.data.vertices:
  q=1-abs(qv[vertex.index]-(1 if sign>0 else .5))/.020;q=float(np.clip(q,0,1));y=vertex.co.y
  a=.008 if sign>0 else pi-.008;dy=hp(min(-.6801,y+.0003),a)-hp(max(-2.3199,y-.0003),a);da=hp(y,a+.0003)-hp(y,a-.0003);normal=dy.cross(da).normalized()
  if normal.x*sign<0:normal=-normal
  amount=q**5;normal=(vertex.normal*(1-amount)+normal*amount).normalized();norms.append(normal)
 o.data.normals_split_custom_set_from_vertices(norms)
for name,mat in M.items():
 nodes=mat.node_tree.nodes;links=mat.node_tree.links;bs=nodes.get('Principled BSDF');bs.inputs['Coat Weight'].default_value=.08 if name=='eyes'else .025
 if name=='eyes':continue
 vc=nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';links.new(vc.outputs['Color'],bs.inputs['Base Color'])
 if name in maps:
  a,n,r=maps[name];tex=nodes.new('ShaderNodeTexImage');tex.image=a;mix=nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;links.new(vc.outputs['Color'],mix.inputs[1]);links.new(tex.outputs['Color'],mix.inputs[2]);links.new(mix.outputs[0],bs.inputs['Base Color'])
  tx=nodes.new('ShaderNodeTexImage');tx.image=n;nm=nodes.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.65;links.new(tx.outputs['Color'],nm.inputs['Color']);links.new(nm.outputs['Normal'],bs.inputs['Normal']);tx=nodes.new('ShaderNodeTexImage');tx.image=r;links.new(tx.outputs['Color'],bs.inputs['Roughness'])
 if name=='fins':bs.inputs['Specular IOR Level'].default_value=.20
