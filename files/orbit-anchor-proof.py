import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile

repo = Path.home()/'rer-consolidation/work/sd-orbit-contract-anchor-2/run-orbit'
root = repo.parent
packet = root/'packet'
base = subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
anchor = repo/'docs/contract/ANCHOR.json'
package = repo/'node_modules/@runeditrun/rer/foundation/runtime/contract-docs.mjs'
identity = ['env', 'GIT_AUTHOR_NAME=Run Edit Run fleet', 'GIT_AUTHOR_EMAIL=fleet@runeditrun.com', 'GIT_COMMITTER_NAME=Run Edit Run fleet', 'GIT_COMMITTER_EMAIL=fleet@runeditrun.com']
results=[]
def run(cwd, label, args, expected=None):
    started=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    r=subprocess.run(args,cwd=cwd,capture_output=True,text=True)
    output=r.stdout+r.stderr
    (packet/(label+'.log')).write_text('$ '+' '.join(args)+'\n'+output+f'\nEXIT={r.returncode}\n')
    row=dict(label=label,command=args,cwd=str(cwd),utc=started,exit_code=r.returncode,log=label+'.log')
    results.append(row)
    print(label, 'exit='+str(r.returncode), output[:1300],flush=True)
    if expected is not None and r.returncode!=expected:
        raise RuntimeError(label+' unexpected exit')
    return r

archive=root/'source-tree.tar'
with archive.open('wb') as f:
    subprocess.run(['git','-C',str(repo),'archive',base],stdout=f,check=True)
for name,with_anchor in [('before',False),('after',True)]:
    scratch=Path(tempfile.mkdtemp(prefix='orbit-anchor-'+name+'-',dir='/tmp'))
    with tarfile.open(archive) as tar:
        tar.extractall(scratch,filter='data')
    if with_anchor:
        shutil.copyfile(anchor,scratch/'docs/contract/ANCHOR.json')
        shutil.copyfile(repo/'sources.lock.json',scratch/'sources.lock.json')
    subprocess.run(['git','init','-q','-b','scratch'],cwd=scratch,check=True)
    subprocess.run(['git','config','user.name','Run Edit Run fleet'],cwd=scratch,check=True)
    subprocess.run(['git','config','user.email','fleet@runeditrun.com'],cwd=scratch,check=True)
    subprocess.run(['python3','/tmp/fleet-hooks.py'],cwd=scratch,check=True)
    subprocess.run(['git','add','--all'],cwd=scratch,check=True)
    subprocess.run([*identity,'git','commit','-q','-m','Record isolated source tree'],cwd=scratch,check=True)
    subprocess.run([*identity,'git','commit','-q','--allow-empty','-m','Second isolated managed-copy commit'],cwd=scratch,check=True)
    count=subprocess.check_output(['git','rev-list','--count','HEAD'],cwd=scratch,text=True).strip()
    remotes=subprocess.check_output(['git','remote'],cwd=scratch,text=True).strip()
    absent=subprocess.run(['git','cat-file','-e','28a1db90f135fe783af1c30ba3cf33c339405f9a^{commit}'],cwd=scratch,capture_output=True).returncode
    assert count=='2' and not remotes and absent!=0
    results.append(dict(label=name+'-isolation',cwd=str(scratch),commits=int(count),remotes=[],original_commit_available=False,tree=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=scratch,text=True).strip()))
    (scratch/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
    run(scratch,name+'-literal-brief-path',['node','scripts/contract-docs.mjs','check'])
    run(scratch,name+'-seed-contract',['node','src/base/contract-docs.mjs','check'],0)
    prose=run(scratch,name+'-portable-prose',['node',str(package),'check-prose'],0 if with_anchor else 1)
    if not with_anchor:
        assert 'contract_anchor_missing' in prose.stdout+prose.stderr
    full=run(scratch,name+'-portable-contract',['node',str(package),'check'],1)
    if with_anchor:
        assert 'contract_anchor_missing' not in full.stdout+full.stderr
        assert 'docs/CLAIMS.md: generated content differs' in full.stdout+full.stderr
        # Exercise the seed's actual cheap rer-project verification in the clean
        # two-commit copy before changing any disposable generated views.
        for label,args in [
            ('source-check',['node','node_modules/@runeditrun/rer/edition-authoring/cli.mjs','check']),
            ('rer-check',['pnpm','exec','rer','check','--profile','first-party']),
            ('boundaries',['pnpm','check:boundaries']),
            ('manifest',['pnpm','check:manifest']),
            ('deployment',['pnpm','deployment:check']),
            ('typecheck',['pnpm','typecheck'])
        ]:
            run(scratch,'after-'+label,args)
        original_hash=hashlib.sha256((scratch/'CONTRACT.md').read_bytes()).hexdigest()
        run(scratch,'after-scratch-regenerate',['node',str(package),'write'],0)
        assert hashlib.sha256((scratch/'CONTRACT.md').read_bytes()).hexdigest()==original_hash
        run(scratch,'after-regenerated-portable-contract',['node',str(package),'check'],0)
        results.append(dict(label='scratch-regeneration-only',contract_sha256_unchanged=original_hash,product_views_modified=False,explanation='Only disposable scratch generated views were regenerated; no generated views committed or changed in the product checkout.'))
    results.append(dict(label=name+'-finished',commits=int(subprocess.check_output(['git','rev-list','--count','HEAD'],cwd=scratch,text=True).strip()),remotes=subprocess.check_output(['git','remote'],cwd=scratch,text=True).splitlines()))
    shutil.rmtree(scratch)
archive.unlink()
(packet/'proof-receipt.json').write_text(json.dumps(dict(schema=1,base=base,original='28a1db90f135fe783af1c30ba3cf33c339405f9a',anchor_sha256=hashlib.sha256(anchor.read_bytes()).hexdigest(),results=results),indent=2)+'\n')
