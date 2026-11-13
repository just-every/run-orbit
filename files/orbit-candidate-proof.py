import datetime,json,os,shutil,subprocess,tarfile,tempfile
from pathlib import Path
repo=Path.home()/'rer-consolidation/work/sd-orbit-contract-anchor-2/run-orbit'
packet=repo.parent/'packet'
head=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
expected_tree=subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD^{tree}'],text=True).strip()
with tempfile.TemporaryDirectory(prefix='orbit-candidate-') as tmp:
 scratch=Path(tmp)
 archive=repo.parent/'candidate-tree.tar'
 with archive.open('wb') as f: subprocess.run(['git','-C',str(repo),'archive',head],stdout=f,check=True)
 with tarfile.open(archive) as t:t.extractall(scratch,filter='data')
 archive.unlink()
 subprocess.run(['git','init','-q','-b','scratch'],cwd=scratch,check=True)
 subprocess.run(['git','config','user.name','Run Edit Run fleet'],cwd=scratch,check=True)
 subprocess.run(['git','config','user.email','fleet@runeditrun.com'],cwd=scratch,check=True)
 subprocess.run(['python3','/tmp/fleet-hooks.py'],cwd=scratch,check=True)
 subprocess.run(['git','add','--all'],cwd=scratch,check=True)
 identity=['env','GIT_AUTHOR_NAME=Run Edit Run fleet','GIT_AUTHOR_EMAIL=fleet@runeditrun.com','GIT_COMMITTER_NAME=Run Edit Run fleet','GIT_COMMITTER_EMAIL=fleet@runeditrun.com']
 for args in [['commit','-q','-m','Record exact candidate tree'],['commit','-q','--allow-empty','-m','Second isolated managed-copy commit']]:
  subprocess.run([*identity,'git',*args],cwd=scratch,check=True)
 tree=subprocess.check_output(['git','rev-parse','HEAD^{tree}'],cwd=scratch,text=True).strip()
 count=int(subprocess.check_output(['git','rev-list','--count','HEAD'],cwd=scratch,text=True).strip())
 remotes=subprocess.check_output(['git','remote'],cwd=scratch,text=True).splitlines()
 old_available=subprocess.run(['git','cat-file','-e','28a1db90f135fe783af1c30ba3cf33c339405f9a^{commit}'],cwd=scratch,capture_output=True).returncode==0
 assert tree==expected_tree and count==2 and not remotes and not old_available
 (scratch/'node_modules').symlink_to(repo/'node_modules',target_is_directory=True)
 results=[]
 for label,args,expected in [
  ('candidate-scratch-source',['node','node_modules/@runeditrun/rer/edition-authoring/cli.mjs','check'],0),
  ('candidate-scratch-seed-contract',['node','src/base/contract-docs.mjs','check'],0),
  ('candidate-scratch-portable-prose',['node','node_modules/@runeditrun/rer/foundation/runtime/contract-docs.mjs','check-prose'],0),
  ('candidate-scratch-portable-contract',['node','node_modules/@runeditrun/rer/foundation/runtime/contract-docs.mjs','check'],1)
 ]:
  r=subprocess.run(args,cwd=scratch,capture_output=True,text=True)
  output=r.stdout+r.stderr
  (packet/(label+'.log')).write_text('$ '+' '.join(args)+'\n'+output+'\nEXIT='+str(r.returncode)+'\n')
  results.append(dict(label=label,command=args,exit_code=r.returncode,log=label+'.log'))
  assert r.returncode==expected
  if label.endswith('portable-contract'):assert 'contract_anchor_missing' not in output and 'docs/CLAIMS.md: generated content differs' in output
  print(label,'exit='+str(r.returncode),flush=True)
 (packet/'candidate-proof-receipt.json').write_text(json.dumps(dict(schema=1,utc=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'),product_head=head,product_tree=expected_tree,scratch_tree=tree,commits=count,remotes=remotes,original_commit_available=old_available,results=results),indent=2)+'\n')
