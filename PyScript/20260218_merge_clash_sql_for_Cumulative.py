import os
import glob
import csv
import pandas as pd
from datetime import datetime
import re
os.chdir("/Applications/XAMPP/xamppfiles/htdocs/CLASHub_database_part/app/sql")

def extract_seed(seq_str):
    """
    Extracts the 7nt seed sequence (positions 2-8) from the 5p-3p miRNA sequence.
    Removes alignment gaps and converts DNA to RNA formatting (T -> U).
    """
    if pd.isna(seq_str) or seq_str == "NA":
        return "UNKNOWN"

    clean_seq = str(seq_str).replace('-', '').replace('T', 'U')
    # Extract characters at index 1 through 7 (which is positions 2-8)
    if len(clean_seq) >= 8:
        return clean_seq[1:8]
    return clean_seq


def main():
    # Find all the Combined_CLASH CSV files we generated in the previous step
    csv_files = glob.glob("Combined_CLASH_*_hybrids.csv")
    print(f"Found {len(csv_files)} combined CSV files. Starting summary generation...\n")

    today_str = datetime.today().strftime('%Y%m%d')
    for file_path in csv_files:
        filename = os.path.basename(file_path)
        # Extract species from filename (e.g., "Combined_CLASH_human_hybrids.csv" -> "human")
        species = filename.replace("Combined_CLASH_", "").replace("_hybrids.csv", "")

        print(f"Processing {species}...")

        # Read the CSV
        df = pd.read_csv(file_path, dtype=str)

        total_targets = {}
        conserved_targets = {}
        seeds = {}

        # Iterate through the rows to group genes and apply rules
        for index, row in df.iterrows():
            mirna = str(row['miRNA_name']).strip()
            gene = str(row['gene_name']).strip()

            # Initialize dictionaries for new miRNAs
            if mirna not in total_targets:
                total_targets[mirna] = set()
                conserved_targets[mirna] = set()
                # Grab the seed from the first instance we see
                seeds[mirna] = extract_seed(row['miRNA_seq_5p_3p'])

            # 1. Add to Total Targets
            total_targets[mirna].add(gene)

            # 2. Check Conserved Target Rules
            is_conserved = False
            try:
                samples_detected = int(row['total_samples_detected'])
                cons_score = float(row['conservation_score'])
                gene_type = str(row['gene_type'])
                site_type = str(row['site_type'])

                # Apply the 4 conditions:
                if samples_detected >= 2 or species in ["Drosophila", "Celegans"]:
                    if "mRNA" in gene_type or "ncRNA" in gene_type:
                        if cons_score >= 0:
                            if "7mer" in site_type or "8mer" in site_type:
                                is_conserved = True
            except ValueError:
                # If conservation_score or samples is "NA" or missing, skip the conserved check
                pass

            if is_conserved:
                conserved_targets[mirna].add(gene)

        # Prepare the output data
        output_data = []
        for mirna in sorted(total_targets.keys()):
            # Sort the genes alphabetically for clean output
            cons_genes_list = sorted(list(conserved_targets[mirna]))
            total_genes_list = sorted(list(total_targets[mirna]))

            row_dict = {
                'miRNA_family': mirna,
                'miRNA_seed': seeds[mirna],
                'CLASH_conserved_targets': ";".join(cons_genes_list) if cons_genes_list else "None",
                'CLASH_total_targets': ";".join(total_genes_list) if total_genes_list else "None",
                'num_CLASH_conserved_targets': len(cons_genes_list),
                'num_CLASH_total_targets': len(total_genes_list)
            }
            output_data.append(row_dict)

        # Create output DataFrame
        out_df = pd.DataFrame(output_data)

        # Export to tab-separated TXT file
        out_filename = f"{today_str}_{species.capitalize()}_Targets_From_CLASH.txt"
        out_df.to_csv(out_filename, sep='\t', index=False)

        print(f" -> Generated: {out_filename} ({len(out_df)} miRNAs mapped)")

    print("\nAll summary files generated successfully!")


if __name__ == "__main__":
    main()