import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogue = JSON.parse(fs.readFileSync(path.join(root, '_PROJECT/lectures.json'), 'utf8'));
const expected = new Set(['pikov.expert', ...[...catalogue.lectures, ...(catalogue.additionalSites ?? [])].map(x => `${x.domain}.pikov.expert`)]);
// Owner-requested retirement and an empty directory absent from the hosting panel.
const retired = new Set(['comindware.pikov.expert', '27-07-2027.pikov.expert']);
const ssh = process.env.PIKOV_SSH_EXECUTABLE || (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/ssh.exe' : 'ssh');
const alias = process.env.PIKOV_SSH_ALIAS || 'pikov-hosting';
const script = `import os,json,re
home=os.path.expanduser('~')
sites=[]
for name in sorted(os.listdir(home)):
 if not re.match(r'^(?:[a-z0-9-]+\\.)?pikov\\.expert$',name): continue
 root=os.path.join(home,name,'www')
 if not os.path.isdir(root): continue
 sites.append({'domain':name,'index':os.path.isfile(os.path.join(root,'index.html')),'symlink':os.path.islink(root)})
print(json.dumps(sites))
`;
const result = spawnSync(ssh, [alias, 'python3', '-'], { input: script, encoding:'utf8', windowsHide:true, timeout:45000 });
if (result.status !== 0) throw new Error(`Hosting inventory failed: ${result.error?.message ?? result.stderr}`);
const actual = JSON.parse(result.stdout);
const actualNames = new Set(actual.map(x => x.domain));
const issues = [
  ...[...expected].filter(x => !actualNames.has(x)).map(domain => ({domain, issue:'missing webroot'})),
  ...actual.filter(x => !expected.has(x.domain) && !retired.has(x.domain)).map(x => ({domain:x.domain, issue:'unmanaged webroot'})),
  ...actual.filter(x => expected.has(x.domain) && (!x.index || x.symlink)).map(x => ({domain:x.domain, issue:x.symlink ? 'unexpected symlink' : 'missing entry page'})),
];
console.log(JSON.stringify({expected:expected.size, actual:actual.length, retired:actual.filter(x=>retired.has(x.domain)).map(x=>x.domain),issues},null,2));
if (issues.length) process.exitCode = 1;
