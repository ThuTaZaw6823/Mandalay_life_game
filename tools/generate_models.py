"""Mandalay Life v4.1 procedural GLB asset authoring script.
The supplied reference sheets guide the original stylized silhouettes and palettes.
Requires Python 3 + numpy + trimesh; output GLBs are bundled, so end users
DO NOT need Python to run the game.
"""
from pathlib import Path
import numpy as np
import trimesh as tm
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals
import math

OUT = Path(__file__).resolve().parents[1] / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)
PI = math.pi

def hexrgba(c,alpha=255):
    return [((c>>16)&255),((c>>8)&255),(c&255),alpha]

def material(mesh,color,metal=0.0,rough=.82):
    mesh.visual = TextureVisuals(material=PBRMaterial(baseColorFactor=hexrgba(color),metallicFactor=metal,roughnessFactor=rough,alphaMode='OPAQUE',doubleSided=True))
    return mesh

class Asset:
    def __init__(self):self.scene=tm.Scene();self.i=0
    def add(self,name,mesh,color,metal=0.0,rough=.82):
        self.i+=1
        mesh=mesh.copy();material(mesh,color,metal,rough)
        self.scene.add_geometry(mesh,node_name=f'{name}_{self.i:03d}',geom_name=f'{name}_{self.i:03d}')
        return mesh
    def sphere(self,n,p,size,color,sub=2,metal=0.0,rough=.84):
        m=tm.creation.icosphere(subdivisions=sub,radius=1.0)
        m.apply_scale(size);m.apply_translation(p)
        return self.add(n,m,color,metal,rough)
    def box(self,n,p,size,color,metal=0.0,rough=.85):
        m=tm.creation.box(extents=size);m.apply_translation(p)
        return self.add(n,m,color,metal,rough)
    def rod(self,n,a,b,r,color,sections=9,metal=0.0):
        a=np.array(a,float);b=np.array(b,float)
        m=tm.creation.cylinder(radius=r,height=np.linalg.norm(b-a),sections=sections)
        m.apply_transform(tm.geometry.align_vectors([0,0,1],b-a))
        m.apply_translation((a+b)*.5)
        return self.add(n,m,color,metal)
    def torus(self,n,p,rad,tube,color,axis='x',steps=32,sides=8,metal=0.0):
        V=[];F=[]
        for i in range(steps):
            a=2*PI*i/steps
            for j in range(sides):
                b=2*PI*j/sides;R=rad+tube*math.cos(b)
                if axis=='x':v=[p[0]+tube*math.sin(b),p[1]+R*math.sin(a),p[2]+R*math.cos(a)]
                elif axis=='z':v=[p[0]+R*math.cos(a),p[1]+R*math.sin(a),p[2]+tube*math.sin(b)]
                else:v=[p[0]+R*math.cos(a),p[1]+tube*math.sin(b),p[2]+R*math.sin(a)]
                V.append(v)
        for i in range(steps):
            for j in range(sides):
                a=i*sides+j;b=i*sides+(j+1)%sides;c=((i+1)%steps)*sides+j;d=((i+1)%steps)*sides+(j+1)%sides
                F.extend([[a,b,c],[b,d,c]])
        return self.add(n,tm.Trimesh(vertices=V,faces=F,process=False),color,metal)
    def polygon_extrude_x(self,n,polygon,halfwidth,color):
        verts=[[xx,y,z] for xx in [-halfwidth,halfwidth] for z,y in polygon]
        k=len(polygon);faces=[]
        # caps convex fan if outline convex; side faces still fine with mildly concave outlines
        for i in range(1,k-1):faces.extend([[0,i+1,i],[k,k+i,k+i+1]])
        for i in range(k):
            q=(i+1)%k;faces.extend([[i,q,k+i],[q,k+q,k+i]])
        return self.add(n,tm.Trimesh(vertices=verts,faces=faces,process=False),color)
    def wedge(self,n,corners,color):
        # 8 coords: bottom loop (4), top loop (4)
        V=np.array(corners,float);F=[]
        for i in range(1,3):F.extend([[0,i+1,i],[4,4+i,4+i+1]])
        for i in range(4):j=(i+1)%4;F.extend([[i,j,4+i],[j,4+j,4+i]])
        return self.add(n,tm.Trimesh(vertices=V,faces=F,process=False),color)
    def loft(self,n,rings,color,segments=16):
        # rings: (y,cx,cz,rad_x,rad_z), ellipsoid ring mesh with hemispherical ends as requested
        V=[]
        for y,cx,cz,rx,rz in rings:
            for i in range(segments):
                a=2*PI*i/segments;V.append((cx+rx*math.cos(a),y,cz+rz*math.sin(a)))
        F=[]
        for j in range(len(rings)-1):
            for i in range(segments):
                a=j*segments+i;b=j*segments+(i+1)%segments;c=(j+1)*segments+i;d=(j+1)*segments+(i+1)%segments
                F.extend([[a,b,c],[b,d,c]])
        for i in range(1,segments-1):F.extend([[0,i,i+1],[len(V)-segments,len(V)-segments+i+1,len(V)-segments+i]])
        return self.add(n,tm.Trimesh(vertices=V,faces=F,process=False),color)
    def export(self,name):
        dst=OUT/name;dst.write_bytes(self.scene.export(file_type='glb'))
        print(name,round(dst.stat().st_size/1024),'KB',len(self.scene.geometry),'meshes')

