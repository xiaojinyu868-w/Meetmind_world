"""Offline Blender reference of exact Three.js geometry, not a browser screenshot.
blender -b --python render-reference.py -- input.json output.png
"""
import bpy,json,sys,math,os
from mathutils import Matrix,Vector
args=sys.argv[sys.argv.index('--')+1:]
source,dest=args[:2]
width=int(args[2]) if len(args)>2 else 1440
height=int(args[3]) if len(args)>3 else 900
samples=int(args[4]) if len(args)>4 else 24
camera_name=args[5] if len(args)>5 else 'hero'
with open(source) as f:data=json.load(f)
if camera_name in data.get('cameras',{}):data['camera']=data['cameras'][camera_name]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=samples;scene.cycles.use_denoising=True
scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=dest
scene.view_settings.view_transform='AgX'
scene.view_settings.exposure=.65
scene.world.use_nodes=True
world=scene.world.node_tree;world.nodes.clear()
output=world.nodes.new('ShaderNodeOutputWorld');bg=world.nodes.new('ShaderNodeBackground');bg.inputs['Color'].default_value=(.61,.74,.88,1);bg.inputs['Strength'].default_value=.7
sky_bg=world.nodes.new('ShaderNodeBackground');sky_bg.inputs['Strength'].default_value=.8
tex=world.nodes.new('ShaderNodeTexCoord');sep=world.nodes.new('ShaderNodeSeparateXYZ');ramp=world.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].position=0;ramp.color_ramp.elements[0].color=(.58,.72,.84,1)
ramp.color_ramp.elements[1].position=.8;ramp.color_ramp.elements[1].color=(.15,.32,.50,1)
world.links.new(tex.outputs['Normal'],sep.inputs[0]);world.links.new(sep.outputs['Z'],ramp.inputs[0]);world.links.new(ramp.outputs[0],sky_bg.inputs['Color'])
lightpath=world.nodes.new('ShaderNodeLightPath');mix=world.nodes.new('ShaderNodeMixShader');world.links.new(lightpath.outputs['Is Camera Ray'],mix.inputs[0]);world.links.new(bg.outputs[0],mix.inputs[1]);world.links.new(sky_bg.outputs[0],mix.inputs[2]);world.links.new(mix.outputs[0],output.inputs[0])
sun_data=bpy.data.lights.new('warm-late-afternoon-key','SUN');sun_data.energy=2.8;sun_data.color=(1.0,.91,.78);sun_data.angle=.06
sun=bpy.data.objects.new('warm-late-afternoon-key',sun_data);bpy.context.collection.objects.link(sun);sun.rotation_euler=Vector((.35,-.55,.70)).normalized().to_track_quat('Z','Y').to_euler()
fill=bpy.data.lights.new('sky-softbox','AREA');fill.energy=3800;fill.shape='DISK';fill.size=50;fill.color=(.79,.88,1.0)
fill_obj=bpy.data.objects.new('sky-softbox',fill);bpy.context.collection.objects.link(fill_obj);fill_obj.location=(5,-15,40)
materials={}
for d in data['materials']:
    m=bpy.data.materials.new(d['name']);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');c=d.get('color',[.6,.6,.6]);p.inputs['Base Color'].default_value=(*c,1)
    p.inputs['Roughness'].default_value=d.get('roughness',.6);p.inputs['Metallic'].default_value=d.get('metalness',0)
    if d.get('map'):
        mapping=m.node_tree.nodes.new('ShaderNodeMapping');mapping.inputs['Scale'].default_value=(*d['map']['repeat'],1)
        texcoord=m.node_tree.nodes.new('ShaderNodeTexCoord');image=m.node_tree.nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(os.path.join(os.path.dirname(source),d['map']['file']))
        m.node_tree.links.new(texcoord.outputs['UV'],mapping.inputs['Vector']);m.node_tree.links.new(mapping.outputs['Vector'],image.inputs['Vector']);m.node_tree.links.new(image.outputs['Color'],p.inputs['Base Color'])
        if d.get('bumpScale'):
            bump=m.node_tree.nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.2;bump.inputs['Distance'].default_value=d['bumpScale'];m.node_tree.links.new(image.outputs['Color'],bump.inputs['Height']);m.node_tree.links.new(bump.outputs['Normal'],p.inputs['Normal'])
    if d.get('vertexColors') or 'leaf-canopies' in d['name'] or 'grasses' in d['name']:
        attr=m.node_tree.nodes.new('ShaderNodeVertexColor');attr.layer_name='Color';m.node_tree.links.new(attr.outputs['Color'],p.inputs['Base Color'])
    if 'glass' in d['name'].lower():
        p.inputs['Transmission Weight'].default_value=.3;p.inputs['Roughness'].default_value=.15
        trans=m.node_tree.nodes.new('ShaderNodeBsdfTransparent');mix=m.node_tree.nodes.new('ShaderNodeMixShader');mix.inputs[0].default_value=.55
        m.node_tree.links.new(p.outputs[0],mix.inputs[1]);m.node_tree.links.new(trans.outputs[0],mix.inputs[2]);m.node_tree.links.new(mix.outputs[0],m.node_tree.nodes.get('Material Output').inputs[0])
    if 'water-surface' in d['name']:
        p.inputs['Roughness'].default_value=.065;p.inputs['Metallic'].default_value=.60
    if any(v>0 for v in d.get('emissive',[0,0,0])):
        p.inputs['Emission Color'].default_value=(*d['emissive'],1);p.inputs['Emission Strength'].default_value=.45
    materials[d['name']]=m
