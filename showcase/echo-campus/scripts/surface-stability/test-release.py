"""Small independent fixtures; writes only below a new verification directory."""
from pathlib import Path
import argparse, hashlib, json, struct, subprocess, sys, time
import numpy as np

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument('--node', default='node')
args = parser.parse_args()
OUT = HERE / 'verification' / time.strftime('suite-%Y%m%d-%H%M%S')
OUT.mkdir(parents=True)


def fixture(name, *, tiny=False, uv=False, skin=False, morph=False, extension=False, thin=False):
    base = np.array([[0.,0.,0.],[4.,0.,0.],[0.,4.,0.]])
    axis = np.array([[1.,0.,0.],[0.,2**-.5,-2**-.5],[0.,2**-.5,2**-.5]])
    triangles = [base@axis.T, (base+[1,0,0])@axis.T, (base+[0,0,.1])@axis.T]
    if tiny: triangles = [base*.00001]
    if thin:
        slender=np.array([[0.,0.,0.],[4.,0.,0.],[0.,.0006,0.]])
        angle=np.deg2rad(44.999);rotation=np.array([[1.,0.,0.],[0.,np.cos(angle),-np.sin(angle)],[0.,np.sin(angle),np.cos(angle)]])
        triangles=[slender@rotation.T,((slender+[.1,0,0])@rotation.T)[[0,2,1]]]
    doc = {'asset':{'version':'2.0'},'scene':0,'scenes':[{'nodes':[0]}], 'nodes':[{'mesh':0}],
           'meshes':[{'name':'fixture','extras':{'sourceVenue':'fixture'},'primitives':[]}],
           'materials':[{'name':'surface','doubleSided':True}], 'buffers':[{'byteLength':0}], 'bufferViews':[], 'accessors':[]}
    blob = bytearray()
    def add(array, kind, component):
        while len(blob)%4: blob.append(0)
        view = len(doc['bufferViews']); doc['bufferViews'].append({'buffer':0,'byteOffset':len(blob),'byteLength':array.nbytes})
        blob.extend(array.tobytes())
        accessor = {'bufferView':view,'componentType':component,'count':len(array),'type':kind}
        if kind == 'VEC3': accessor.update(min=array.min(0).tolist(),max=array.max(0).tolist())
        doc['accessors'].append(accessor); return len(doc['accessors'])-1
    for coords in triangles:
        positions = np.array(coords,dtype='<f4'); normal = np.cross(positions[1]-positions[0],positions[2]-positions[0]); normal /= np.linalg.norm(normal)
        p = {'attributes':{'POSITION':add(positions,'VEC3',5126),'NORMAL':add(np.tile(normal,(3,1)).astype('<f4'),'VEC3',5126)},
             'indices':add(np.array([0,1,2],dtype='<u4'),'SCALAR',5125),'material':0}
        if uv: p['attributes']['TEXCOORD_0'] = add(np.zeros((3,2),dtype='<f4'),'VEC2',5126)
        if morph: p['targets'] = [{'POSITION':p['attributes']['POSITION']}]
        doc['meshes'][0]['primitives'].append(p)
    if skin: doc['skins']=[{'joints':[0]}];doc['nodes'][0]['skin']=0
    if extension: doc['extensionsUsed']=['VENDOR_unknown'];doc['extensions']={'VENDOR_unknown':{}}
    doc['buffers'][0]['byteLength']=len(blob); encoded=json.dumps(doc).encode();encoded+=b' '*(-len(encoded)%4)
    raw=struct.pack('<III',0x46546C67,2,28+len(encoded)+len(blob))+struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(blob),0x004E4942)+blob
    path=OUT/(name+'.glb');path.write_bytes(raw);return path


checks = []
def run(name, file, extra=(), expected=0):
    before=hashlib.sha256(file.read_bytes()).hexdigest()
    output=OUT/name
    command=[sys.executable,str(HERE/'run-pipeline.py'),'--input',str(file),'--output',str(output),'--units','metres','--jobs','4','--iterations','2','--node',args.node,*extra]
    result=subprocess.run(command,capture_output=True,text=True)
    (OUT/(name+'.log')).write_text(result.stdout+result.stderr,encoding='utf8')
    assert (result.returncode==0)==(expected==0), result.stdout+result.stderr
    assert hashlib.sha256(file.read_bytes()).hexdigest()==before
    checks.append({'name':name,'exitCode':result.returncode,'sourceUnchanged':True})
    return output


source=fixture('source')
output=run('complete',source)
summary=json.loads((output/'release-summary.json').read_text())
assert summary['acceptedWithinAuditScope'] and summary['iterations'][-1]['pairs']==0
compression=json.loads((output/'venue-campus-clean.audit.json').read_text())
assert compression['exactPositions'] and compression['exactNormals'] and compression['exactOrientedFaces']
audit=json.loads((output/'pass0.audit.json').read_text())
assert abs(audit['duplicateSurfaceAreaRemoved']-4.5)<1e-4 and audit['output']['triangles']==4
run('residuals-rejected',source,['--scan-only'],expected=1)
run('empty-valid-range',fixture('tiny',tiny=True),['--scan-only'])
run('compressed-reinput',OUT/'complete'/'venue-campus-clean.glb',['--scan-only'])
run('thin-45-degree',fixture('thin',thin=True))
for name, keyword in [('uv','uv'),('skin','skin'),('morph','morph'),('unknown-extension','extension')]:
    output=run('reject-'+name,fixture(name,**{keyword:True}),expected=1)
    assert not (output/'venue-campus-clean.glb').exists()
report={'passed':True,'checks':checks,'endToEndDelivery':str(OUT/'complete'/'venue-campus-clean.glb'),'scope':'synthetic fixtures only; not visual acceptance of a future venue'}
(OUT/'verification-summary.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report,indent=2))