CHARACTERS=[
  {'name':'hoodie_male','skin':0xc28b66,'hair':0x25252b,'top':0x626d7a,'accent':0x404c5a,'pants':0x696a56,'shoes':0xdfded9,'kind':'hoodie','hairkind':'short'},
  {'name':'blazer_female','skin':0x986549,'hair':0x292129,'top':0x43495d,'accent':0xf2ede7,'pants':0x62565e,'shoes':0x303039,'kind':'blazer','hairkind':'bun'},
  {'name':'jacket_senior','skin':0xb3896d,'hair':0x717279,'top':0x777761,'accent':0x595c4b,'pants':0x576b7b,'shoes':0x42392f,'kind':'jacket','hairkind':'silver'},
  {'name':'rainbow_female','skin':0x754a38,'hair':0x252028,'top':0xd16480,'accent':0x67c4a6,'pants':0x6483ac,'shoes':0xc99fdb,'kind':'rainbow','hairkind':'braids'},
  {'name':'sport_male','skin':0xa66e4d,'hair':0x292526,'top':0x576c89,'accent':0x3d516c,'pants':0x2c3c5a,'shoes':0xdddfe0,'kind':'sport','hairkind':'short'},
  {'name':'olive_female','skin':0xbf8a66,'hair':0x382a25,'top':0x60684d,'accent':0x454e3c,'pants':0x5b614b,'shoes':0x433a36,'kind':'jumpsuit','hairkind':'bun'},
]

