"""Fail closed before workers can discard unsupported glTF features."""
from pathlib import Path
import argparse, json, struct
import numpy as np


def validate(path, compressed_source=False):
    raw = Path(path).read_bytes()
    if len(raw) < 28 or struct.unpack_from('<III', raw) != (0x46546C67, 2, len(raw)):
        raise ValueError('Expected a complete GLB 2.0 file')
    length, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4E4F534A or 28 + length > len(raw):
        raise ValueError('Invalid GLB JSON chunk')
    doc = json.loads(raw[20:20 + length])
    binary_length, binary_kind = struct.unpack_from('<II', raw, 20 + length)
    if binary_kind != 0x004E4942 or 28 + length + binary_length != len(raw):
        raise ValueError('Expected one embedded BIN chunk and no trailing chunks')
    blob = memoryview(raw)[28 + length:]
    for key in ('skins', 'animations', 'textures', 'images', 'samplers', 'cameras', 'extensions', 'extensionsUsed', 'extensionsRequired'):
        if compressed_source and key in ('extensionsUsed','extensionsRequired'):
            if set(doc.get(key,[]))-{'KHR_draco_mesh_compression','EXT_meshopt_compression'}:raise ValueError('Only Draco/Meshopt compression extensions are supported')
            continue
        if doc.get(key):
            raise ValueError(f'Unsupported {key}; use a static untextured position/normal export')
    def nested_extensions(value, trail=()):
        if isinstance(value, dict):
            for key, child in value.items():
                if key == 'extras':
                    continue
                if key == 'extensions' and child:
                    allowed = set()
                    if compressed_source and len(trail) >= 2 and trail[-2] == 'primitives':
                        allowed = {'KHR_draco_mesh_compression'}
                    if compressed_source and len(trail) == 2 and trail[0] in ('bufferViews','buffers'):
                        allowed = {'EXT_meshopt_compression'}
                    if set(child) - allowed:
                        raise ValueError('Unsupported nested extensions at ' + '/'.join(map(str, trail)))
                else:
                    nested_extensions(child, trail + (key,))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                nested_extensions(child, trail + (index,))
    nested_extensions(doc)
    buffers = doc.get('buffers', [])
    if not buffers or buffers[0].get('uri') or buffers[0].get('byteLength', 0) > len(blob) or any(b.get('uri') for b in buffers) or (len(buffers)!=1 and not (compressed_source and all(b.get('extensions',{}).get('EXT_meshopt_compression',{}).get('fallback') is True for b in buffers[1:]))):
        raise ValueError('Exactly one embedded buffer is required')
    for node in doc.get('nodes', []):
        if any(key in node for key in ('matrix', 'translation', 'rotation', 'scale', 'skin', 'weights', 'camera', 'extensions')):
            raise ValueError('Bake node transforms; skins, morph weights, cameras and node extensions are unsupported')
    for accessor in doc.get('accessors', []):
        if accessor.get('sparse') or accessor.get('normalized') or accessor.get('extensions'):
            raise ValueError('Sparse, normalized or extended accessors are unsupported')

    def read(index, expected_type, components):
        accessor = doc['accessors'][index]
        if accessor['type'] != expected_type or accessor['componentType'] not in components:
            raise ValueError('Unsupported accessor type or component format')
        view = doc['bufferViews'][accessor['bufferView']]
        if view.get('buffer', 0) != 0 or view.get('extensions'):
            raise ValueError('Unsupported buffer view')
        dtype = np.dtype({5126: '<f4', 5125: '<u4', 5123: '<u2', 5121: 'u1'}[accessor['componentType']])
        width = 3 if expected_type == 'VEC3' else 1
        count = accessor['count']
        offset = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
        stride = view.get('byteStride', dtype.itemsize * width)
        if count <= 0 or stride < width * dtype.itemsize or offset + (count - 1) * stride + width * dtype.itemsize > len(blob):
            raise ValueError('Accessor exceeds its buffer or has no values')
        return np.ndarray((count, width), dtype, buffer=blob, offset=offset, strides=(stride, dtype.itemsize))

    triangles = 0
    for mesh in doc.get('meshes', []):
        if mesh.get('weights') or mesh.get('extensions') or not mesh.get('primitives'):
            raise ValueError('Empty, morphed or extended meshes are unsupported')
        for primitive in mesh['primitives']:
            if set(primitive.get('attributes', {})) != {'POSITION', 'NORMAL'}:
                raise ValueError('Only POSITION and NORMAL are supported; UV, colors, tangents and skin attributes must not be silently discarded')
            extensions=set(primitive.get('extensions',{}))
            if primitive.get('mode', 4) != 4 or primitive.get('targets') or extensions-({'KHR_draco_mesh_compression'} if compressed_source else set()) or 'indices' not in primitive:
                raise ValueError('Only indexed TRIANGLES without morph targets/extensions are supported')
            if not isinstance(primitive.get('material'), int) or not 0 <= primitive['material'] < len(doc.get('materials', [])):
                raise ValueError('Every primitive needs an explicit valid material')
            if compressed_source:
                triangles += doc['accessors'][primitive['indices']]['count']//3
                continue
            position = read(primitive['attributes']['POSITION'], 'VEC3', {5126})
            normal = read(primitive['attributes']['NORMAL'], 'VEC3', {5126})
            faces = read(primitive['indices'], 'SCALAR', {5121, 5123, 5125}).ravel()
            if len(faces) % 3 or faces.max() >= len(position) or len(normal) != len(position):
                raise ValueError('Invalid triangle indices or mismatched normal count')
            if not np.isfinite(position).all() or not np.isfinite(normal).all():
                raise ValueError('Non-finite positions/normals are unsupported')
            triangles += len(faces) // 3
    if not triangles:
        raise ValueError('No indexed triangles found')
    return {'scope': 'static untextured indexed float32 POSITION/NORMAL only', 'triangles': triangles, 'units': 'metres explicitly declared by caller'}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('file', type=Path)
    parser.add_argument('--compressed-source',action='store_true')
    args = parser.parse_args()
    print(json.dumps(validate(args.file,args.compressed_source), indent=2))
