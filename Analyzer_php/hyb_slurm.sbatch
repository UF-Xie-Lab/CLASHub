#!/bin/bash
#SBATCH --mail-type=ALL
#SBATCH --mail-user=luli1@ufl.edu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=12
#SBATCH --mem=60gb
#SBATCH --qos=mingyi.xie-b
#SBATCH --time=24:00:00
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log
 
pwd; hostname; date

###########################################
# Auto-detect DEV / PROD environment
###########################################
# PROD_ROOT is always fixed for heavy assets (Software, DBs, Conda)
PROD_ROOT="/pubapps/mingyi.xie/clashhub/prod"

if [[ "$OUTPUT_DIR" == *"/clashhub/dev/"* ]]; then
    ENVIRONMENT="dev"
    # For Git code (PHP/Python scripts), use the DEV path
    CODE_ROOT="/pubapps/mingyi.xie/clashhub/dev"
else
    ENVIRONMENT="prod"
    # For Git code (PHP/Python scripts), use the PROD path
    CODE_ROOT="$PROD_ROOT"
fi

# Dynamic Path (Changes based on dev/prod)
PHP_ROOT="$CODE_ROOT/app/php"

# Static Paths (Always use PROD)
SOFTWARE_ROOT="$PROD_ROOT/software"
LOG_ROOT="$PROD_ROOT/slurmlogs"
TRANSCRIPT_DB_ROOT="$PROD_ROOT/app/Transcript_DB"
MIRNA_DB_ROOT="$PROD_ROOT/app/MiRNA_database"
GENOME_DB_ROOT="$PROD_ROOT/app/RNAseqGenomeDB"

echo "[ENV DETECTED] ENVIRONMENT = $ENVIRONMENT"
echo "[ENV DETECTED] ROOT = $CODE_ROOT"
echo "[ENV DETECTED] PHP_ROOT = $PHP_ROOT"

cd "$OUTPUT_DIR"
export TMPDIR="$OUTPUT_DIR"
echo "[FIX] Temporarily setting TMPDIR to $TMPDIR to avoid sort failure on large files."


###########################################
# Debug prints
###########################################
echo "sbatch hyb upload_type: $UPLOAD_TYPE"
echo "sbatch hyb Output file: $OUTPUT_FILE"
echo "sbatch hyb Species: $SPECIES"
echo "sbatch hyb email: $EMAIL"
echo "sbatch hyb OUTPUT_DIR: $OUTPUT_DIR"
echo "sbatch hyb jobID ${jobID}"
echo "sbatch Five Prime Adapter: $FIVE_PRIME_ADAPTER"
echo "sbatch Three Prime Adapter: $THREE_PRIME_ADAPTER"

OUTPUT_FILE_BASENAME=$(basename "$OUTPUT_FILE")
echo "sbatch OUTPUT basename: $OUTPUT_FILE_BASENAME"

###########################################
# 1. Pre-analysis email
###########################################
declare -a PYTHON_ARGS=(
    "--email" "$EMAIL"
    "--jobID" "$jobID"
    "--species" "$SPECIES"
    "--sample_count" "1"
)

if [ "$UPLOAD_TYPE" = "fastq" ]; then
    PYTHON_ARGS+=("--sample_info" "FASTQ files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); 5'=${FIVE_PRIME_ADAPTER} 3'=${THREE_PRIME_ADAPTER}")
else
    PYTHON_ARGS+=("--sample_info" "FASTA file: $(basename "$INPUT_FILE")")
fi

# Uses PHP_ROOT (Dynamic) for the script
/pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/BeforeAnalysisSendEmail.py" "${PYTHON_ARGS[@]}"

