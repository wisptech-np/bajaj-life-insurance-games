import os
import glob
import json
import datetime

BRAIN_DIR = r"C:\Users\Diwakar.Adhikari01\.gemini\antigravity\brain"
CONVS_DIR = r"C:\Users\Diwakar.Adhikari01\.gemini\antigravity\conversations"

# Model Pricing per 1M tokens (Gemini 1.5/3.5 Flash)
PRICE_INPUT_1M = 0.075
PRICE_OUTPUT_1M = 0.30

# Character-to-Token heuristic: 1 token approx 4 characters
CHARS_PER_TOKEN = 4.0

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.1f} MB"

def scan_conversations():
    print("=" * 100)
    print(f"        GEMINI MODEL USAGE REPORT - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)
    print(f"{'Conversation ID':<38} | {'Steps':<5} | {'Model Calls':<11} | {'Est. In Tokens':<14} | {'Est. Out Tokens':<15} | {'Est. Cost ($)':<13} | {'Disk Size':<9}")
    print("-" * 100)

    total_steps = 0
    total_model_calls = 0
    total_in_tokens = 0
    total_out_tokens = 0
    total_cost = 0.0
    total_disk = 0

    # Find transcript files
    pattern = os.path.join(BRAIN_DIR, "*", ".system_generated", "logs", "transcript.jsonl")
    transcript_paths = glob.glob(pattern)

    rows = []
    for path in transcript_paths:
        conv_id = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(path))))
        
        # Calculate sizes of files in the conversation directory
        conv_dir = os.path.dirname(os.path.dirname(os.path.dirname(path)))
        disk_size = 0
        for root, dirs, files in os.walk(conv_dir):
            for file in files:
                try:
                    disk_size += os.path.getsize(os.path.join(root, file))
                except OSError:
                    pass
        
        # Add corresponding protobuf/db files size in conversations directory
        pb_pattern = os.path.join(CONVS_DIR, f"{conv_id}.*")
        for pb_file in glob.glob(pb_pattern):
            try:
                disk_size += os.path.getsize(pb_file)
            except OSError:
                pass

        # Parse steps and estimate tokens
        steps = 0
        model_calls = 0
        in_chars = 0
        out_chars = 0
        
        try:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    steps += 1
                    try:
                        step_data = json.loads(line)
                        source = step_data.get("source", "")
                        step_type = step_data.get("type", "")
                        content = step_data.get("content", "")
                        
                        # Accumulate characters
                        if source == "MODEL":
                            out_chars += len(content)
                            if step_type == "PLANNER_RESPONSE":
                                model_calls += 1
                        elif source == "USER_EXPLICIT" or step_type == "USER_INPUT":
                            in_chars += len(content)
                        else:
                            # Other inputs are fed into model context, we treat them as input history chars
                            in_chars += len(content)
                    except Exception:
                        pass
        except Exception as e:
            # Skip if we can't open
            continue

        in_tokens = int(in_chars / CHARS_PER_TOKEN)
        out_tokens = int(out_chars / CHARS_PER_TOKEN)
        
        # Calculate cost
        cost = (in_tokens / 1000000.0) * PRICE_INPUT_1M + (out_tokens / 1000000.0) * PRICE_OUTPUT_1M

        total_steps += steps
        total_model_calls += model_calls
        total_in_tokens += in_tokens
        total_out_tokens += out_tokens
        total_cost += cost
        total_disk += disk_size

        rows.append({
            "id": conv_id,
            "steps": steps,
            "calls": model_calls,
            "in_tokens": in_tokens,
            "out_tokens": out_tokens,
            "cost": cost,
            "disk": disk_size
        })

    # Sort rows by disk size or model calls (descending)
    rows.sort(key=lambda x: x["calls"], reverse=True)

    for r in rows[:15]:  # Display top 15 active conversations
        print(f"{r['id']:<38} | {r['steps']:<5} | {r['calls']:<11} | {r['in_tokens']:<14,} | {r['out_tokens']:<15,} | ${r['cost']:<12.5f} | {format_size(r['disk']):<9}")

    if len(rows) > 15:
        print(f"... and {len(rows) - 15} more conversation directories.")
        
    print("-" * 100)
    print(f"{'TOTAL':<38} | {total_steps:<5} | {total_model_calls:<11} | {total_in_tokens:<14,} | {total_out_tokens:<15,} | ${total_cost:<12.5f} | {format_size(total_disk):<9}")
    print("=" * 100)
    
    # Estimate costs for Pro
    pro_cost = (total_in_tokens / 1000000.0) * 1.25 + (total_out_tokens / 1000000.0) * 5.00
    print(f"Cost Heuristics details:")
    print(f"  * Gemini Flash (Est): ${total_cost:.4f}  (Input: ${PRICE_INPUT_1M}/1M, Output: ${PRICE_OUTPUT_1M}/1M)")
    print(f"  * Gemini Pro (Est):   ${pro_cost:.4f}  (Input: $1.25/1M, Output: $5.00/1M)")
    print("=" * 100)

if __name__ == "__main__":
    scan_conversations()
