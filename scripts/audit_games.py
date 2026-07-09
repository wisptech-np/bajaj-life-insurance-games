import os
import subprocess
import json
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

GAMES = [
    "coverage-archer",
    "edurise-jumper",
    "life-goals-bubble-shooter",
    "retire-rich-clicker",
    "safe-stride-balancer",
    "she-shield-protector",
    "stackibility-stack",
    "tax-save-maze",
    "tightrope-protection"
]

WORKSPACE_ROOT = r"c:\Users\Diwakar.Adhikari01\Desktop\bajaj-life-insurance-games"

EMOJI_PATTERN = re.compile(r"['\"`][\u2600-\u27BF\U0001f000-\U0001f9ff]['\"`]")

def check_emoji_in_canvas_code(game_path):
    violations = []
    # Recursively look at .js, .jsx, .ts, .tsx files in game_path, excluding node_modules and dist
    for root, dirs, files in os.walk(game_path):
        if "node_modules" in root or "dist" in root or ".git" in root:
            continue
        for file in files:
            if file.endswith((".js", ".jsx", ".ts", ".tsx")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        for idx, line in enumerate(f, 1):
                            # Simple regex to find emojis in strings
                            matches = EMOJI_PATTERN.findall(line)
                            if matches:
                                # Filter out common UI emojis that are fine (e.g., icons in buttons)
                                # and warn about potential canvas emoji sprites
                                if "ctx" in line or "canvas" in line or "draw" in line or "sprite" in line or "Scene" in line:
                                    violations.append((file, idx, line.strip(), matches))
                except Exception:
                    pass
    return violations

def check_lead_capture(game_path):
    has_lms = False
    has_form = False
    
    for root, dirs, files in os.walk(game_path):
        if "node_modules" in root or "dist" in root:
            continue
        for file in files:
            if file.endswith((".js", ".jsx", ".ts", ".tsx", ".html")):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        if "submitToLMS" in content or "api.js" in content or "api.ts" in content:
                            has_lms = True
                        if "LeadCapture" in content or "EnterDetails" in content or "input" in content:
                            has_form = True
                except Exception:
                    pass
    return has_lms, has_form

def audit_game(game):
    game_path = os.path.join(WORKSPACE_ROOT, game)
    package_json_path = os.path.join(game_path, "package.json")
    
    if not os.path.exists(package_json_path):
        return {"name": game, "status": "Missing package.json", "build_ok": False, "violations": [], "lms_ok": False}
        
    # Read package.json to see dependencies & scripts
    try:
        with open(package_json_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
    except Exception as e:
        return {"name": game, "status": f"Invalid package.json: {e}", "build_ok": False, "violations": [], "lms_ok": False}

    has_node_modules = os.path.exists(os.path.join(game_path, "node_modules"))
    
    emoji_violations = check_emoji_in_canvas_code(game_path)
    has_lms, has_form = check_lead_capture(game_path)
    
    # Check if build succeeds (we won't run this automatically if node_modules is missing, to save time/network)
    build_ok = False
    build_msg = "Not tested (no node_modules)"
    
    if has_node_modules:
        print(f"Running build check for {game}...")
        try:
            # Run pnpm build
            res = subprocess.run(["pnpm", "build"], cwd=game_path, capture_output=True, text=True, timeout=60, shell=True)
            if res.returncode == 0:
                build_ok = True
                build_msg = "Success"
            else:
                build_msg = f"Failed (exit code {res.returncode}): {res.stderr[:200]}"
        except subprocess.TimeoutExpired:
            build_msg = "Timeout (took >60s)"
        except Exception as e:
            build_msg = f"Error running build command: {e}"
            
    return {
        "name": game,
        "status": "Installed" if has_node_modules else "Node modules missing",
        "build_ok": build_ok,
        "build_msg": build_msg,
        "violations": emoji_violations,
        "lms_ok": has_lms,
        "form_ok": has_form
    }

def run_audit():
    print("=" * 90)
    print("                         BAJAJ GAMES AUDIT REPORT")
    print("=" * 90)
    
    reports = []
    for game in GAMES:
        print(f"Auditing game: {game}...")
        rep = audit_game(game)
        reports.append(rep)
        
    print("\n" + "=" * 90)
    print("                               AUDIT SUMMARY")
    print("=" * 90)
    print(f"{'Game Name':<30} | {'Status':<20} | {'Build Status':<20} | {'LMS Check':<9} | {'Canvas Emojis':<10}")
    print("-" * 90)
    
    for r in reports:
        emoji_status = f"{len(r['violations'])} warnings" if r['violations'] else "OK"
        lms_status = "OK" if r['lms_ok'] else "Missing"
        print(f"{r['name']:<30} | {r['status']:<20} | {r['build_msg'][:20]:<20} | {lms_status:<9} | {emoji_status:<10}")
        
    print("-" * 90)
    
    # Detailed violations
    has_violations = False
    for r in reports:
        if r['violations']:
            has_violations = True
            print(f"\n[Canvas Emoji Warnings in {r['name']}]:")
            for file, line_no, text, match in r['violations'][:5]:
                print(f"  * {file}:{line_no}: {text} (Matches: {match})")
            if len(r['violations']) > 5:
                print(f"    ... and {len(r['violations']) - 5} more warnings.")
                
    if not has_violations:
        print("\nNo canvas emoji violations detected! Clean sprites setup.")
    print("=" * 90)

if __name__ == "__main__":
    run_audit()
