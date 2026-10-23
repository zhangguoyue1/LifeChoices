import re, sys

def breakdown(path):
    raw = open(path, encoding='utf-8').read()
    lines = raw.split('\n')
    yaml_end=None; c=0
    for i,l in enumerate(lines):
        if l.strip()=='---':
            c+=1
            if c==2: yaml_end=i; break
    body=lines[yaml_end+1:]
    # split into sections by ## heading
    sec={}; cur=None; buf=[]
    for l in body:
        if re.match(r'^## ', l):
            if cur: sec[cur]='\n'.join(buf)
            cur=l; buf=[]
        else:
            buf.append(l)
    if cur: sec[cur]='\n'.join(buf)
    def detag(s):
        return len(re.sub(r'<[^>]+>','',s))
    total=0
    for k,v in sec.items():
        d=detag(v)
        total+=d
        print(f"{d:6d}  {k[:30]}")
    print(f"{total:6d}  TOTAL (body, excl yaml)")
    # refs + meta separately
    refs=sum(detag(l) for l in body if re.match(r'^\[REF-',l.strip()))
    meta=sum(detag(l) for l in body if l.strip().startswith(':::meta'))
    print(f"{refs:6d}  refs block")
    print(f"{meta:6d}  meta block")
    print(f"{total+refs+meta:6d}  GRAND (incl refs+meta)")

for p in sys.argv[1:]:
    print("==",p,"==")
    breakdown(p); print()
