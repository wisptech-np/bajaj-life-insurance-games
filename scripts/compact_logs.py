import os
import glob
import zipfile
import datetime
import subprocess

BRAIN_DIR = r"C:\Users\Diwakar.Adhikari01\.gemini\antigravity\brain"
CONVS_DIR = r"C:\Users\Diwakar.Adhikari01\.gemini\antigravity\conversations"
ARCHIVE_DIR = r"c:\Users\Diwakar.Adhikari01\Desktop\bajaj-life-insurance-games\log_archives"
CURRENT_CONV_ID = "4fea6d29-0a23-45d0-993d-dbab1960227d"

THRESHOLD_DAYS = 7
now = datetime.datetime.now()

def run_cmd(args):
    try:
        res = subprocess.run(args, capture_output=True, text=True, check=True)
        return res.stdout.strip()
    except Exception as e:
        return f"Error: {e}"

def compact_logs():
    print("=" * 80)
    print("                 AUTO LOG COMPACTION & WORKSPACE OPTIMIZER")
    print("=" * 80)
    
    if not os.path.exists(ARCHIVE_DIR):
        os.makedirs(ARCHIVE_DIR)
        print(f"Created archive directory: {ARCHIVE_DIR}")

    # 1. Compact Conversation logs
    print("\nScanning old conversation folders...")
    transcripts = glob.glob(os.path.join(BRAIN_DIR, "*", ".system_generated", "logs", "transcript.jsonl"))
    
    compacted_count = 0
    space_saved = 0

    for path in transcripts:
        conv_dir = os.path.dirname(os.path.dirname(os.path.dirname(path)))
        conv_id = os.path.basename(conv_dir)
        
        # Skip current active conversation
        if conv_id == CURRENT_CONV_ID:
            continue
            
        # Check last modification time
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(path))
        age_days = (now - mtime).days
        
        if age_days >= THRESHOLD_DAYS:
            print(f"Compacting inactive conversation: {conv_id} (age: {age_days} days)")
            
            zip_path = os.path.join(ARCHIVE_DIR, f"{conv_id}_logs.zip")
            
            # Zip all files inside .system_generated
            sys_gen_dir = os.path.join(conv_dir, ".system_generated")
            orig_size = 0
            
            try:
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, dirs, files in os.walk(sys_gen_dir):
                        for file in files:
                            file_path = os.path.join(root, file)
                            orig_size += os.path.getsize(file_path)
                            rel_path = os.path.relpath(file_path, conv_dir)
                            zipf.write(file_path, rel_path)
                
                # Delete original files inside sys_gen_dir
                for root, dirs, files in os.walk(sys_gen_dir, topdown=False):
                    for file in files:
                        os.remove(os.path.join(root, file))
                    for d in dirs:
                        os.rmdir(os.path.join(root, d))
                
                zip_size = os.path.getsize(zip_path)
                space_saved += (orig_size - zip_size)
                compacted_count += 1
            except Exception as e:
                print(f"  Error compacting {conv_id}: {e}")

    # 2. Compact Protobuf files in conversations/
    print("\nScanning large protobuf files...")
    pb_files = glob.glob(os.path.join(CONVS_DIR, "*.pb"))
    
    for pb_path in pb_files:
        conv_id = os.path.basename(pb_path).replace(".pb", "")
        if conv_id == CURRENT_CONV_ID:
            continue
            
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(pb_path))
        age_days = (now - mtime).days
        
        if age_days >= THRESHOLD_DAYS:
            orig_size = os.path.getsize(pb_path)
            # Only compact files > 100KB
            if orig_size > 100 * 1024:
                print(f"Compacting protobuf file: {os.path.basename(pb_path)} ({orig_size/(1024*1024):.1f} MB)")
                zip_path = os.path.join(ARCHIVE_DIR, f"{conv_id}_pb.zip")
                
                try:
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        zipf.write(pb_path, os.path.basename(pb_path))
                    
                    os.remove(pb_path)
                    zip_size = os.path.getsize(zip_path)
                    space_saved += (orig_size - zip_size)
                    compacted_count += 1
                except Exception as e:
                    print(f"  Error compacting {os.path.basename(pb_path)}: {e}")

    print(f"\nCompacted {compacted_count} logs/protobuf sources. Saved {space_saved/(1024*1024):.1f} MB of disk space.")

    # 3. Clean and optimize Git workspace
    print("\nOptimizing Git repository and compacting objects...")
    # Run git gc
    res = run_cmd(["git", "gc", "--prune=now", "--aggressive"])
    print("Git optimization result:")
    print(res)
    print("=" * 80)

if __name__ == "__main__":
    compact_logs()
