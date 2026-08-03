"""Blender 无头占位脚本：生成一个简单 lowpoly 无脸人形 GLB。

用法：
    blender -b --python templates/blender_lowpoly.py -- --out /path/to/out.glb

约定（与前端 CharacterSystem 对齐）：
    - 根节点名 ROOT_FacelessCharacter；
    - 材质名含 jacket/hair/skin/pants/shoes/shirt 令牌（MAT_* 命名）；
    - 脚底原点（z=0 接地）；人物正面朝 Blender -Y，经 glTF 导出（Y-up 转换）后面朝 +Z。

TODO(算法待打磨)：当前为几何体拼接的占位人形；后续由三视图驱动的真实建模
（或现成 rig 重定向）替换本脚本的 build_humanoid()。
"""

import sys

import bpy

MATERIALS = {
    "MAT_Skin": (0.84, 0.60, 0.45, 1.0),
    "MAT_Hair": (0.15, 0.16, 0.19, 1.0),
    "MAT_Jacket": (0.19, 0.36, 0.51, 1.0),
    "MAT_Jacket_Light": (0.32, 0.49, 0.64, 1.0),
    "MAT_Shirt": (0.94, 0.91, 0.81, 1.0),
    "MAT_Pants": (0.19, 0.24, 0.29, 1.0),
    "MAT_Shoes": (0.82, 0.45, 0.27, 1.0),
}

# (名称, 材质, 位置(x,y,z), 尺寸(x,y,z))；z 为 Blender 竖直方向，脚底 z=0
PARTS = [
    ("Shoe_L", "MAT_Shoes", (-0.11, -0.03, 0.05), (0.20, 0.32, 0.10)),
    ("Shoe_R", "MAT_Shoes", (0.11, -0.03, 0.05), (0.20, 0.32, 0.10)),
    ("Leg_L", "MAT_Pants", (-0.11, 0.0, 0.45), (0.18, 0.22, 0.70)),
    ("Leg_R", "MAT_Pants", (0.11, 0.0, 0.45), (0.18, 0.22, 0.70)),
    ("Torso", "MAT_Jacket", (0.0, 0.0, 1.10), (0.44, 0.26, 0.60)),
    ("Chest", "MAT_Shirt", (0.0, -0.11, 1.10), (0.24, 0.06, 0.44)),
    ("Arm_L", "MAT_Jacket_Light", (-0.31, 0.0, 1.08), (0.14, 0.18, 0.56)),
    ("Arm_R", "MAT_Jacket_Light", (0.31, 0.0, 1.08), (0.14, 0.18, 0.56)),
    ("Head", "MAT_Skin", (0.0, 0.0, 1.58), (0.28, 0.26, 0.30)),
    ("Hair", "MAT_Hair", (0.0, 0.02, 1.72), (0.30, 0.28, 0.14)),
]


def parse_out_path() -> str:
    argv = sys.argv
    if "--" not in argv:
        raise SystemExit("用法：blender -b --python blender_lowpoly.py -- --out <path>")
    args = argv[argv.index("--") + 1:]
    if "--out" not in args:
        raise SystemExit("缺少 --out 参数")
    return args[args.index("--out") + 1]


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def build_humanoid() -> None:
    root = bpy.data.objects.new("ROOT_FacelessCharacter", None)
    bpy.context.scene.collection.objects.link(root)
    materials = {}
    for name, color in MATERIALS.items():
        material = bpy.data.materials.new(name)
        material.diffuse_color = color
        materials[name] = material
    for part_name, material_name, location, scale in PARTS:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
        obj = bpy.context.active_object
        obj.name = part_name
        obj.scale = scale
        obj.data.materials.append(materials[material_name])
        obj.parent = root


def main() -> None:
    out_path = parse_out_path()
    clear_scene()
    build_humanoid()
    bpy.ops.export_scene.gltf(filepath=out_path, export_format="GLB")
    print(f"[blender_lowpoly] exported: {out_path}")


main()
