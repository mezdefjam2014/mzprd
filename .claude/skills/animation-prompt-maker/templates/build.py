#!/usr/bin/env python3
"""Fill the motion-preview template with a data JSON file.
Usage: python3 build.py data.json out.html"""
import json, sys, pathlib
tpl = (pathlib.Path(__file__).parent / "motion-preview.html").read_text()
data = json.loads(pathlib.Path(sys.argv[1]).read_text())
html = tpl.replace("__TITLE__", data["title"]).replace("__DATA__", json.dumps(data, indent=1))
pathlib.Path(sys.argv[2]).write_text(html)
print("wrote", sys.argv[2])
