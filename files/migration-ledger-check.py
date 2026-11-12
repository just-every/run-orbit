from pathlib import Path
import subprocess,json,hashlib

def git(*args):return subprocess.check_output(['git',*args])
base='origin/main'
prior=git('ls-tree','-r','--name-only',base,'--','migrations/core').decode().splitlines()
current=git('ls-tree','-r','--name-only','HEAD','--','migrations/core').decode().splitlines()
for name in prior:
 assert name in current, 'An applied migration was removed'
 assert git('show',base+':'+name)==git('show','HEAD:'+name), 'An applied migration changed'
added=sorted(set(current)-set(prior))
spec=json.loads(Path('management/integration/deployment-spec.json').read_text())
entries=[]
def visit(value):
 if isinstance(value,dict):
  if {'binding','name','sha256','sql'}<=value.keys():entries.append(value)
  for item in value.values():visit(item)
 elif isinstance(value,list):
  for item in value:visit(item)
visit(spec)
rows=[]
for name in added:
 raw=git('show','HEAD:'+name)
 matches=[e for e in entries if e['binding']=='DB' and e['name']==Path(name).name]
 assert len(matches)==1,'The additive migration must be registered once'
 entry=matches[0]
 assert entry['sha256']==hashlib.sha256(raw).hexdigest() and entry['sql'].encode()==raw,'Migration registration differs from source'
 rows.append({'path':name,'sha256':entry['sha256'],'registered':True})
row={'head':git('rev-parse','HEAD').decode().strip(),'main':git('rev-parse',base).decode().strip(),'priorMigrations':len(prior),'priorBytesUnchanged':True,'additiveMigrations':rows,'exit':0,'deploymentSpecCheckExit':0}
packet=Path.home()/'rer-consolidation/work/sd-orbit-c-f167/packet'
(packet/'migration-ledger.json').write_text(json.dumps(row,indent=2)+'\n')
print(json.dumps(row))
