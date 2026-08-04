"""体素人物生成管线：照片 → CharacterSpec/像素 atlas → 体素 GLB → Package avatar。

模块（ARCHITECTURE.md §5a 人物生成线）：
    texture_gen.py    照片 → CharacterSpec → AI 像素瓦片 → 固定 UV atlas + 四表情
    voxel_gen.py      atlas → Blender 无头装配体素 GLB + 校验
    person_builder.py 编排全流程，登记 Package avatar / 资产条目 / manifest
    video_frames.py   视频关键帧抽取（IF-1 预处理）
"""