###########################################
# 2. FASTQ MODE
###########################################
if [ "$UPLOAD_TYPE" = "fastq" ]; then
    echo "sbatch FASTQ mode"
    echo "sbatch UMI5: $UMI5"
    echo "sbatch UMI3: $UMI3"

    # Step 1: Adapter trimming
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt \
        -a "$THREE_PRIME_ADAPTER" \
        -A "$FIVE_PRIME_ADAPTER" \
        -o "${OUTPUT_FILE}_R1.cut.fastq.gz" \
        -p "${OUTPUT_FILE}_R2.cut.fastq.gz" \
        "$INPUT_FILE1" "$INPUT_FILE2" \
        --minimum-length 24 -j 12

    pigz -d -p 12 "${OUTPUT_FILE}_R1.cut.fastq.gz"
    pigz -d -p 12 "${OUTPUT_FILE}_R2.cut.fastq.gz"

    # Step 2: PEAR merge
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/pear \
        -f "${OUTPUT_FILE}_R1.cut.fastq" \
        -r "${OUTPUT_FILE}_R2.cut.fastq" \
        -o "$OUTPUT_FILE" -n 44 -j 12

    # Step 3: Collapse + UMI trimming (only if UMI exists)
    if [ "$UMI5" -gt 0 ] || [ "$UMI3" -gt 0 ]; then
        echo "UMI detected (5'=${UMI5}, 3'=${UMI3}). Collapsing then trimming UMI."
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/fastx_collapser \
            -i "${OUTPUT_FILE}.assembled.fastq" \
            > "${OUTPUT_FILE}.collapsed.fasta"

        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt \
            -u ${UMI5} -u -${UMI3} \
            -o "${OUTPUT_FILE}.fasta" \
            "${OUTPUT_FILE}.collapsed.fasta" \
            -m 36 -j 12
    else
        echo "No UMI (both 0). Skipping collapse and UMI trimming."
        # First filter by length, keep as FASTQ
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt \
            -o "${OUTPUT_FILE}.filtered.fastq" \
            "${OUTPUT_FILE}.assembled.fastq" \
            -m 36 -j 12
            
        # Then explicitly convert the filtered FASTQ to FASTA format
        awk 'NR%4==1{print ">" substr($0,2)} NR%4==2{print}' "${OUTPUT_FILE}.filtered.fastq" > "${OUTPUT_FILE}.fasta"
    fi
fi


###########################################
# 3. FASTA MODE
###########################################
if [ "$UPLOAD_TYPE" = "fasta" ]; then
    echo "sbatch Input fasta: $INPUT_FILE"
    pigz -d -p 12 "$INPUT_FILE"
    INPUT_FILE="${INPUT_FILE%.gz}"
    echo "Total reads in the raw FASTA file is $(($(wc -l < $INPUT_FILE) / 2))"
    
    echo "Filtering reads shorter than 36nt..."
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -m 36 -j 12 -o "${OUTPUT_FILE}.fasta" "$INPUT_FILE"

fi


###########################################
# 4. HYB analysis by species
###########################################
echo "sbatch start HYB pipeline for species: $SPECIES"

# Uses SOFTWARE_ROOT (Static Prod), TRANSCRIPT_DB_ROOT (Static Prod), MIRNA_DB_ROOT (Static Prod)
# Uses PHP_ROOT (Dynamic) for CLASHub.py
case $SPECIES in
    Human)
        DATABASE=martquery_0228172604_181_human_unique1_add18S28S_filtered
        bash "$SOFTWARE_ROOT/hyb-master/bin/hyb_analysis_pubapp.sh" "$OUTPUT_FILE_BASENAME" "$DATABASE"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.hyb "${OUTPUT_FILE_BASENAME}.hyb"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.viennad "${OUTPUT_FILE_BASENAME}.viennad"
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" \
            Viennad_to_Table \
            -t "$SOFTWARE_ROOT/hyb-master/data/db/martquery_0228172604_181_human_unique1_add18S28S_filtered.fasta" \
            -c "$TRANSCRIPT_DB_ROOT/human_transcripts_CS_20220422.txt" \
            -i "$OUTPUT_FILE_BASENAME" \
            -n "$TRANSCRIPT_DB_ROOT/martquery_0228172604_181_name.txt" \
            -p "$MIRNA_DB_ROOT/hsa_pre.fas"
        ;;
    Mouse)
        DATABASE=martquery_0530193902_838_mm39_unique_add18S28S_filtered
        bash "$SOFTWARE_ROOT/hyb-master/bin/hyb_analysis_pubapp.sh" "$OUTPUT_FILE_BASENAME" "$DATABASE"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.hyb "${OUTPUT_FILE_BASENAME}.hyb"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.viennad "${OUTPUT_FILE_BASENAME}.viennad"
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" \
            Viennad_to_Table \
            -t "$SOFTWARE_ROOT/hyb-master/data/db/martquery_0530193902_838_mm39_unique_add18S28S_filtered.fasta" \
            -c "$TRANSCRIPT_DB_ROOT/20230606_Exp320_mouse_transcript_CS.txt" \
            -i "$OUTPUT_FILE_BASENAME" \
            -n "$TRANSCRIPT_DB_ROOT/martquery_0530193902_838_mm39_name.txt" \
            -p "$MIRNA_DB_ROOT/mmu_pre.fas" 
        ;;
    Drosophila)
        DATABASE=20220221_dm6_unique
        bash "$SOFTWARE_ROOT/hyb-master/bin/hyb_analysis_pubapp.sh" "$OUTPUT_FILE_BASENAME" "$DATABASE"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.hyb "${OUTPUT_FILE_BASENAME}.hyb"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.viennad "${OUTPUT_FILE_BASENAME}.viennad"
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" \
            Viennad_to_Table \
            -t "$SOFTWARE_ROOT/hyb-master/data/db/20220221_dm6_unique.fasta" \
            -c "$TRANSCRIPT_DB_ROOT/20220223_dm6_all_conservation_score2.txt" \
            -i "$OUTPUT_FILE_BASENAME" \
            -n "$TRANSCRIPT_DB_ROOT/martquery_1109155317_9_name.txt" \
            -p "$MIRNA_DB_ROOT/dme_pre.fas"
        ;;
    C.elegans)
        DATABASE=20230616martquery_0613142828_717_WBcel235_unique_filtered
        bash "$SOFTWARE_ROOT/hyb-master/bin/hyb_analysis_pubapp.sh" "$OUTPUT_FILE_BASENAME" "$DATABASE"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.hyb "${OUTPUT_FILE_BASENAME}.hyb"
        mv "${OUTPUT_FILE_BASENAME}"_comp_*_hybrids_ua.viennad "${OUTPUT_FILE_BASENAME}.viennad"
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" \
            Viennad_to_Table \
            -t "$SOFTWARE_ROOT/hyb-master/data/db/20230616martquery_0613142828_717_WBcel235_unique_filtered.fasta" \
            -c "$TRANSCRIPT_DB_ROOT/20230618_Exp325_Celegans_CS.txt" \
            -i "$OUTPUT_FILE_BASENAME" \
            -n "$TRANSCRIPT_DB_ROOT/EXP325_20230618_C.elegans_name.txt" \
            -p "$MIRNA_DB_ROOT/Cel_pre.fas"
        ;;
