import re, sys

def check(path):
    raw = open(path, encoding='utf-8').read()
    lines = raw.split('\n')

    # YAML front matter removal (first --- ... ---)
    # find first two '---' lines
    yaml_end = None
    count = 0
    for i,l in enumerate(lines):
        if l.strip() == '---':
            count += 1
            if count == 2:
                yaml_end = i
                break
    body_lines = lines[yaml_end+1:]

    # de-tag char count: remove HTML tags <...> and container delimiter lines (exactly ':::' or start with ':::')
    detag_chars = 0
    for l in body_lines:
        if l.strip() == ':::' or l.strip().startswith(':::'):
            continue
        # remove html tags
        s = re.sub(r'<[^>]+>', '', l)
        detag_chars += len(s)

    h2 = sum(1 for l in body_lines if re.match(r'^## ', l))
    tables = sum(1 for l in body_lines if re.match(r'^\|[\s\-:]+\|', l) or re.match(r'^\| *[-: ]+\|', l))
    # count table headers: lines like | --- | --- |
    table_sep = sum(1 for l in body_lines if re.match(r'^\|[\s:\-|]+\|$', l) and set(l.replace('|','').replace(' ','')) <= set('-:'))

    cases = sum(1 for l in body_lines if l.strip().startswith(':::case '))
    refs_entries = sum(1 for l in body_lines if re.match(r'^\[REF-', l.strip()))
    inline_refs = len(re.findall(r'\[REF-\d+\]', raw))

    # check ::: open/close pairing
    opens = sum(1 for l in body_lines if l.strip().startswith(':::') and l.strip() != ':::')
    closes = sum(1 for l in body_lines if l.strip() == ':::')

    print(f"== {path} ==")
    print(f"去标签字符数: {detag_chars}")
    print(f"h2 (## ) 数量: {h2}")
    print(f"表格分隔行(table sep)数量: {table_sep}")
    print(f":::case 数量: {cases}")
    print(f"refs 条目数: {refs_entries}")
    print(f"内联 [REF-x] 总数: {inline_refs}")
    print(f"::: 开: {opens}  闭: {closes}  (应相等)")
    print()

for p in sys.argv[1:]:
    check(p)
