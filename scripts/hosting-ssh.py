"""SSH transport using the deployment key stored outside the repository."""
from pathlib import Path
import argparse
import os
import subprocess

PRIVATE = Path(os.environ['LOCALAPPDATA']) / 'SIGMA-ELMS' / 'Deployment'
HOST = 'sigma-elms@ssh-sigma-elms.alwaysdata.net'
OPTIONS = ['-i', str(PRIVATE / 'alwaysdata_ed25519'), '-o', 'BatchMode=yes',
           '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=15',
           '-o', 'UserKnownHostsFile=' + str(PRIVATE / 'known_hosts')]


def run(script: str):
    return subprocess.run(['ssh', *OPTIONS, HOST, 'python3 -'], input=script, text=True, check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--script', type=Path)
    group.add_argument('--upload', nargs=2, metavar=('LOCAL_FILE', 'REMOTE_FILE'))
    args = parser.parse_args()
    if args.script:
        run(args.script.read_text(encoding='utf-8'))
    else:
        source, target = args.upload
        if not target.startswith('/home/sigma-elms/') or '..' in Path(target).parts:
            raise ValueError('Remote destination must stay within this hosting account.')
        subprocess.run(['scp', *OPTIONS, source, HOST + ':' + target], check=True)
