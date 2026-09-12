"""Build and run a wheel consumer outside the repository, with no model calls."""
from __future__ import annotations
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import venv
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    workspace = Path(tempfile.mkdtemp(prefix="meetmind-core-package-"))
    wheels = workspace / "wheels"
    wheels.mkdir()
    print("Verification directory:", workspace, flush=True)
    subprocess.run([sys.executable, "-m", "pip", "wheel", "--no-deps", "--wheel-dir", str(wheels),
                    str(ROOT / "packages/meetmind_core")], check=True)
    built = list(wheels.glob("meetmind_world_core-*.whl"))
    if len(built) != 1:
        raise RuntimeError("Expected one core wheel")
    with zipfile.ZipFile(built[0]) as archive:
        names = archive.namelist()
        expected = {"__init__.py", "replay.py", "adapters.py", "recipes.py", "action_plans.py"}
        code = {name.removeprefix("meetmind_core/") for name in names if name.startswith("meetmind_core/")}
        if code != expected or any(not (name.startswith("meetmind_core/") or ".dist-info/" in name) for name in names):
            raise RuntimeError("Wheel contains files outside the explicitly included core")
        metadata = archive.read(next(name for name in names if name.endswith(".dist-info/METADATA"))).decode()
        if "Requires-Dist:" in metadata:
            raise RuntimeError("Core should have no runtime dependencies")
    env = workspace / "venv"
    venv.EnvBuilder(with_pip=True).create(env)
    python = env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    subprocess.run([str(python), "-I", "-m", "pip", "install", "--no-index", "--no-deps", str(built[0])],
                   check=True, cwd=workspace)
    consumer = workspace / "weekend_walk.py"
    shutil.copyfile(ROOT / "examples/core_consumer/weekend_walk.py", consumer)
    environment = {key: value for key, value in os.environ.items() if key not in {"PYTHONPATH", "PYTHONHOME"}}
    probe = subprocess.check_output([str(python), "-I", "-c",
        "import meetmind_core,json; print(json.dumps({'path':meetmind_core.__file__,'version':meetmind_core.__version__}))"],
        cwd=workspace, env=environment, text=True)
    imported = json.loads(probe)
    if env.resolve() not in Path(imported["path"]).resolve().parents:
        raise RuntimeError("Imported source tree instead of installed wheel")
    completed = subprocess.run([str(python), "-I", str(consumer), "--output", str(workspace / "output")],
                               cwd=workspace, env=environment, check=True, text=True, capture_output=True)
    report = json.loads(completed.stdout)
    report.update(installed=imported, wheel=str(built[0]), repository_imports=False)
    (workspace / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
