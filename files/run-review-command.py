import datetime,json,subprocess,sys,time
from pathlib import Path
root=Path(__file__).resolve().parent
name, command=sys.argv[1:]
packet=root/'packet'
start=datetime.datetime.now(datetime.timezone.utc).isoformat()
tick=time.monotonic()
with (packet/(name+'.log')).open('w') as log:
    result=subprocess.run(['bash','-c','. /tmp/rer-cloud-toolchain.sh\n'+command],stdout=log,stderr=subprocess.STDOUT)
row=dict(id=name,command=command,cwd=str(Path.cwd()),source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),started_at=start,ended_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),elapsed_seconds=round(time.monotonic()-tick,3),exit=result.returncode,log=name+'.log')
with (packet/'commands.jsonl').open('a') as file:file.write(json.dumps(row,sort_keys=True)+'\n')
print(json.dumps(row,sort_keys=True),flush=True)
raise SystemExit(result.returncode)
