"""Read-only check of the task's Vite ranges against the tracked main tree.
Author: Codex, 2026-11-17. Run from the product checkout root.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess


def git(*args):
    return subprocess.check_output(['git', *args], text=True).strip()


head = git('rev-parse', 'HEAD')
main = git('rev-parse', 'origin/main')
live_main = git('ls-remote', 'origin', 'refs/heads/main').split()[0]
assert head == main == live_main, 'main moved; inspect the new main before reporting no-change'
assert not git('status', '--porcelain'), 'product checkout must be untouched'
package_bytes = subprocess.check_output(['git', 'show', head + ':package.json'])
lock_bytes = subprocess.check_output(['git', 'show', head + ':pnpm-lock.yaml'])
package = json.loads(package_bytes)
lock = lock_bytes.decode()
assert package['devDependencies']['vite'] == '8.2.4'
importer = re.search(r'^      vite:\n        specifier: ([^\n]+)\n        version: ([^\n]+)', lock, re.M)
assert importer, 'direct Vite lock entry absent'
assert importer.group(1) == '8.2.4'
assert importer.group(2).split('(')[0] == '8.2.4'
package_entries = re.findall(r'^  vite@(\d+\.\d+\.\d+):$', lock, re.M)
snapshots = re.findall(r'^  vite@(\d+\.\d+\.\d+)\([^\n]*\):$', lock, re.M)
references = sorted(set(re.findall(r'(?<![/\w-])vite@(\d+\.\d+\.\d+)', lock)))
resolved_edges = sorted(set(re.findall(r'^      vite: (\d+\.\d+\.\d+)(?:\(|$)', lock, re.M)))
assert package_entries == ['8.2.4']
assert snapshots == ['8.2.4']
assert references == resolved_edges == ['8.2.4']
assert not any((8, 2, 0) <= tuple(map(int, v.split('.'))) <= (8, 2, 3) for v in references)
prior = 'a35d331920a4bace2548bbd0efaf9344ffcd32a6'
subprocess.run(['git', 'merge-base', '--is-ancestor', prior, head], check=True)
prior_package = json.loads(subprocess.check_output(['git', 'show', prior + '^:package.json']))
assert prior_package['devDependencies']['vite'] == '8.2.2'
progress = subprocess.check_output(['git', 'show', head + ':ACCEPTANCE.md'], text=True)
counts = re.search(r'^\| Full target \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$', progress, re.M)
assert counts
row = {
    'author': 'Codex', 'date': '2026-11-17', 'status': 'no-change',
    'repository': 'just-every/run-orbit', 'branch': git('branch', '--show-current'),
    'head': head, 'origin_main': main, 'live_main': live_main,
    'declared_vite': package['devDependencies']['vite'],
    'lock_importer_specifier': importer.group(1), 'lock_importer_resolution': importer.group(2),
    'vite_package_entries': package_entries, 'vite_snapshot_entries': snapshots,
    'all_resolved_vite_versions': references, 'resolved_vite_dependency_edges': resolved_edges,
    'affected_ranges': ['>=8.2.0 <=8.2.3'], 'first_patched_version': '8.2.4',
    'advisories': ['GHSA-9jrq-w75r-8gcw', 'GHSA-rq7h-c2jc-7f22', 'GHSA-vfpm-58rq-9qcg'],
    'listed_alert_numbers': [26,27,28,29,30,31], 'vulnerable_vite_resolutions_before': 0,
    'vulnerable_vite_resolutions_after': 0,
    'prior_fix': prior, 'prior_declared_vite': prior_package['devDependencies']['vite'],
    'prior_fix_is_ancestor': True, 'product_files_changed': 0, 'new_product_commits': 0,
    'product_checkout_clean': True, 'clause_changes': [],
    'clause_counts_before_and_after': dict(zip(['done','partial','missing','total'], map(int,counts.groups()))),
    'file_hashes': {'package.json': hashlib.sha256(package_bytes).hexdigest(),
                    'pnpm-lock.yaml': hashlib.sha256(lock_bytes).hexdigest()},
    'validation': 'PASS: tracked manifest, lock importer, package, snapshot and all Vite resolution references are patched on live main',
}
print(json.dumps(row, indent=2, sort_keys=True))
