"""
merge_CLASH_human.py - Fixed version 3

Key fix: VALUES block extends to the LAST semicolon in the file,
not the first one (non-greedy was cutting off most rows).
"""

import os, re, csv, io
import pandas as pd
from glob import glob
os.chdir("/Applications/XAMPP/xamppfiles/htdocs/CLASHub_database_part/app/sql")
SHARED_COLS = [
    'miRNA_name', 'miRNA_seq_5p_3p', 'pairing_pattern', 'target_seq_3p_5p',
    'conservation_score', 'gene_name', 'free_energy', 'gene_type',
    'gene_id', 'chr_genome_position', 'site_type', 'target_site_region',
]

def parse_sql_file(filepath, cell_line_name):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()

    # Get INSERT column list
    insert_header = re.search(
        r'INSERT INTO\s+[`]?[\w]+[`]?\s*\(([^)]+)\)\s*VALUES',
        content, re.IGNORECASE
    )
    if not insert_header:
        print(f"  [WARN] No INSERT statement found in {os.path.basename(filepath)}")
        return None

    insert_cols = [c.strip().strip('`') for c in insert_header.group(1).split(',')]

    # Find where VALUES starts, then take EVERYTHING after it to end of file
    # Use greedy match (.* not .*?) so we get ALL rows, not just up to first semicolon
    values_start = re.search(
        r'INSERT INTO\s+[`]?[\w]+[`]?\s*\([^)]+\)\s*VALUES\s*',
        content, re.IGNORECASE
    )
    if not values_start:
        print(f"  [WARN] Could not find VALUES in {os.path.basename(filepath)}")
        return None

    # Slice from after VALUES keyword to end of file, then strip trailing semicolon
    values_block = content[values_start.end():].rstrip().rstrip(';')

    # State-machine extraction of (...) tuples — robust against commas inside strings
    rows = []
    i = 0
    n = len(values_block)
    while i < n:
        if values_block[i] == '(':
            depth, start = 0, i
            in_string = False
            string_char = None
            while i < n:
                c = values_block[i]
                if in_string:
                    if c == '\\':
                        i += 1  # skip escaped char
                    elif c == string_char:
                        in_string = False
                elif c in ("'", '"'):
                    in_string = True
                    string_char = c
                elif c == '(':
                    depth += 1
                elif c == ')':
                    depth -= 1
                    if depth == 0:
                        break
                i += 1

            raw = values_block[start+1:i]
            try:
                parsed = next(csv.reader(io.StringIO(raw), skipinitialspace=True))
                cleaned = []
                for v in parsed:
                    v = v.strip()
                    if (v.startswith("'") and v.endswith("'")) or \
                       (v.startswith('"') and v.endswith('"')):
                        v = v[1:-1].replace("\\'", "'")
                    elif v.upper() == 'NULL':
                        v = None
                    cleaned.append(v)
                if len(cleaned) == len(insert_cols):
                    rows.append(dict(zip(insert_cols, cleaned)))
            except Exception:
                pass
        i += 1

    if not rows:
        print(f"  [WARN] No rows parsed from {os.path.basename(filepath)}")
        return None

    df = pd.DataFrame(rows)
    df['cell_line'] = cell_line_name
    available = [c for c in SHARED_COLS if c in df.columns]
    return df[available + ['cell_line']]


def main():
    sql_files = sorted(glob('CLASH_human_*.sql'))
    print(f"Found {len(sql_files)} SQL files.\n")

    all_dfs = []
    for fp in sql_files:
        base = os.path.basename(fp)
        cell_name = re.sub(r'^CLASH_human_', '', base)
        cell_name = re.sub(r'(_Expanded)?\.sql$', '', cell_name)
        print(f"  Parsing: {base}  →  {cell_name}")
        df = parse_sql_file(fp, cell_name)
        if df is not None:
            print(f"           Rows loaded: {len(df):,}")
            all_dfs.append(df)

    combined = pd.concat(all_dfs, ignore_index=True)
    print(f"\nTotal rows across all files: {len(combined):,}")

    available_shared = [c for c in SHARED_COLS if c in combined.columns]
    agg = (
        combined
        .groupby(available_shared, dropna=False)['cell_line']
        .agg(
            total_cell_line_detected='count',
            cell_lines_name=lambda x: ';'.join(sorted(x.unique()))
        )
        .reset_index()
        .sort_values('total_cell_line_detected', ascending=False)
    )

    agg.to_csv('CLASH_human_merged_Claude.csv', index=False)
    print(f"\nSaved: CLASH_human_merged.csv")
    print(f"Unique hybrids: {len(agg):,}")
    print(f"\nTop 5 rows preview:")
    print(agg.head().to_string())

if __name__ == '__main__':
    main()