geos={g['id']:g for g in data['geometries']}
# One root rotates Three.js Y-up into Blender Z-up; the geometry and transforms remain unchanged.
root=bpy.data.objects.new('Three.js Y-up coordinate conversion',None);bpy.context.collection.objects.link(root);root.rotation_euler=(math.pi/2,0,0)
def mat4(a):return Matrix([[a[c*4+r] for c in range(4)]for r in range(4)])
for obj in data['objects']:
    g=geos[obj['geometry']];p=g['positions'];idx=g.get('indices') or list(range(len(p)//3));base=[Vector(p[i:i+3]) for i in range(0,len(p),3)]
    verts=[];faces=[];colors=[];uvs=[]
    instances=obj.get('instances') or [None]
    for ins in instances:
        matrix=mat4(ins['matrix']) if ins else Matrix.Identity(4);offset=len(verts)
        verts.extend(tuple(matrix@v) for v in base)
        faces.extend((offset+idx[i],offset+idx[i+1],offset+idx[i+2])for i in range(0,len(idx),3))
        if ins and 'color' in ins:colors.extend([(*ins['color'],1)]*len(base))
        elif g.get('colors'):colors.extend(tuple(g['colors'][i:i+3])+ (1,) for i in range(0,len(g['colors']),3))
    mesh=bpy.data.meshes.new(obj['name']);mesh.from_pydata(verts,[],faces);mesh.update()
    if g.get('normals') and not obj.get('instances'):
        normals=g['normals']
        mesh.normals_split_custom_set_from_vertices([tuple(normals[i:i+3]) for i in range(0,len(normals),3)])
    if g.get('uvs') and not obj.get('instances'):
        uv_layer=mesh.uv_layers.new(name='UVMap');base_uv=g['uvs']
        uv_layer.data.foreach_set('uv',[value for loop in mesh.loops for value in base_uv[loop.vertex_index*2:loop.vertex_index*2+2]])
    if colors:
        attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT');attr.data.foreach_set('color',[v for c in colors for v in c])
    mesh.materials.append(materials[obj['material']]);o=bpy.data.objects.new(obj['name'],mesh);bpy.context.collection.objects.link(o);o.parent=root;o.matrix_local=mat4(obj['matrix'])
    if 'bark' in obj['name'] or 'avatar-' in obj['name'] or 'crown' in obj['name']:
        for poly in mesh.polygons:poly.use_smooth=True
camd=bpy.data.cameras.new('hero');cam=bpy.data.objects.new('hero',camd);bpy.context.collection.objects.link(cam)
def convert(v):return Vector((v[0],-v[2],v[1]))
cam.location=convert(data['camera']['position']);target=convert(data['camera']['target']);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();camd.type='PERSP';camd.clip_end=300;camd.lens=36/(2*math.tan(math.radians(data['camera']['fov'])/2)*scene.render.resolution_x/scene.render.resolution_y);scene.camera=cam
scene.render.film_transparent=bool(data.get('metadata',{}).get('transparent',False))
scene.render.image_settings.color_mode='RGBA'
bpy.ops.render.render(write_still=True)
print('REFERENCE_ONLY_RENDER',dest)