esac


###########################################
# 5. genome mapping analysis by species
###########################################
echo "[GENOME] Start genome mapping for species: $SPECIES"

# Uses GENOME_DB_ROOT (Static Prod)
case $SPECIES in
    Human)
        GENOME_INDEX="$GENOME_DB_ROOT/Hisat2_Hg38/hg38"
        CHROM_SIZES="$GENOME_DB_ROOT/Hisat2_Hg38/hg38.chrom.sizes"
        ;;
    Mouse)
        GENOME_INDEX="$GENOME_DB_ROOT/Hisat2_Mouse/mouse"
        CHROM_SIZES="$GENOME_DB_ROOT/Hisat2_Mouse/mm39.chrom.sizes"
        ;;
    Drosophila)
        GENOME_INDEX="$GENOME_DB_ROOT/Hisat2_Drosophila2/drosphila"
        CHROM_SIZES="$GENOME_DB_ROOT/Hisat2_Drosophila2/dm6.chrom.sizes"
        ;;
    C.elegans)
        GENOME_INDEX="$GENOME_DB_ROOT/Hisat2_Celegans/Celegans"
        CHROM_SIZES="$GENOME_DB_ROOT/Hisat2_Celegans/ce11.chrom.sizes"
        ;;
    *)
        echo "[GENOME] Unknown species, skip genome mapping"
        GENOME_INDEX=""
        CHROM_SIZES=""
        ;;
esac