def character(c):
    a=Asset();skin=c['skin'];hair=c['hair'];top=c['top'];pants=c['pants'];acc=c['accent'];kind=c['kind']
    a.sphere('Body_Neck',[0,2.29,-.005],[.145,.19,.13],skin)
    a.loft('Body_Torso',[(1.32,0,0,.30,.18),(1.45,0,0,.38,.23),(1.74,0,0,.42,.25),(2.09,0,0,.48,.27),(2.26,0,0,.37,.21)],top)
    a.sphere('Body_Pelvis',[0,1.28,0],[.33,.20,.25],pants)
    # back hood / jacket collar
    if kind in ['hoodie','rainbow']:
        a.sphere('Body_Hood',[0,2.24,.18],[.39,.28,.24],top)
        a.torus('Body_HoodOpening',[0,2.30,-.12],.27,.065,acc,axis='z',steps=20)
        for s in [-1,1]:a.rod('Body_Drawstrings',[s*.13,2.18,-.281],[s*.13,1.84,-.286],.012,0xe6dfd4,sections=6)
        a.box('Body_HoodPocket',[0,1.49,-.23],[.52,.20,.042],0x525d6a if kind=='hoodie' else 0xea718a)
    elif kind in ['blazer','jacket','jumpsuit']:
        # opening and collars / lapels
        a.loft('Body_Shirt',[(1.58,0,-.248,.12,.01),(1.93,0,-.269,.145,.01),(2.23,0,-.224,.11,.01)],0xe6e6d9 if kind=='blazer' else 0xb9ae94)
        for s in [-1,1]:
            a.wedge('Body_Lapel',[[s*.13,1.86,-.29],[s*.36,1.93,-.255],[s*.30,2.27,-.24],[s*.10,2.31,-.23],
                            [s*.13,1.88,-.34],[s*.36,1.95,-.30],[s*.30,2.29,-.31],[s*.10,2.33,-.31]],acc if kind!='blazer' else 0x555968)
        for yy in [1.52,1.78,2.04]:a.sphere('Body_Button',[0,yy,-.267],[.024,.025,.019],0xbba47b)
    else:
        a.loft('Body_ShirtCollar',[(2.19,0,-.17,.24,.16),(2.26,0,-.145,.21,.14)],acc)
    # head has chin taper to forehead (stylized facial shape)
    a.loft('Body_Face',[(2.33,0,-.065,.17,.17),(2.40,0,-.075,.225,.19),(2.60,0,-.070,.246,.217),(2.77,0,-.058,.225,.22),(2.86,0,-.047,.16,.16)],skin,segments=20)
    for s in [-1,1]:
        a.sphere('Body_Ear',[s*.245,2.58,-.053],[.06,.095,.055],skin)
        a.sphere('Body_EyeWhite',[s*.102,2.622,-.270],[.047,.026,.014],0xe5d8c9,sub=2)
        a.sphere('Body_Pupil',[s*.106,2.618,-.288],[.017,.021,.012],0x292a2a,sub=2)
        a.rod('Body_Brow',[s*.055,2.681,-.279],[s*.151,2.688,-.263],.017,hair,sections=6)
    a.sphere('Body_Nose',[0,2.533,-.286],[.036,.057,.041],skin)
    a.rod('Body_Mouth',[-.064,2.440,-.273],[.064,2.440,-.273],.012,0x7b504c,sections=8)
    a.sphere('Body_HairCap',[0,2.85,.016],[.253,.18,.251],hair)
    if c['hairkind']=='short':
        for i in range(7):
            xx=(i-3)*.062
            a.sphere('Body_HairStrand',[xx,2.934,-.117],[.056,.076,.134],hair)
    elif c['hairkind']=='silver':
        for s in [-1,1]:a.sphere('Body_TempleHair',[s*.18,2.695,.07],[.075,.18,.17],hair)
        a.sphere('Body_Beard',[0,2.39,-.10],[.21,.105,.195],0x777076)
        a.sphere('Body_Moustache',[0,2.48,-.29],[.12,.04,.032],0x85818a)
    elif c['hairkind']=='bun':
        a.sphere('Body_Bun',[0,2.91,.238],[.18,.21,.19],hair)
        for s in [-1,1]:a.sphere('Body_SideHair',[s*.22,2.68,.032],[.064,.15,.126],hair)
    elif c['hairkind']=='braids':
        for s in [-1,1]:
            for j in range(5):a.sphere('Body_Braids',[s*(.19+(.025*j)),2.75-j*.124,.084],[.078,.089,.088],hair)
    # both arms, anchored 2.08 shoulder; mesh authored in world coords for easy pivot re-parenting
    for side,pfx in [(-1,'LA'),(1,'RA')]:
        a.sphere(f'{pfx}_Shoulder',[side*.51,2.083,0],[.18,.19,.21],top)
        a.rod(f'{pfx}_Sleeve',[side*.55,2.02,0],[side*.60,1.64,-.005],.15,top,sections=16)
        a.sphere(f'{pfx}_Cuff',[side*.60,1.63,-.005],[.16,.065,.16],acc if kind in ['hoodie','rainbow'] else top)
        a.rod(f'{pfx}_Forearm',[side*.60,1.59,-.005],[side*.63,1.24,-.034],.13,skin,sections=12)
        a.sphere(f'{pfx}_Hand',[side*.63,1.18,-.038],[.14,.15,.095],skin)
    for side,pfx in [(-1,'LL'),(1,'RL')]:
        a.loft(f'{pfx}_Pant',[(.28,side*.185,.018,.128,.155),(.35,side*.186,.017,.158,.166),(.73,side*.20,.014,.175,.185),(.99,side*.20,0,.19,.20),(1.23,side*.19,0,.21,.19)],pants)
        if kind in ['hoodie','jacket','jumpsuit']:
            a.box(f'{pfx}_Pocket',[side*.31,.91,-.005],[.09,.27,.20],pants)
            a.box(f'{pfx}_PocketFlap',[side*.31,1.052,-.008],[.11,.045,.23],acc)
        a.sphere(f'{pfx}_Sneaker',[side*.18,.15,-.105],[.178,.155,.31],c['shoes'])
        a.sphere(f'{pfx}_Sole',[side*.18,.065,-.124],[.18,.064,.31],0xeae5dd if kind not in ['blazer','jacket','jumpsuit'] else 0x45413e)
        for y in [.192,.229]:a.rod(f'{pfx}_Laces',[side*.18-.07,y,-.29],[side*.18+.07,y,-.29],.008,0xece6dd,sections=6)
    if kind=='rainbow':
        for color,y in [(0xf0bd4b,1.82),(0x6cc1b4,1.95),(0x9a76bd,2.07)]:
            a.box('Body_RainbowStripe',[0,y,-.264],[.72,.09,.021],color)
    if kind=='jumpsuit':a.box('Body_Belt',[0,1.38,-.214],[.75,.075,.06],0x454f3f)
    a.export(c['name']+'.glb')

