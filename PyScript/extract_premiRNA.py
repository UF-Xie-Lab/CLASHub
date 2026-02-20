import sys
import os

# --- Configuration Constants ---
# Any sequence longer than this is likely a primary transcript (pri-miRNA), not a hairpin.
# Setting this to 500bp safely excludes the 1700bp+ WormBase 'gene' entries.
MAX_PRE_MIRNA_LENGTH = 500 

# Any sequence shorter than this is likely a mature miRNA, not a hairpin.
MIN_SEQUENCE_LENGTH = 40

def get_reverse_complement(seq):
    """
    Returns the reverse complement of a DNA sequence.
    """
    complement = {'A': 'T', 'C': 'G', 'G': 'C', 'T': 'A', 'N': 'N', 
                  'a': 'T', 'c': 'G', 'g': 'C', 't': 'A', 'n': 'N'}
    return "".join(complement.get(base, base) for base in reversed(seq))

def read_genome(fasta_path):
    """
    Reads the genome FASTA file into a dictionary.
    Keys are chromosome names (e.g., '1', 'X', 'chr1').
    """
    print(f"Loading genome from {fasta_path}...")
    genome = {}
    current_chrom = None
    seq_parts = []
    
    try:
        with open(fasta_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                if line.startswith(">"):
                    # Save the previous chromosome if it exists
                    if current_chrom:
                        genome[current_chrom] = "".join(seq_parts)
                    
                    # Parse chromosome name. 
                    # We take the first word after '>' to match the GTF's first column.
                    current_chrom = line[1:].split()[0]
                    seq_parts = []
                else:
                    seq_parts.append(line)
            
            # Save the last chromosome
            if current_chrom:
                genome[current_chrom] = "".join(seq_parts)
                
    except FileNotFoundError:
        print(f"Error: Genome file not found at {fasta_path}")
        sys.exit(1)
        
    print("Genome loaded successfully.")
    return genome

def extract_best_miRNA(genome, gtf_path, output_path):
    """
    Scans the GTF file and extracts the best pre-miRNA candidate for each gene.
    Uses a scoring system to resolve conflicts between 'gene' and 'transcript' entries.
    """
    print(f"Scanning GTF {gtf_path} for best miRNA candidates...")
    
    # Dictionary structure: { gene_id: { 'score': int, 'info': (chrom, start, end, strand, name) } }
    candidates = {}
    
    try:
        with open(gtf_path, 'r') as gtf:
            for line in gtf:
                if line.startswith("#"):
                    continue
                
                parts = line.strip().split('\t')
                # A valid GTF line must have 9 columns
                if len(parts) < 9:
                    continue
                
                chrom = parts[0]
                feature = parts[2]       # e.g., gene, transcript
                start = int(parts[3]) - 1 # Convert 1-based GTF to 0-based Python
                end = int(parts[4])
                strand = parts[6]
                attr = parts[8]
                seq_len = end - start
                
                # Extract gene_id
                if 'gene_id "' not in attr:
                    continue
                gene_id = attr.split('gene_id "')[1].split('"')[0]
                
                # Extract gene_name (optional, falls back to ID if missing)
                gene_name = gene_id
                if 'gene_name "' in attr:
                    gene_name = attr.split('gene_name "')[1].split('"')[0]

                # --- Scoring Logic ---
                current_score = 0
                
                # 1. Explicitly ignore "primary_transcript"
                # This removes the long 1700bp entries in WormBase
                if "miRNA_primary_transcript" in attr:
                    continue

                # 2. Rule A (Gold Standard): transcript type is "pre_miRNA"
                # This is the most accurate tag in FlyBase and WormBase.
                if feature == "transcript" and 'transcript_biotype "pre_miRNA"' in attr:
                    current_score = 10
                
                # 3. Rule B (Silver Standard): gene type is "miRNA"
                # This is standard for Ensembl (Human/Mouse).
                # CRITICAL: We check length <= 500 to filter out WormBase's long 'gene' entries.
                elif feature == "gene" and 'gene_biotype "miRNA"' in attr:
                    if seq_len <= MAX_PRE_MIRNA_LENGTH:
                        current_score = 5
                    else:
                        # Too long, likely a primary transcript, skip it.
                        continue
                
                # 4. Rule C (Bronze Standard): transcript type is "miRNA"
                # Some databases might label it this way.
                # Must filter out short mature miRNAs (approx 22bp).
                elif feature == "transcript" and 'transcript_biotype "miRNA"' in attr:
                    if seq_len >= MIN_SEQUENCE_LENGTH and seq_len <= MAX_PRE_MIRNA_LENGTH:
                        current_score = 1
                    else:
                        continue

                # --- Update Candidate ---
                # If we found a valid entry (score > 0), check if it's the best one so far for this gene_id
                if current_score > 0:
                    if gene_id not in candidates or current_score > candidates[gene_id]['score']:
                        candidates[gene_id] = {
                            'score': current_score,
                            'info': (chrom, start, end, strand, gene_name)
                        }

        # --- Write Output ---
        print(f"Processing {len(candidates)} unique miRNA genes...")
        with open(output_path, 'w') as out:
            count = 0
            for gid, data in candidates.items():
                c, s, e, strand, name = data['info']
                
                # Check if chromosome exists in the loaded genome
                if c in genome:
                    seq = genome[c][s:e]
                    
                    # Handle reverse complement for negative strand
                    if strand == "-":
                        seq = get_reverse_complement(seq)
                    
                    # Convert to uppercase
                    seq = seq.upper()
                    
                    # Final safety check on length
                    if len(seq) < MIN_SEQUENCE_LENGTH:
                        continue

                    # Write FASTA format
                    # Format: >GeneName|GeneID|Chr:Start-End(Strand)
                    # Note: Output coordinates are 1-based (s+1) to match standard biology notation
                    header = f">{name}|{gid}|{c}:{s+1}-{e}({strand})"
                    out.write(f"{header}\n{seq}\n")
                    count += 1
                else:
                    # Optional: Print warning for missing chromosomes
                    # print(f"Warning: Chromosome {c} not found in genome.")
                    pass
                    
        print(f"Done! Written {count} sequences to {output_path}")

    except FileNotFoundError:
        print(f"Error: GTF file not found.")
        sys.exit(1)

if __name__ == "__main__":
    # Argument validation
    if len(sys.argv) != 4:
        print("Usage: python3 extract_miRNA_universal.py <genome_fasta> <gtf_file> <output_fasta>")
        sys.exit(1)
    
    genome_file = sys.argv[1]
    gtf_file = sys.argv[2]
    output_file = sys.argv[3]
    
    # Run the extraction
    loaded_genome = read_genome(genome_file)
    extract_best_miRNA(loaded_genome, gtf_file, output_file)
