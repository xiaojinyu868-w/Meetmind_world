"""Blender (4.5) batch: merge each persona's per-clip Tripo FBX retargets into one browser GLB.

Usage: blender -b -P convert_personas.py -- <persona> [<persona> ...]
Every FBX of a persona comes from the same rig task, so rest skeletons must match
exactly; the first armature + mesh is kept and later takes contribute actions only.
"""
import bpy, json, os, sys, hashlib
from pathlib import Path

ROOT = Path(os.environ.get("ECHO_TRIPO_WORK", "tripo-work")).resolve()
OUT = ROOT / "personas"
OUT.mkdir(exist_ok=True)
CLIPS = [("standing_relax", "Social-Standing_Relax"), ("agree", "Social-Agree"), ("greet_02", "Social-Greet_02"), ("clap", "Social-Clap")]
COLOR_MAX, DETAIL_MAX = 1024, 512

names = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
reports = []
for name in names:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base, retained, clips = None, [], []
    for state, clip_name in CLIPS:
        source = ROOT / "assets" / f"{name}-anim-{state}" / "model_url.fbx"
        if not source.exists():
            raise SystemExit(f"missing {source}")
        before_objects, before_actions = set(bpy.data.objects), set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=str(source), use_anim=True)
        added = [o for o in bpy.data.objects if o not in before_objects]
        armature = next(o for o in added if o.type == "ARMATURE")
        candidates = [a for a in bpy.data.actions if a not in before_actions and a.frame_range[1] > a.frame_range[0]]
        chosen = min(candidates, key=lambda a: a.name.count("|"))
        chosen.name = clip_name
        chosen.use_fake_user = True
        # Tripo FBX writes an identity scale curve per bone; rotations and
        # translations stay exactly as authored.
        for layer in chosen.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fcurve in list(bag.fcurves):
                        if fcurve.data_path.endswith("scale"):
                            bag.fcurves.remove(fcurve)
        if base is None:
            base, retained = armature, added
        else:
            # Older Tripo exports add zero-weight "*_end" leaf nubs; every
            # deforming bone must exist in both takes with the same rest pose.
            names, base_names = {b.name for b in armature.data.bones}, {b.name for b in base.data.bones}
            extra = {n for n in names ^ base_names if not n.endswith("_end")}
            assert not extra, (name, "skeleton changed", sorted(extra))
            for bone in armature.data.bones:
                if bone.name not in base_names:
                    continue
                delta = max(abs(v) for row in (bone.matrix_local - base.data.bones[bone.name].matrix_local) for v in row)
                assert delta < 0.0001, (name, bone.name, delta)
            for obj in added:
                bpy.data.objects.remove(obj, do_unlink=True)
        clips.append(chosen)
        for action in list(bpy.data.actions):
            if action not in clips and action not in before_actions:
                bpy.data.actions.remove(action)
    base.animation_data.action = None
    for action in clips:
        track = base.animation_data.nla_tracks.new()
        track.name = action.name
        start, end = action.frame_range
        strip = track.strips.new(action.name, int(start), action)
        strip.action_frame_start, strip.action_frame_end, strip.extrapolation = start, end, "NOTHING"
        if hasattr(strip, "action_slot") and action.slots:
            strip.action_slot = action.slots[0]
    images = set()
    for obj in retained:
        if obj.type != "MESH":
            continue
        for material in obj.data.materials:
            if not material or not material.use_nodes:
                continue
            principled = next((n for n in material.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
            if principled:
                principled.inputs["Roughness"].default_value = .79
                principled.inputs["Metallic"].default_value = 0
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    images.add(node.image)
    for image in images:
        limit = COLOR_MAX if image.colorspace_settings.name == "sRGB" and "normal" not in image.name.lower() else DETAIL_MAX
        if max(image.size) > limit:
            ratio = limit / max(image.size)
            image.scale(max(1, round(image.size[0] * ratio)), max(1, round(image.size[1] * ratio)))
        image.pack()
    bpy.context.scene.frame_set(1)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in retained:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = base
    destination = OUT / f"{name}.glb"
    bpy.ops.export_scene.gltf(filepath=str(destination), export_format="GLB", use_selection=True, export_animations=True,
                              export_animation_mode="NLA_TRACKS", export_force_sampling=False, export_frame_range=False,
                              export_nla_strips=True, export_optimize_animation_size=True, export_image_format="JPEG",
                              export_jpeg_quality=86, export_materials="EXPORT", export_yup=True, export_skins=True,
                              export_all_influences=False, export_def_bones=False)
    data = destination.read_bytes()
    reports.append({"name": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
                    "clips": [{"name": a.name, "frames": list(a.frame_range)} for a in clips],
                    "images": [{"name": i.name, "size": list(i.size), "colorspace": i.colorspace_settings.name} for i in images]})
(OUT / "conversion-report.json").write_text(json.dumps(reports, indent=2), encoding="utf8")
print("REPORT " + json.dumps(reports))