# Forward direction -Z for vehicle visual and walking direction.
def wheel(a,p,r=.5,width=.22):
    a.torus('Wheel_Tire',p,r,.105,0x171b1e,steps=28,sides=12)
    for sx in [-width*.5,width*.5]:
        a.torus('Wheel_Rim',[p[0]+sx,p[1],p[2]],r-.12,.041,0xa9b3b5,steps=28,sides=8,metal=.7)
    a.rod('Wheel_Hub',[p[0]-width*.5,p[1],p[2]],[p[0]+width*.5,p[1],p[2]],.09,0x626c72,sections=12,metal=.8)
    for i in range(6):
        ang=2*PI*i/6
        yy=math.sin(ang)*(r-.15);zz=math.cos(ang)*(r-.15)
        a.rod('Wheel_Spoke',[p[0]+width*.51,p[1],p[2]],[p[0]+width*.51,p[1]+yy,p[2]+zz],.017,0xd5d5d0,sections=6,metal=.65)

def car():
    a=Asset();red=0xd74642;paint=0xe14d45;glass=0x5f9ab7
    # smooth multi-section side profile with hood/bumper/roof and explicit window geometry
    a.polygon_extrude_x('Car_SculptedBody',[(-2.05,.46),(-2.30,.56),(-2.28,.89),(-1.9,1.07),(-1.20,1.12),(-.79,1.70),(.77,1.71),(1.21,1.19),(2.12,1.07),(2.29,.76),(2.23,.52),(1.95,.41)],1.025,red)
    a.wedge('Car_Windshield',[[-.78,1.68,-.84],[.78,1.68,-.84],[.83,1.16,-1.29],[-.83,1.16,-1.29],[-.79,1.7,-.838],[.79,1.7,-.838],[.83,1.18,-1.288],[-.83,1.18,-1.288]],glass)
    a.wedge('Car_RearGlass',[[-.78,1.66,.79],[.78,1.66,.79],[.85,1.20,1.22],[-.85,1.20,1.22],[-.78,1.68,.792],[.78,1.68,.792],[.85,1.22,1.222],[-.85,1.22,1.222]],glass)
    for s in [-1,1]:
        a.wedge('Car_SideWindow',[[s*1.026,1.20,-.73],[s*1.026,1.58,-.48],[s*1.026,1.59,.59],[s*1.026,1.20,.94],
             [s*1.028,1.20,-.73],[s*1.028,1.58,-.48],[s*1.028,1.59,.59],[s*1.028,1.20,.94]],glass)
        for z in [-.63,.29]:a.rod('Car_WindowPillar',[s*1.042,1.13,z],[s*1.042,1.70,z+.10],.025,0x2b3038)
        a.rod('Car_DoorSeam',[s*1.048,.5,.17],[s*1.048,1.15,.17],.012,0x742f35)
        for z in [-.47,.78]:a.box('Car_DoorHandle',[s*1.07,1.16,z],[.05,.045,.25],0xced4ce,.75)
        a.sphere('Car_Mirror',[s*1.11,1.33,-.77],[.19,.11,.17],0x202629)
        for z in [-1.38,1.44]:wheel(a,[s*1.12,.54,z],.44,.24)
        a.sphere('Car_Headlamp',[s*.74,.82,-2.29],[.28,.12,.052],0xf3e3ab)
        a.sphere('Car_Taillamp',[s*.75,.82,2.29],[.26,.13,.05],0xa7242c)
    a.box('Car_Grille',[0,.72,-2.30],[1.1,.2,.05],0x2b3338)
    a.box('Car_Bumper',[0,.48,-2.33],[1.84,.13,.13],0x273b48)
    a.box('Car_RearBumper',[0,.49,2.29],[1.82,.14,.12],0x273b48)
    a.export('car.glb')

