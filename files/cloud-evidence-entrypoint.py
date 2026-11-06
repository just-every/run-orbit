"""Report-only Git transport. No product refs, provider reads or landing signals."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import subprocess
import tempfile


class TransferError(ValueError):
    pass


def identity(repository, tag):
    if not re.fullmatch(r'(?:just-every|runeditrun)/[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}', repository):
        raise TransferError('invalid repository')
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]{0,180}', tag):
        raise TransferError('invalid tag')
    if '..' in tag or tag.endswith(('.', '.lock')):
        raise TransferError('invalid tag')
    return 'refs/heads/evidence/' + tag


def file_name(name):
    path = PurePosixPath(name)
    if (not name or path.is_absolute() or str(path) != name or '..' in path.parts
            or any(p.startswith('.') for p in path.parts) or '\\' in name
            or any(ord(c) < 32 for c in name)):
        raise TransferError('unsafe packet filename')
    return path


def environment():
    env = {k: v for k, v in os.environ.items() if not k.startswith('GIT_')}
    env.update(GIT_TERMINAL_PROMPT='0', GIT_AUTHOR_NAME='Run Edit Run fleet',
               GIT_COMMITTER_NAME='Run Edit Run fleet', GIT_AUTHOR_EMAIL='fleet@runeditrun.com',
               GIT_COMMITTER_EMAIL='fleet@runeditrun.com')
    return env


def git(directory, *args, data=None, check=True):
    try:
        command=['git', '-C', str(directory), *args]
        if args[0]=='commit-tree':
            command=['env','GIT_AUTHOR_NAME=Run Edit Run fleet','GIT_AUTHOR_EMAIL=fleet@runeditrun.com','GIT_COMMITTER_NAME=Run Edit Run fleet','GIT_COMMITTER_EMAIL=fleet@runeditrun.com',*command]
        result = subprocess.run(command, input=data,
                                capture_output=True, env=environment(), timeout=180)
    except (OSError, subprocess.SubprocessError):
        raise TransferError('Git ' + args[0] + ' unavailable or timed out') from None
    if check and result.returncode:
        raise TransferError('Git ' + args[0] + ' failed exit=' + str(result.returncode))
    return result


def output(directory, *args, **kwargs):
    return git(directory, *args, **kwargs).stdout.decode().strip()


def remote_for(repository, remote=None):
    remote = remote or 'https://github.com/' + repository + '.git'
    if (not re.fullmatch(r'https://github\.com/' + re.escape(repository) + r'(?:\.git)?', remote)
            and not (Path(remote).is_absolute() and Path(remote).is_dir())):
        raise TransferError('remote must be the declared credential-free GitHub URL or a local Git directory')
    return remote


def digest(data):
    return hashlib.sha256(data).hexdigest()


def publish(repo, repository, tag, packet, names):
    """Publish explicitly selected files in a separate report-only commit tree."""
    ref = identity(repository, tag)
    repo, packet = Path(repo).resolve(), Path(packet).resolve()
    remote = remote_for(repository, output(repo, 'remote', 'get-url', '--push', 'origin'))
    product_head = output(repo, 'rev-parse', 'HEAD')
    product_branch = output(repo, 'branch', '--show-current')
    if not names or len(names) != len(set(names)):
        raise TransferError('select distinct actual report and receipt files with --file')
    files = {}
    for name in names:
        path = packet / file_name(name)
        if path.is_symlink() or packet not in path.resolve().parents or not path.is_file():
            raise TransferError('packet selection must be regular files inside --packet')
        files[name] = path.read_bytes()
    with tempfile.TemporaryDirectory(prefix='cloud-evidence-publish-') as temp:
        git(temp, 'init', '--bare', '--quiet')
        prior = output(temp, 'ls-remote', '--refs', remote, ref)
        parents = []
        if prior:
            git(temp, 'fetch', '--quiet', '--no-tags', remote, ref)
            parents = ['-p', output(temp, 'rev-parse', 'FETCH_HEAD')]
        git(temp, 'read-tree', '--empty')
        rows = []
        for name, data in sorted(files.items()):
            blob = output(temp, 'hash-object', '-w', '--stdin', data=data)
            git(temp, 'update-index', '--add', '--cacheinfo', '100644', blob, 'files/' + name)
            rows.append(dict(path=name, bytes=len(data), sha256=digest(data), blob=blob))
        manifest = dict(schema=1, repository=repository, tag=tag, ref=ref,
                        product_branch=product_branch, product_head=product_head, files=rows)
        data = (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode()
        blob = output(temp, 'hash-object', '-w', '--stdin', data=data)
        git(temp, 'update-index', '--add', '--cacheinfo', '100644', blob, 'evidence.json')
        tree = output(temp, 'write-tree')
        head = output(temp, 'commit-tree', tree, *parents,
                      data=('Reports for ' + tag + ' [skip ci]\n').encode())
        # Required complete candidate audit, including every evidence side parent.
        # Import only the existing main tip from the admitted local clone as the exclusion anchor.
        anchor=output(repo,'rev-parse','refs/remotes/origin/main')
        raw_anchor=git(repo,'cat-file','commit',anchor).stdout
        if output(temp,'hash-object','-t','commit','-w','--stdin',data=raw_anchor)!=anchor:
            raise TransferError('main exclusion anchor identity mismatch')
        git(temp,'update-ref','refs/remotes/origin/main',anchor)
        (Path(temp)/'shallow').write_text(anchor+'\n')
        git(temp,'update-ref','HEAD',head)
        audit=output(temp,'log','origin/main..HEAD','--format=%an <%ae>%n%cn <%ce>%n%(trailers:only,unfold)')
        candidate_ids=output(temp,'rev-list','origin/main..HEAD').splitlines()
        for candidate in candidate_ids:
            fields=output(temp,'show','-s','--format=%an%x00%ae%x00%cn%x00%ce',candidate).split('\0')
            if fields!=['Run Edit Run fleet','fleet@runeditrun.com','Run Edit Run fleet','fleet@runeditrun.com']:
                raise TransferError('candidate identity audit failed')
            message=output(temp,'show','-s','--format=%B',candidate)
            if re.search(r'(?im)^\s*co-authored-by:.*(?:codex|openai)',message):
                raise TransferError('forbidden Codex/OpenAI co-author')
        # Evidence messages produced by this entrypoint have no trailers; audit all prior evidence too.
        trailers=output(temp,'log','origin/main..HEAD','--format=%(trailers:only,unfold)')
        for address in re.findall(r'<([^<>]+)>',trailers):
            if address.lower() not in ('fleet@runeditrun.com','noreply@anthropic.com','noreply@openai.com'):
                raise TransferError('candidate trailer address audit failed')
        print('EVIDENCE_IDENTITY_AUDIT fleet author/committer; complete history; no forbidden co-author',flush=True)
        git(temp, 'push', '--porcelain', remote, head + ':' + ref)
    return dict(repository=repository, ref=ref, head=head, files=rows)


def fetch(root, repository, tag, *, remote=None, expected_head=None):
    """Fetch one exact ref into isolated Git storage and restore without replacing bytes."""
    ref = identity(repository, tag)
    row = dict(repository=repository, ref=ref, status='failed')
    try:
        if expected_head and not re.fullmatch(r'[0-9a-f]{40}', expected_head):
            raise TransferError('invalid reported evidence head')
        remote = remote_for(repository, remote)
        lane = Path(root) / 'work' / tag
        lane.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.evidence-fetch-', dir=lane) as temp:
            git(temp, 'init', '--bare', '--quiet')
            advertised = output(temp, 'ls-remote', '--refs', remote, ref)
            if not advertised:
                return dict(row, status='missing', reason='evidence ref absent')
            git(temp, 'fetch', '--quiet', '--no-tags', remote, ref)
            head = output(temp, 'rev-parse', 'FETCH_HEAD')
            row['head'] = head
            if expected_head and head != expected_head:
                raise TransferError('fetched evidence head differs from terminal report')
            raw = git(temp, 'show', head + ':evidence.json').stdout
            manifest = json.loads(raw)
            if (manifest.get('schema') != 1 or manifest.get('repository') != repository
                    or manifest.get('tag') != tag or manifest.get('ref') != ref
                    or not re.fullmatch(r'[0-9a-f]{40}', manifest.get('product_head', ''))):
                raise TransferError('evidence manifest identity mismatch')
            files, seen = {}, set()
            for item in manifest['files']:
                name = str(file_name(item['path']))
                if name in seen:
                    raise TransferError('duplicate packet filename')
                seen.add(name)
                data = git(temp, 'show', head + ':files/' + name).stdout
                blob = output(temp, 'rev-parse', head + ':files/' + name)
                if len(data) != item['bytes'] or digest(data) != item['sha256'] or blob != item['blob']:
                    raise TransferError('packet file identity mismatch')
                files['files/' + name] = data
            tree = git(temp, 'ls-tree', '-r', '-z', head).stdout.split(b'\0')
            entries = [entry.split(b'\t', 1) for entry in tree if entry]
            if (not files or {p.decode() for _, p in entries} != {'evidence.json', *files}
                    or any(not mode.startswith(b'100644 blob ') for mode, _ in entries)):
                raise TransferError('evidence tree contains unmanifested or non-regular files')
            files['evidence.json'] = raw
            destination = lane / 'reports' / repository
            row.update(destination=str(destination), manifest_sha256=digest(raw), files=manifest['files'],
                       product_head=manifest['product_head'], product_branch=manifest['product_branch'])
            if any(p.is_symlink() for p in (lane, lane / 'reports', destination.parent)):
                raise TransferError('destination parent is a symlink')
            destination.parent.mkdir(parents=True, exist_ok=True)
            import fcntl
            with (destination.parent / (destination.name + '.evidence.lock')).open('a') as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                if destination.exists() or destination.is_symlink():
                    actual = {str(p.relative_to(destination)): p for p in destination.rglob('*') if p.is_file()}
                    if (destination.is_symlink() or any(p.is_symlink() for p in destination.rglob('*'))
                            or set(actual) != set(files)
                            or any(actual[n].read_bytes() != data for n, data in files.items())):
                        return dict(row, status='collision', reason='existing destination preserved')
                    return dict(row, status='present')
                restored = Path(temp) / 'restored'
                restored.mkdir()
                for name, data in files.items():
                    target = restored / name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(data)
                restored.rename(destination)
            return dict(row, status='restored')
    except (OSError, ValueError, KeyError, TypeError) as error:
        reason = str(error) if isinstance(error, TransferError) else 'invalid packet or local I/O failure'
        return dict(row, reason=reason)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('publish', 'fetch'))
    parser.add_argument('--repository', required=True)
    parser.add_argument('--tag', required=True)
    parser.add_argument('--repo', type=Path)
    parser.add_argument('--packet', type=Path)
    parser.add_argument('--file', action='append', default=[])
    parser.add_argument('--root', type=Path)
    parser.add_argument('--remote')
    parser.add_argument('--head')
    args = parser.parse_args()
    try:
        if args.action == 'publish':
            if not args.repo or not args.packet:
                parser.error('publish needs --repo and --packet')
            row = publish(args.repo, args.repository, args.tag, args.packet, args.file)
            print('EVIDENCE repo={repository} ref={ref} head={head}'.format(**row))
        else:
            if not args.root:
                parser.error('fetch needs --root')
            row = fetch(args.root, args.repository, args.tag, remote=args.remote, expected_head=args.head)
        print(json.dumps(row, sort_keys=True))
        return 0 if row.get('status', 'published') in ('published', 'restored', 'present') else 1
    except (OSError, ValueError) as error:
        print('EVIDENCE_FAILED ' + (str(error) if isinstance(error, TransferError) else 'local I/O failure'))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
