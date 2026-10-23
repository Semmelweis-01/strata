
import subprocess, os
os.chdir(r"C:\\Users\\yukino\\Documents\\deepseek-harness\\default-workspace\\demo-repo")
env = {**os.environ, "WT_SESSION": "probe"}
p = subprocess.run(["node", r"C:\\Users\\yukino\\Documents\\deepseek-harness\\default-workspace\\strata\\bin\\strata.mjs", "--json", "--max-rows", "4", "engine.js"],
                   capture_output=True, text=True, encoding="utf-8", env=env)
print("rc=", p.returncode)
print("stdout len=", len(p.stdout))
print("stdout head=", repr(p.stdout[:80]))
print("stderr=", repr(p.stderr[:300]))
