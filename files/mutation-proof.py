from pathlib import Path
import hashlib,json,os,subprocess,time
root=Path('/workspace/run-orbit')
packet=Path.home()/'rer-consolidation/work/sd-orbit-c-f67/packet'
cases=[
 ('P1-shared-use','src/core/features/drafts/library-repository.ts',"WHERE owner_id=? OR visibility='shared' ORDER BY kind,name,id","WHERE owner_id=? ORDER BY kind,name,id",'The second operator positively lists every shared selection'),
 ('P2-signature','src/core/features/drafts/library-routes.ts',"else body+='\\n\\n'+entry.body;","else if(kind!=='signature')body+='\\n\\n'+entry.body;",'Synthetic Orbit sales'),
 ('P3-opt-out','src/core/features/outreach/service.ts',"...(optOut===undefined?{}:{opt_out:optOut})","...(optOut===undefined?{}:{opt_out:false})",'The mail HTTP edge receives each exact approved recipient')
]
receipts=[]
for key,file,old,new,expected in cases:
 path=root/file;original=path.read_bytes();source=original.decode()
 if source.count(old)!=1:raise SystemExit('Mutation anchor mismatch: '+key)
 started=time.time()
 try:
  path.write_text(source.replace(old,new,1))
  result=subprocess.run(['bash','-lc',". /tmp/rer-cloud-toolchain.sh\ncloud_run timeout 180 pnpm exec tsx --test --test-name-pattern='OUT-014' tests/core/signals-outreach.test.ts"],cwd=root,capture_output=True,text=True,timeout=210)
  log=result.stdout+result.stderr
  (packet/(key+'.log')).write_text(log)
  receipt=dict(point=key,source=file,mutation=old+' -> '+new,exit=result.returncode,caught=result.returncode!=0 and expected in log,expectedFailureContains=expected,seconds=round(time.time()-started,1),restoredSha256=hashlib.sha256(original).hexdigest())
  receipts.append(receipt)
  print(json.dumps(receipt),flush=True)
 finally:
  path.write_bytes(original)
 if not receipt['caught']:raise SystemExit('Mutation was not caught by the expected assertion: '+key)
(packet/'mutation-receipt.json').write_text(json.dumps(receipts,indent=2)+'\n')
