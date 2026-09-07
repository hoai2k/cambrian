"""Walliserops trifurcatus rigid trident and spine fields, authored from primary figs1–3.
All cuticular projections have rigid weights to their anatomical shell; no fake appendage joints.
"""
# Curved elliptical keel-bearing loft. Cross section broadens into flattened spatulate blades.
def keeled(n,points,widths,depths,bone='cephalon'):
 v=[];uv=[];N=20
 for j,p in enumerate(points):
  p=Vector(p);d=Vector(points[min(j+1,len(points)-1)])-Vector(points[max(j-1,0)]);d.normalize();side=d.cross(Vector((0,0,1))).normalized();up=side.cross(d).normalized()
  for k in range(N):
   th=2*pi*k/N;xx=cos(th);zz=sin(th);keel=1+.32*abs(zz)**8
   v.append(tuple(p+side*widths[j]*xx+up*depths[j]*zz*keel));uv.append((k/N,j/(len(points)-1)))
 f=[(j*N+k,j*N+(k+1)%N,(j+1)*N+(k+1)%N,(j+1)*N+k)for j in range(len(points)-1)for k in range(N)];f.extend([tuple(range(N-1,-1,-1)),tuple((len(points)-1)*N+k for k in range(N))]);return mesh(n,v,f,'body',bone,uvs=uv,sub=1)
# A flared organic root narrows into the haft; the distal haft rises before branching.
keeled('trident_haft',[(0,-1.03,.16),(0,-1.35,.16),(0,-1.52,.21),(0,-1.80,.27),(.012,-2.10,.35),(.018,-2.34,.45),(.014,-2.49,.49)],[.12,.09,.073,.068,.072,.09,.105],[.060,.060,.065,.062,.065,.066,.055])
# Central tine branches from the left outer arm rather than perfect geometric three-way symmetry.
keeled('trident_tine_left',[(.016,-2.36,.455),(.14,-2.57,.51),(.28,-2.86,.55),(.38,-3.16,.58),(.40,-3.40,.61),(.36,-3.66,.70),(.345,-3.71,.72)],[.072,.087,.115,.139,.12,.025,.004],[.055,.041,.036,.035,.030,.012,.003])
keeled('trident_tine_right',[(.006,-2.36,.455),(-.13,-2.59,.51),(-.28,-2.87,.55),(-.37,-3.18,.59),(-.365,-3.44,.63),(-.32,-3.66,.71),(-.31,-3.71,.73)],[.072,.078,.108,.131,.101,.023,.004],[.055,.040,.035,.035,.029,.012,.003])
keeled('trident_tine_middle',[(.075,-2.47,.49),(.047,-2.66,.515),(.026,-2.91,.545),(.018,-3.20,.575),(.018,-3.50,.625),(.012,-3.78,.715),(.009,-3.83,.73)],[.049,.066,.085,.100,.080,.019,.003],[.041,.036,.033,.032,.027,.010,.003])
# Long genal spines emerge from outer cheek and sweep behind the thorax.
for side in [-1,1]:
 ss='L'if side>0 else'R'
 keeled('genal_spine_'+ss,[(side*.88,-.40,-.06),(side*.99,-.19,-.12),(side*1.09,.14,-.18),(side*1.15,.52,-.22),(side*1.14,.92,-.27),(side*1.10,1.18,-.31)],[.105,.09,.068,.045,.022,.002],[.070,.062,.048,.035,.018,.002])
 # Smaller supraocular backward thorn, based on primary dorsal model view.
 keeled('supraocular_spine_'+ss,[(side*.76,-.73,headz(side*.76,-.73)-.01),(side*.91,-.67,.23),(side*1.02,-.48,.13),(side*1.04,-.33,.07)],[.060,.045,.025,.002],[.053,.039,.021,.002])
# One axial spine plus paired pleural tips on each of eleven rigid thoracic segments.
for i in range(11):
 y=-.04+i*STEP;bone=f'thorax_{i+1:02d}';w=.91-.022*i-.0012*i*i
 length=.16+.13*sin(pi*(i+1)/13)
 keeled(f'axial_spine_{i+1:02d}',[(0,y+.09,.34),(0,y+.14,.43),(0,y+.26,.46+length*.4),(0,y+.36,.45+length)],[.044,.031,.018,.0015],[.046,.032,.018,.0015],bone)
 for side in [-1,1]:
  keeled(f'pleural_spine_{i+1:02d}_{side}',[(side*w*.90,y+.16,-.10),(side*(w+.07),y+.21,-.14),(side*(w+.23),y+.32,-.22),(side*(w+.28),y+.43,-.28)],[.046,.043,.024,.0015],[.032,.032,.020,.0015],bone)
# Five marginal pairs and a single terminal pygidial process (asteropygine planform).
for side in [-1,1]:
 for i in range(5):
  t=.08+.175*i;y=PY0+.66*t;w=.565*sqrt(max(.0007,1-t**1.7));a=.33+1.05*t
  start=Vector((side*w*.92,y,-.12-.08*t));mid=start+Vector((side*.17*cos(a),.19*sin(a),-.04));end=start+Vector((side*(.31-.05*t)*cos(a),(.34+.13*t)*sin(a),-.10))
  keeled(f'pygidial_marginal_spine_{side}_{i}',[start,start.lerp(mid,.35),mid,end],[.058,.055,.039,.0015],[.038,.035,.027,.0015],'pygidium')
keeled('pygidial_terminal_spine',[(0,PY0+.54,-.08),(0,PY0+.65,-.13),(0,PY0+.83,-.18),(0,PY0+.99,-.21)],[.067,.060,.038,.0015],[.038,.033,.025,.0015],'pygidium')
