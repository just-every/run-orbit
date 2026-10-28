"""Bounded hosted-Ubuntu fallback, invoked only after a real launch fails."""
import os
from pathlib import Path
import subprocess
import time

archives = Path(os.environ['APT_ARCHIVES'])
archives.mkdir(parents=True, exist_ok=True)
config = archives.parent / 'apt.conf'
config.write_text(f'''Dir::Cache::archives "{archives}";
APT::Keep-Downloaded-Packages "true";
APT::Update::Error-Mode "any";
Acquire::Retries "2";
Acquire::http::Timeout "30";
Acquire::https::Timeout "30";
''')
mirrors = ['http://azure.archive.ubuntu.com/ubuntu', 'http://mirrors.edge.kernel.org/ubuntu', 'http://us-east-1.ec2.archive.ubuntu.com/ubuntu']
started = time.monotonic()
for attempt, mirror in enumerate(mirrors, 1):
    # Retain the seed's mirror rotation for both direct and mirror+file images.
    subprocess.run(['sed', '-i', '-E', rf's@^(URIs:[[:space:]]*)https?://(([a-z0-9.-]+\.)?archive\.ubuntu\.com|security\.ubuntu\.com|mirrors\.edge\.kernel\.org)/ubuntu/?@\1{mirror}/@', '/etc/apt/sources.list.d/ubuntu.sources'], check=True)
    for name in ('apt-mirrors.txt', 'apt-mirrors-security.txt'):
        path = Path('/etc/apt') / name
        if path.is_file():
            path.write_text(mirror + '\n')
    print(f'Chromium apt: attempt {attempt}/3 (60s deadline; mirror {mirror})', flush=True)
    result = subprocess.run(['timeout', '--kill-after=5s', '60s', 'bash', '-ec', 'dpkg --configure -a\npnpm exec playwright install-deps chromium'], env={**os.environ, 'APT_CONFIG': str(config)})
    if result.returncode == 0:
        print(f'Chromium apt: complete (attempts={attempt}, seconds={time.monotonic() - started:.0f})')
        break
    print(f'Chromium apt: attempt {attempt}/3 failed (exit {result.returncode})', flush=True)
    if attempt == len(mirrors):
        raise SystemExit(result.returncode)
    time.sleep(attempt * 2)