def motor():
    a=Asset();g=0x58b83b;dark=0x202629
    for z in [-1.22,1.16]:wheel(a,[0,.55,z],.50,.20)
    for s in [-1,1]:
        a.rod('Moto_Fork',[s*.10,1.30,-.94],[s*.10,.51,-1.20],.055,0xabb8b7,metal=.8)
        a.rod('Moto_SwingArm',[s*.14,.60,.55],[s*.12,.55,1.16],.066,0x31373a)
    a.sphere('Moto_Fairing',[0,1.10,-.76],[.46,.45,.62],g)
    a.sphere('Moto_Tank',[0,1.18,-.06],[.47,.29,.67],g)
    a.sphere('Moto_RearCowl',[0,1.03,.78],[.42,.23,.57],g)
    a.sphere('Moto_Seat',[0,1.28,.53],[.40,.10,.66],dark)
    a.sphere('Moto_Engine',[0,.69,.14],[.33,.32,.4],0x545e61,metal=.7)
    a.sphere('Moto_Windscreen',[0,1.48,-.98],[.27,.24,.10],0x7bbcc6,rough=.2)
    a.sphere('Moto_Headlight',[0,1.13,-1.32],[.20,.11,.07],0xf7e4aa)
    a.rod('Moto_Handlebar',[-.57,1.50,-.65],[.57,1.50,-.65],.055,0x434a4d,metal=.5)
    for s in [-1,1]:
        a.rod('Moto_Grip',[s*.41,1.50,-.65],[s*.64,1.50,-.65],.075,0x20262b)
        a.rod('Moto_MirrorStem',[s*.44,1.50,-.65],[s*.63,1.70,-.78],.021,0x9da5a2)
        a.sphere('Moto_Mirror',[s*.67,1.75,-.79],[.15,.09,.10],0x34373b)
    a.rod('Moto_Exhaust',[.28,.62,.22],[.34,.64,1.32],.105,0xb0b9b7,metal=.75)
    a.box('Moto_TailLamp',[0,1.01,1.35],[.27,.11,.06],0xa52234)
    a.export('motorbike.glb')

def bicycle():
    a=Asset();blue=0x267bd0
    for z in [-1.11,1.11]:wheel(a,[0,.52,z],.48,.16)
    A=[0,.52,-1.11];B=[0,1.18,-.30];C=[0,.73,.40];D=[0,1.18,.62];E=[0,.52,1.11]
    for x,y in [(A,B),(B,C),(C,A),(B,D),(D,C),(D,E),(E,C)]:a.rod('Bike_Frame',x,y,.043,blue,sections=12,metal=.55)
    a.rod('Bike_SeatTube',C,[0,1.36,.56],.046,0xb1b5b4,metal=.8)
    a.sphere('Bike_Saddle',[0,1.40,.61],[.17,.07,.28],0x242c31)
    for s in [-1,1]:a.rod('Bike_FrontFork',[s*.075,1.04,-.91],[s*.075,.52,-1.11],.039,0x3e464b)
    a.rod('Bike_HandleStem',B,[0,1.51,-.45],.049,0x454c55,metal=.6)
    a.rod('Bike_Handle',[-.58,1.51,-.52],[.58,1.51,-.52],.04,0x28333a,metal=.45)
    a.torus('Bike_ChainRing',[0,.72,.40],.19,.028,0x919b9f,metal=.5)
    a.rod('Bike_Crank',[-.24,.72,.40],[.24,.72,.40],.035,0x9da3a2)
    a.rod('Bike_Pedal',[-.39,.69,.56],[-.24,.69,.56],.038,0x292d30)
    a.rod('Bike_Pedal',[.24,.75,.25],[.39,.75,.25],.038,0x292d30)
    a.export('bicycle.glb')

def bus():
    a=Asset();gold=0xd9ab43
    a.polygon_extrude_x('Bus_Body',[(-3.87,.49),(-4.0,.73),(-3.99,2.86),(-3.77,3.11),(3.80,3.11),(4.0,2.86),(4.0,.50)],1.28,gold)
    a.box('Bus_Roof',[0,3.12,0],[2.4,.19,7.62],0xf0e6ce)
    for s in [-1,1]:
        for j,z in enumerate([-2.9,-1.78,-.66,.46,1.58,2.7]):
            a.box('Bus_Window',[s*1.285,2.23,z],[.016,.93,.87],0x7aa7b3)
            a.rod('Bus_WindowPillar',[s*1.298,1.75,z+.50],[s*1.298,2.78,z+.50],.034,0xe9dfc9)
        for z in [-2.70,2.67]:wheel(a,[s*1.34,.62,z],.52,.24)
        a.box('Bus_Mirror',[s*1.4,2.10,-3.62],[.24,.26,.19],0x33373a)
    a.box('Bus_FrontGlass',[0,2.18,-4.01],[2.22,1.07,.033],0x6b9ca8)
    a.box('Bus_RearGlass',[0,2.26,4.02],[2.05,.89,.034],0x6b9ca8)
    for s in [-1,1]:a.box('Bus_Lamp',[s*.91,.89,-4.06],[.43,.27,.05],0xf1d7a1)
    a.box('Bus_Grille',[0,.67,-4.06],[1.42,.2,.05],0x465359)
    a.box('Bus_Stripe',[0,1.31,-4.08],[2.45,.12,.05],0xf6ecc8)
    a.export('bus.glb')

