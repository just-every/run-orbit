import json,subprocess,re
from pathlib import Path

def git(*args):
    return subprocess.check_output(['git',*args],text=True)
pkg=json.loads(Path('package.json').read_text());seed=json.loads(Path('seed.json').read_text());release=json.loads(Path('RELEASE.json').read_text())
prior=json.loads(git('show','v0.4.8:package.json'));main_pkg=json.loads(git('show','origin/main:package.json'))
assert pkg['version']==seed['version']==release['version']
assert release['previousVersion']==prior['version']
assert tuple(map(int,pkg['version'].split('.')))>tuple(map(int,prior['version'].split('.')))
assert pkg['devDependencies']['@runeditrun/rer']==main_pkg['devDependencies']['@runeditrun/rer']
changelog=Path('CHANGELOG.md').read_text();old=git('show','origin/main:CHANGELOG.md')
match=re.search(r'^## '+re.escape(pkg['version'])+r' — (\d{4}-\d{2}-\d{2})\n\n(.*?)(?=^## |\Z)',changelog,re.M|re.S)
assert match and match[1]==release['date'] and match[2].strip()==release['publicReleaseNotes'].strip()
assert changelog.endswith(old.removeprefix('# Changelog\n'))
added=git('diff','--name-only','--diff-filter=A','v0.4.8..origin/main','--','migrations/').splitlines()
assert [Path(name).name for name in added]==[entry['id'] for entry in release['migrations']]
assert all(entry['buyerSteps'].strip() for entry in release['migrations'])
assert not Path('package-lock.json').exists()
allowed={'package.json','seed.json','RELEASE.json','CHANGELOG.md','sources.lock.json'}
paths=set(git('diff','--name-only','origin/main').splitlines())
assert paths<=allowed,paths-allowed
for file in ('CONTRACT.md','ACCEPTANCE.md','docs/CLAIMS.md','pnpm-lock.yaml'):
    assert Path(file).read_text()==git('show','origin/main:'+file),file
result={'ok':True,'version':pkg['version'],'previousVersion':release['previousVersion'],'rerPin':pkg['devDependencies']['@runeditrun/rer'],'paths':sorted(paths),'migrations':[entry['id'] for entry in release['migrations']],'contractChanges':{},'newTests':0}
print(json.dumps(result,indent=2))
