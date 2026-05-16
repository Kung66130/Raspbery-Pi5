import subprocess
import os

files_to_sync = {
    'gemini_cli.py': '~/gemini_cli.py',
    'pi-power-saver.sh': '~/pi-power-saver.sh'
}

password = "Pi5-Secure-@9674"

for local, remote in files_to_sync.items():
    if os.path.exists(local):
        print(f"Syncing {local} to {remote}...")
        with open(local, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Use ssh to write the content
        cmd = ['ssh', 'admin@100.123.233.122', f'cat > {remote}']
        process = subprocess.Popen(cmd, stdin=subprocess.PIPE, text=True)
        process.communicate(input=content)
        print(f"Done syncing {local}")

# Move power saver to final location
print("Setting up power saver permissions...")
setup_cmd = f"echo '{password}' | ssh admin@100.123.233.122 'sudo -S mv ~/pi-power-saver.sh /usr/local/bin/pi-power-saver.sh; sudo -S chmod +x /usr/local/bin/pi-power-saver.sh'"
subprocess.run(setup_cmd, shell=True)
print("All files synced and setup completed!")