def plane():
    a=Asset();white=0xe0f1f0;blue=0x76b8d5
    a.loft('Plane_Fuselage',[(.66,0,0,.10,.10),(.85,0,0,.35,.38),(1.35,0,0,.56,.53),(1.72,0,0,.52,.49),(1.96,0,0,.20,.29)],white)
    # horizontal axis body along Z uses spheres with scaling rather than cube
    a.sphere('Plane_MainBody',[0,1.34,.22],[.57,.56,3.44],white,sub=3)
    a.sphere('Plane_Nose',[0,1.31,-2.82],[.47,.46,.81],white)
    a.sphere('Plane_Cockpit',[0,1.78,-1.01],[.44,.28,.91],0x79b5c7)
    # wings: 4 corners per side, thickness in y
    for s in [-1,1]:
        a.wedge('Plane_Wing',[[s*.40,1.33,-.45],[s*5.4,1.25,.17],[s*5.2,1.25,.98],[s*.42,1.33,1.15],
                              [s*.40,1.45,-.45],[s*5.4,1.38,.17],[s*5.2,1.38,.98],[s*.42,1.45,1.15]],blue)
        a.wedge('Plane_TailWing',[[s*.3,1.38,2.36],[s*2.05,1.34,2.83],[s*1.92,1.34,3.36],[s*.30,1.38,3.29],
                             [s*.3,1.48,2.36],[s*2.05,1.44,2.83],[s*1.92,1.44,3.36],[s*.30,1.48,3.29]],blue)
    a.wedge('Plane_VerticalTail',[[0,1.40,2.49],[0,1.40,3.52],[0,2.94,3.31],[0,2.79,2.86],
                        [.11,1.40,2.49],[.11,1.40,3.52],[.11,2.94,3.31],[.11,2.79,2.86]],0xcd7852)
    a.sphere('Plane_PropellerHub',[0,1.31,-3.63],[.19,.20,.22],0xd3ae79,metal=.45)
    a.box('Propeller_Blades',[0,1.31,-3.82],[.19,2.25,.11],0x4b555b,metal=.55)
    for s in [-1,1]:
        a.rod('Plane_LandingStrut',[s*.79,1.15,.90],[s*.79,.38,.90],.07,0x77868b)
        wheel(a,[s*.9,.28,.91],.22,.11)
    wheel(a,[0,.22,-2.65],.18,.10)
    a.export('plane.glb')

def boat():
    a=Asset()
    a.polygon_extrude_x('Boat_Hull',[(-3.75,.75),(-3.0,.08),(2.8,.04),(3.79,.75),(2.73,1.14),(-2.88,1.14)],1.24,0x4c94ad)
    a.box('Boat_Deck',[0,1.11,0],[2.4,.12,6.15],0xebdfc7)
    a.sphere('Boat_Cabin',[0,1.83,1.0],[1.05,.81,1.4],0xf5e6ca)
    a.box('Boat_Windshield',[0,1.95,-.37],[1.78,.73,.11],0x7eb6c8)
    a.box('Boat_Roof',[0,2.66,1.06],[2.34,.13,2.85],0x5e7f84)
    for s in [-1,1]:
        for z in [-2.4,-1.4,0,1.4,2.3]:
            a.rod('Boat_Railing',[s*1.12,1.16,z],[s*1.12,1.85,z],.025,0xb7bfbe,metal=.4)
        a.rod('Boat_Handrail',[s*1.12,1.85,-2.5],[s*1.12,1.85,2.5],.028,0xb7bfbe,metal=.5)
    a.export('boat.glb')

if __name__=='__main__':
    for c in CHARACTERS:character(c)
    for fn in [car,motor,bicycle,bus,plane,boat]:fn()