if [ -n "$GENOME_INDEX" ] && [ -f "${OUTPUT_FILE}.fasta" ]; then
    echo "[GENOME] Hisat2 index = $GENOME_INDEX"

    # ==========================================================
    # NEW: Check Read Count & Downsample if > 20M
    # ==========================================================
    # 20 million reads = 40 million lines (2 lines per read in FASTA)
    MAX_READS=20000000
    MAX_LINES=$((MAX_READS * 2))
    
    CURRENT_LINES=$(wc -l < "${OUTPUT_FILE}.fasta")
    CURRENT_READS=$((CURRENT_LINES / 2))
    
    # Define which file needs to be mapped
    MAPPING_INPUT="${OUTPUT_FILE}.fasta"
    
    if [ "$CURRENT_READS" -gt "$MAX_READS" ]; then
        echo "[GENOME] WARNING: Input has $CURRENT_READS reads, exceeding limit of $MAX_READS."
        echo "[GENOME] Downsampling to top 20M reads to prevent OOM..."
        
        # Take the top 20M reads (40M lines) into a new file
        head -n "$MAX_LINES" "${OUTPUT_FILE}.fasta" > "${OUTPUT_FILE}.20M.fasta"
        
        # Update the variable to point to the downsampled file
        MAPPING_INPUT="${OUTPUT_FILE}.20M.fasta"
        
        echo "[GENOME] Downsampling complete. New input: $MAPPING_INPUT"
    else
        echo "[GENOME] Read count ($CURRENT_READS) is within safe limits."
    fi
    # ==========================================================

    echo "[GENOME] Mapping $MAPPING_INPUT"

    # 1. FASTA → SAM
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/hisat2 -x "$GENOME_INDEX" -f "$MAPPING_INPUT" --very-sensitive -p 12 -S "${OUTPUT_FILE}.genome.sam"

    # 2. SAM → BAM
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/samtools view -bS "${OUTPUT_FILE}.genome.sam" -@ 12 > "${OUTPUT_FILE}.genome.bam"

    # 3. Sort BAM
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/samtools sort -o "${OUTPUT_FILE}.genome.sorted.bam" "${OUTPUT_FILE}.genome.bam" -@ 12

    # 4. BAM → BED (split to avoid filling introns)
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/bedtools bamtobed -split -i "${OUTPUT_FILE}.genome.sorted.bam" > "${OUTPUT_FILE}.genome.split.bed"

    # 5. BED → bigWig
    echo "[GENOME] Using chrom.sizes = $CHROM_SIZES"
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/bedtools genomecov -bg -i "${OUTPUT_FILE}.genome.split.bed" -g "$CHROM_SIZES" > "${OUTPUT_FILE}.genome.split.bedgraph"
    echo "[GENOME] bigWig file generated (splice-aware): ${OUTPUT_FILE}.genome.bw"
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/bedGraphToBigWig "${OUTPUT_FILE}.genome.split.bedgraph" "$CHROM_SIZES" "${OUTPUT_FILE}.genome.bw"

    # 6. Peak calling - Software uses PROD_ROOT path explicitly
    "$PROD_ROOT/software/piranha/bin/Piranha" -s -b 50 -p 0.05 -a 0.9 -o "${OUTPUT_FILE}_Piranha_Peak.bed" "${OUTPUT_FILE}.genome.split.bed" # i found the low abundance is 5 reads

    echo "[GENOME] Genome mapping + peak calling complete"
else
    echo "[GENOME] No FASTA file or index missing — skip genome mapping."
fi

###########################################
# 6. Generate final CLASH csv with piranha peal file
###########################################
echo "Merge CLASH table with Piranha peak file"
# Uses PHP_ROOT (Dynamic)
/pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" CLASH_csv_merged_Piranha -i "${OUTPUT_FILE}_FinalResult.csv" -b "${OUTPUT_FILE}_Piranha_Peak.bed"

###########################################
# 7. Generate HTML report
###########################################
echo "HTML report start"
# Uses PHP_ROOT (Dynamic)
/pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" CLASH_data_report -j "$jobID" -o "$OUTPUT_FILE"

###########################################
# 8. Send finishing email
###########################################
# Uses PHP_ROOT (Dynamic)
/pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/python3 \
    "$PHP_ROOT/PyScript/sendEmail.py" \
    "${OUTPUT_FILE}" \
    "$EMAIL" \
    "$jobID" \
    "$ENVIRONMENT"

## environment is needed

###########################################
# 9. Move log file to correct location & verify
###########################################
LOG_FILE="${jobID}.log"
TARGET_LOG="$LOG_ROOT/${jobID}.log"

echo "[LOG] Current log file: $LOG_FILE"
echo "[LOG] Target log directory: $LOG_ROOT"

###########################################
# 10. Clean intermediate files
###########################################

echo "========================================================"
echo "[DEBUG] File sizes before cleanup (Sorted small -> LARGE):"
ls -lSrh 
echo "--------------------------------------------------------"
echo "Total directory usage:"
du -sh .
echo "========================================================"

rm -f  *fastq  *gz   *blast  *tab  *ref  *vienna  *dg.hyb  *merged.hyb   *hybrids.hyb  *txt    *fasta  *sam  *bedgraph  *bam  *bed  *FinalResult.csv
rm  *hyb  *viennad
echo "HYB analysis done."