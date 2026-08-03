"""Skill 加载器：runtime 每 tick 读取的行为指引文件（.md 文本）。

目的：Skill 规定 Agent 的发展方向与权限限制（不是代码）；runtime 读取原文
      注入决策 prompt。Skill 属禁止自进化项（permissions.yaml deny skill.workflow）。
输入：skill 名称（不含扩展名，如 "cafe_daily"）。
输出：.md 文件文本；不存在抛 FileNotFoundError。
验收：tests/test_runtime.py —— cafe_daily/meeting 可加载且含关键约束段。
"""

from pathlib import Path

SKILLS_DIR = Path(__file__).resolve().parent


def load_skill(name: str) -> str:
    if not name.replace("_", "").replace("-", "").isalnum():
        raise ValueError(f"非法 skill 名：{name!r}")
    path = SKILLS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"skill 不存在：{path}")
    return path.read_text(encoding="utf-8")
