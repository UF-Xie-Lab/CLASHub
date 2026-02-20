import sys

def gtf_to_bed12(gtf_file, bed_file):
    transcripts = {}
    
    print(f"Reading GTF: {gtf_file}...")
    with open(gtf_file, 'r') as f:
        for line in f:
            if line.startswith('#'): continue
            parts = line.strip().split('\t')
            if len(parts) < 9: continue
            if parts[2] != 'exon': continue # 只看 exon 行
            
            chrom = parts[0]
            start = int(parts[3]) - 1 # GTF is 1-based, BED is 0-based
            end = int(parts[4])
            strand = parts[6]
            
            # 提取 transcript_id
            attr_parts = parts[8].split(';')
            tid = None
            for attr in attr_parts:
                attr = attr.strip()
                if attr.startswith('transcript_id'):
                    tid = attr.split('"')[1]
                    break
            
            if not tid: continue
            
            if tid not in transcripts:
                transcripts[tid] = {
                    'chrom': chrom,
                    'strand': strand,
                    'exons': []
                }
            transcripts[tid]['exons'].append((start, end))

    print(f"Writing BED12: {bed_file}...")
    with open(bed_file, 'w') as out:
        for tid, data in transcripts.items():
            exons = sorted(data['exons'], key=lambda x: x[0])
            
            chrom = data['chrom']
            tx_start = exons[0][0]
            tx_end = exons[-1][1]
            name = tid
            score = 0
            strand = data['strand']
            thick_start = tx_start # 对QC来说，CDS位置不重要，设为与TX一致即可
            thick_end = tx_end
            rgb = "0,0,0"
            block_count = len(exons)
            
            block_sizes = []
            block_starts = []
            
            for ex in exons:
                block_sizes.append(str(ex[1] - ex[0]))
                block_starts.append(str(ex[0] - tx_start))
                
            out.write(f"{chrom}\t{tx_start}\t{tx_end}\t{name}\t{score}\t{strand}\t"
                      f"{thick_start}\t{thick_end}\t{rgb}\t{block_count}\t"
                      f"{','.join(block_sizes)}\t{','.join(block_starts)}\n")
    print("Done!")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python gtf2bed.py <input.gtf> <output.bed>")
    else:
        gtf_to_bed12(sys.argv[1], sys.argv[2])