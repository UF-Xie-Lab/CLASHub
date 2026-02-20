#!/bin/bash
#SBATCH --mail-type=ALL
#SBATCH --mail-user=luli1@ufl.edu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=12
#SBATCH --mem=60gb
#SBATCH --qos=mingyi.xie-b
#SBATCH --time=48:00:00
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log
cd $OUTPUT_DIR

###########################################
# Auto-detect DEV / PROD environment
###########################################
PROD_ROOT="/pubapps/mingyi.xie/clashhub/prod"

if [ "$RNA_ENV" = "dev" ]; then
    CODE_ROOT="/pubapps/mingyi.xie/clashhub/dev"
else
    CODE_ROOT="$PROD_ROOT"
fi

PHP_ROOT="$CODE_ROOT/app/php"
GENOME_DB_ROOT="$PROD_ROOT/app/RNAseqGenomeDB"
BASE_DIR="$CODE_ROOT"

echo "Running in environment: $RNA_ENV"
echo "Using BASE_DIR = $BASE_DIR"
echo "Using PHP_ROOT = $PHP_ROOT"
echo "Using GENOME_DB_ROOT = $GENOME_DB_ROOT"

pwd; hostname; date

# =========================================================
# 1. 严格检查 LIBRARY_TYPE 参数
#    必须显式传入 "stranded" 或 "unstranded"，否则报错退出
# =========================================================
if [ -z "$LIBRARY_TYPE" ]; then
    echo "Error: LIBRARY_TYPE is missing or empty!"
    echo "Please ensure the PHP script passes 'stranded' or 'unstranded'."
    exit 1  
fi

case "$LIBRARY_TYPE" in
    "stranded")
        echo "Configuring analysis for STRANDED library..."
        HISAT2_STRANDNESS="--rna-strandness RF"
        STRINGTIE_STRANDNESS="--rf"
        EISA_MODE="stranded"  # EISA 使用 stranded GTF
        ;;
        
    "unstranded")
        echo "Configuring analysis for UNSTRANDED library..."
        HISAT2_STRANDNESS=""
        STRINGTIE_STRANDNESS=""
        EISA_MODE="unstranded" # EISA 使用 unstranded GTF
        ;;
        
    *)
        echo "Error: Invalid LIBRARY_TYPE received: '$LIBRARY_TYPE'"
        echo "Allowed values are: 'stranded' or 'unstranded'"
        exit 1 
        ;;
esac

PERFORM_EISA=${PERFORM_EISA:-no}

# =========================================================
# 2. 根据 SPECIES 和 EISA_MODE 定义 GTF
# =========================================================
case $SPECIES in
    Human)
        STANDARD_GTF="$GENOME_DB_ROOT/Hisat2_Hg38/Homo_sapiens.GRCh38.112.chr.gtf"
        HISAT2_INDEX="$GENOME_DB_ROOT/Hisat2_Hg38/hg38"
        RSEQC_BED="$GENOME_DB_ROOT/Hisat2_Hg38/Homo_sapiens.GRCh38.112.bed"

        # 动态路径: ${EISA_MODE} 会自动变为 "stranded" 或 "unstranded"
        EISA_EXON_GTF="$GENOME_DB_ROOT/Hisat2_Hg38/Human_eisa_${EISA_MODE}_exon.gtf"
        EISA_INTRON_GTF="$GENOME_DB_ROOT/Hisat2_Hg38/Human_eisa_${EISA_MODE}_intron.gtf"
        ;;
    Mouse)
        STANDARD_GTF="$GENOME_DB_ROOT/Hisat2_Mouse/Mus_musculus.GRCm39.112.chr.gtf"
        HISAT2_INDEX="$GENOME_DB_ROOT/Hisat2_Mouse/mouse"
        RSEQC_BED="$GENOME_DB_ROOT/Hisat2_Mouse/Mus_musculus.GRCm39.112.bed"
        
        EISA_EXON_GTF="$GENOME_DB_ROOT/Hisat2_Mouse/Mouse_eisa_${EISA_MODE}_exon.gtf"
        EISA_INTRON_GTF="$GENOME_DB_ROOT/Hisat2_Mouse/Mouse_eisa_${EISA_MODE}_intron.gtf"
        ;;
    Drosophila)
        STANDARD_GTF="$GENOME_DB_ROOT/Hisat2_Drosophila2/Drosophila_melanogaster.BDGP6.46.112.gtf"
        HISAT2_INDEX="$GENOME_DB_ROOT/Hisat2_Drosophila2/drosphila"
        RSEQC_BED="$GENOME_DB_ROOT/Hisat2_Drosophila2/Drosophila_melanogaster.BDGP6.46.112.bed"
        
        EISA_EXON_GTF="$GENOME_DB_ROOT/Hisat2_Drosophila2/Fly_eisa_${EISA_MODE}_exon.gtf"
        EISA_INTRON_GTF="$GENOME_DB_ROOT/Hisat2_Drosophila2/Fly_eisa_${EISA_MODE}_intron.gtf"
        ;;
    C.elegans)
        STANDARD_GTF="$GENOME_DB_ROOT/Hisat2_Celegans/Caenorhabditis_elegans.WBcel235.112.gtf"
        HISAT2_INDEX="$GENOME_DB_ROOT/Hisat2_Celegans/Celegans"
        RSEQC_BED="$GENOME_DB_ROOT/Hisat2_Celegans/Caenorhabditis_elegans.WBcel235.112.bed"
        
        EISA_EXON_GTF="$GENOME_DB_ROOT/Hisat2_Celegans/Worm_eisa_${EISA_MODE}_exon.gtf"
        EISA_INTRON_GTF="$GENOME_DB_ROOT/Hisat2_Celegans/Worm_eisa_${EISA_MODE}_intron.gtf"
        ;;
esac


echo "Environment Variables:"
printenv

echo "RNA_ENV: $RNA_ENV"
echo "sbatch RNAseq Species: $SPECIES"
echo "sbatch RNAseq email: $EMAIL"
echo "sbatch Job ID: $jobID"
echo "sbatch RNAseq OUTPUT_DIR: $OUTPUT_DIR"
echo "sbatch RNAseq Analysis Type: $ANALYSIS_TYPE"
echo "sbatch RNAseq Control Sample Count: $CONTROL_SAMPLE_COUNT"
echo "sbatch RNAseq Treatment Sample Count: $TREATMENT_SAMPLE_COUNT"

echo "sbatch RNAseq Library Type: $LIBRARY_TYPE"
echo "sbatch RNAseq Perform EISA: $PERFORM_EISA"

# Prepare arguments for BeforeAnalysisSendEmail.py
declare -a PYTHON_ARGS=(
    "--email" "$EMAIL"
    "--jobID" "$jobID"
    "--species" "$SPECIES"
)


if [ "$ANALYSIS_TYPE" == "TPM" ]; then
    PYTHON_ARGS+=("--sample_count" "$SAMPLE_COUNT")

    # Add sample information for each TPM sample
    for i in $(seq 1 $SAMPLE_COUNT); do
        INPUT_FILE1_VAR="INPUT_FILE1_$i"
        INPUT_FILE2_VAR="INPUT_FILE2_$i"
        OUTPUT_FILE_VAR="OUTPUT_FILE_$i"
        FIVE_PRIME_ADAPTER_VAR="FIVE_PRIME_ADAPTER_$i"
        THREE_PRIME_ADAPTER_VAR="THREE_PRIME_ADAPTER_$i"

        INPUT_FILE1=${!INPUT_FILE1_VAR}
        INPUT_FILE2=${!INPUT_FILE2_VAR}
        OUTPUT_FILE=${!OUTPUT_FILE_VAR}
        FIVE_PRIME_ADAPTER=${!FIVE_PRIME_ADAPTER_VAR}
        THREE_PRIME_ADAPTER=${!THREE_PRIME_ADAPTER_VAR}

        PYTHON_ARGS+=("--sample_info" "Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER; Lib: $LIBRARY_TYPE; EISA: $PERFORM_EISA")
    done

elif [ "$ANALYSIS_TYPE" == "TPM_DESeq2" ]; then
    # Set the sample count as the sum of control and treatment samples
    PYTHON_ARGS+=("--sample_count" "$((CONTROL_SAMPLE_COUNT + TREATMENT_SAMPLE_COUNT))")

    # Add control sample information
    for i in $(seq 1 $CONTROL_SAMPLE_COUNT); do
        INPUT_FILE1_VAR="INPUT_FILE1_$i"
        INPUT_FILE2_VAR="INPUT_FILE2_$i"
        OUTPUT_FILE_VAR="OUTPUT_FILE_$i"
        FIVE_PRIME_ADAPTER_VAR="FIVE_PRIME_ADAPTER_$i"
        THREE_PRIME_ADAPTER_VAR="THREE_PRIME_ADAPTER_$i"

        INPUT_FILE1=${!INPUT_FILE1_VAR}
        INPUT_FILE2=${!INPUT_FILE2_VAR}
        OUTPUT_FILE=${!OUTPUT_FILE_VAR}
        FIVE_PRIME_ADAPTER=${!FIVE_PRIME_ADAPTER_VAR}
        THREE_PRIME_ADAPTER=${!THREE_PRIME_ADAPTER_VAR}

        PYTHON_ARGS+=("--sample_info" "Control Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER; Lib: $LIBRARY_TYPE; EISA: $PERFORM_EISA")
    done

    for i in $(seq 1 $TREATMENT_SAMPLE_COUNT); do
        SAMPLE_INDEX=$((i + CONTROL_SAMPLE_COUNT))
        INPUT_FILE1_VAR="INPUT_FILE1_$SAMPLE_INDEX"
        INPUT_FILE2_VAR="INPUT_FILE2_$SAMPLE_INDEX"
        OUTPUT_FILE_VAR="OUTPUT_FILE_$SAMPLE_INDEX"
        FIVE_PRIME_ADAPTER_VAR="FIVE_PRIME_ADAPTER_$SAMPLE_INDEX"
        THREE_PRIME_ADAPTER_VAR="THREE_PRIME_ADAPTER_$SAMPLE_INDEX"

        INPUT_FILE1=${!INPUT_FILE1_VAR}
        INPUT_FILE2=${!INPUT_FILE2_VAR}
        OUTPUT_FILE=${!OUTPUT_FILE_VAR}
        FIVE_PRIME_ADAPTER=${!FIVE_PRIME_ADAPTER_VAR}
        THREE_PRIME_ADAPTER=${!THREE_PRIME_ADAPTER_VAR}

        PYTHON_ARGS+=("--sample_info" "Treatment Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER; Lib: $LIBRARY_TYPE; EISA: $PERFORM_EISA")
    done
fi

# Call BeforeAnalysisSendEmail.py with the arguments using PHP_ROOT
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 \
"$PHP_ROOT/PyScript/BeforeAnalysisSendEmail.py" \
"${PYTHON_ARGS[@]}"

# =================================================================
#  Process Sample Function (Updated with Auto-Repair)
# =================================================================
process_sample() {
    local i=$1
    local prefix=$2

    INPUT_FILE1_VAR="INPUT_FILE1_$i"
    INPUT_FILE2_VAR="INPUT_FILE2_$i"
    OUTPUT_FILE_VAR="OUTPUT_FILE_$i"
    FIVE_PRIME_ADAPTER_VAR="FIVE_PRIME_ADAPTER_$i"
    THREE_PRIME_ADAPTER_VAR="THREE_PRIME_ADAPTER_$i"

    # 获取原始输入文件路径 (Raw/Broken Inputs)
    RAW_INPUT1=${!INPUT_FILE1_VAR} 
    RAW_INPUT2=${!INPUT_FILE2_VAR}
    
    OUTPUT_FILE=${!OUTPUT_FILE_VAR}
    FIVE_PRIME_ADAPTER=${!FIVE_PRIME_ADAPTER_VAR}
    THREE_PRIME_ADAPTER=${!THREE_PRIME_ADAPTER_VAR}

    # =========================================================
    # [NEW STEP] 0. 自动修复 Paired-End Reads (repair.sh)
    # =========================================================
    echo ">> [Auto-Repair] Checking and repairing reads for Sample $i..."
    
    # 定义修复后的临时文件名
    FIXED_INPUT1="${OUTPUT_FILE}_fixed_R1.fastq.gz"
    FIXED_INPUT2="${OUTPUT_FILE}_fixed_R2.fastq.gz"
    SINGLETONS="${OUTPUT_FILE}_singletons.fastq.gz"

    # 调用 repair.sh 进行修复 (使用你的 CutAdapter1 环境路径)
    # 这样只限于这一行命令能找到 Java，不会污染后续环境
    PATH=/pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin:$PATH \
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/repair.sh \
        in1="$RAW_INPUT1" in2="$RAW_INPUT2" \
        out1="$FIXED_INPUT1" out2="$FIXED_INPUT2" \
        outs="$SINGLETONS" repair=t

    # 立即删除不需要的 singletons 文件
    if [ -f "$SINGLETONS" ]; then rm "$SINGLETONS"; fi

    # 【关键】将流程后续步骤的输入变量指向“修复后”的文件
    INPUT_FILE1="$FIXED_INPUT1"
    INPUT_FILE2="$FIXED_INPUT2"
    # =========================================================

    # 打印调试信息
    echo "sbatch ${prefix}_INPUT_FILE1_$i=${RAW_INPUT1}"
    echo "sbatch ${prefix}_INPUT_FILE2_$i=${RAW_INPUT2}"
    echo "sbatch ${prefix}_OUTPUT_FILE_$i=${OUTPUT_FILE}"
    echo "sbatch ${prefix}_FIVE_PRIME_ADAPTER_$i=${FIVE_PRIME_ADAPTER}"
    echo "sbatch ${prefix}_THREE_PRIME_ADAPTER_$i=${THREE_PRIME_ADAPTER}"

    # =========================================================
    # 构建 Cutadapt 的 UMI 剪切参数
    # =========================================================
    CUTADAPT_UMI_ARGS=""
    
    # 5' 端剪切 (Positive value for -u/-U)
    if [ -n "$UMI_LEN_5" ] && [ "$UMI_LEN_5" -gt 0 ]; then
        echo "Adding 5' UMI clipping: ${UMI_LEN_5}bp"
        CUTADAPT_UMI_ARGS="$CUTADAPT_UMI_ARGS -u $UMI_LEN_5 -U $UMI_LEN_5"
    fi
    
    # 3' 端剪切 (Negative value for -u/-U)
    if [ -n "$UMI_LEN_3" ] && [ "$UMI_LEN_3" -gt 0 ]; then
        echo "Adding 3' UMI clipping: ${UMI_LEN_3}bp"
        # 注意：cutadapt中负数表示切3'端
        CUTADAPT_UMI_ARGS="$CUTADAPT_UMI_ARGS -u -$UMI_LEN_3 -U -$UMI_LEN_3"
    fi

    # 1. cutadapt (现在使用的是 INPUT_FILE1/2 即修复后的文件)
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -a TTTTTTTTTTTTTTT -a AAAAAAAAAAAAAAA -a $THREE_PRIME_ADAPTER \
    -A $FIVE_PRIME_ADAPTER \
    $CUTADAPT_UMI_ARGS \
    -q 20 \
    --trim-n \
    --max-n 0 \
    -o "${OUTPUT_FILE}_R1.cut.fastq.gz" \
    -p "${OUTPUT_FILE}_R2.cut.fastq.gz" \
    $INPUT_FILE1 $INPUT_FILE2 \
    --minimum-length 24 -j 12

    # 2. hisat2 
    echo "Running HISAT2 for $SPECIES..."
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/hisat2 $HISAT2_STRANDNESS -x "$HISAT2_INDEX" -1 "${OUTPUT_FILE}_R1.cut.fastq.gz" -2 "${OUTPUT_FILE}_R2.cut.fastq.gz" -S "${OUTPUT_FILE}.sam" -p 12

    # Optimize storage: Delete trimmed FASTQ files immediately after alignment
    if [ -f "${OUTPUT_FILE}_R1.cut.fastq.gz" ]; then
        rm "${OUTPUT_FILE}_R1.cut.fastq.gz" "${OUTPUT_FILE}_R2.cut.fastq.gz"
        echo "Deleted trimmed FASTQ files."
    fi

    # 3. Sort
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/samtools sort "${OUTPUT_FILE}.sam" -@ 12 -o "${OUTPUT_FILE}.sortBypos.bam" -O BAM 
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/samtools index -@ 12 "${OUTPUT_FILE}.sortBypos.bam" 
    rm "${OUTPUT_FILE}.sam" 

    # ================= RSeQC Analysis Step =================
    echo ">> Running RSeQC read_distribution for Quality Check..."
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/read_distribution.py -i "${OUTPUT_FILE}.sortBypos.bam" -r "$RSEQC_BED" > "${OUTPUT_FILE}.read_distribution.txt"

    # 4. Standard TPM Calculation (Standard GTF)
    echo "Running Standard StringTie..."
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G "$STANDARD_GTF" -p 12 -eB $STRINGTIE_STRANDNESS -A "${OUTPUT_FILE}.sortBypos.table" -o "${OUTPUT_FILE}.sortBypos.gtf"
    echo -e "${OUTPUT_FILE}  ${OUTPUT_FILE}.sortBypos.gtf " >> sample_list.txt 

    if [[ $prefix == *"control"* ]]; then
        echo -e "${OUTPUT_FILE},control" >> coldata_SampleName.csv 
    elif [[ $prefix == *"treatment"* ]]; then
        echo -e "${OUTPUT_FILE},treatment" >> coldata_SampleName.csv 
    else
        echo -e "${OUTPUT_FILE},TPM" >> coldata_SampleName.csv 
    fi

    # 5. EISA Analysis (Conditional)
    if [ "$PERFORM_EISA" == "yes" ]; then
        echo ">> Performing EISA analysis..."
        # 5.1 EISA Exon Abundance (使用 EISA_EXON_GTF)
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G "$EISA_EXON_GTF" -p 12  -e  $STRINGTIE_STRANDNESS  -o "${OUTPUT_FILE}_EISA_exon.gtf"
        
        echo "${OUTPUT_FILE} ${OUTPUT_FILE}_EISA_exon.gtf" >> sample_list_eisa_exon.txt

        # 5.2 EISA Intron Abundance (使用 EISA_INTRON_GTF)
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G "$EISA_INTRON_GTF" -p 12 -e $STRINGTIE_STRANDNESS -o "${OUTPUT_FILE}_EISA_intron.gtf"
            
        echo "${OUTPUT_FILE} ${OUTPUT_FILE}_EISA_intron.gtf" >> sample_list_eisa_intron.txt
    fi
   
    # =========================================================
    # Cleanup Logic (Refined)
    # =========================================================

    # 1. 删除修复过程中产生的临时“好”文件 (已用完)
    if [ -f "$FIXED_INPUT1" ]; then rm "$FIXED_INPUT1"; fi
    if [ -f "$FIXED_INPUT2" ]; then rm "$FIXED_INPUT2"; fi

    # 2. 删除最原始的“坏”文件 (节省空间，按原逻辑删除)
    if [ -f "$RAW_INPUT1" ]; then
        echo "Deleting Raw Input: $RAW_INPUT1"
        rm "$RAW_INPUT1" 
    else
        echo "File $RAW_INPUT1 does not exist or has already been deleted."
    fi

    if [ -f "$RAW_INPUT2" ]; then
        echo "Deleting Raw Input: $RAW_INPUT2"
        rm "$RAW_INPUT2" 
    else
        echo "File $RAW_INPUT2 does not exist or has already been deleted."
    fi

    # 3. 双重检查删除 Cutadapt 可能残留的中间文件
    if [ -f "${OUTPUT_FILE}_R1.cut.fastq.gz" ]; then rm "${OUTPUT_FILE}_R1.cut.fastq.gz"; fi
    if [ -f "${OUTPUT_FILE}_R2.cut.fastq.gz" ]; then rm "${OUTPUT_FILE}_R2.cut.fastq.gz"; fi

}


# =================================================
#  MAIN EXECUTION
# =================================================

if [ "$ANALYSIS_TYPE" == "TPM" ]; then

    echo "sample,condition" > coldata_SampleName.csv

    for i in $(seq 1 $SAMPLE_COUNT); do
        process_sample $i "RNAseq"
    done

    echo "TPM merge"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" rnaseqTPM_merge -j $jobID -s $SPECIES

    echo "Count calculation (TPM mode)"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list.txt -l 150 -g gene_count.csv

    if [ "$PERFORM_EISA" == "yes" ]; then
        echo "Calculating EISA Counts..."
        /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list_eisa_exon.txt -l 150 -g gene_count_eisa_exon.csv
        /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list_eisa_intron.txt -l 150 -g gene_count_eisa_intron.csv
    fi

    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" reorder_geneCountFileColumn  

    echo "Create report TPM"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" GeneTPM_data_report -j $jobID
    
    echo "Send GeneTPM result from email"
    EISA_FILES=""
    if [ "$PERFORM_EISA" == "yes" ]; then
        EISA_FILES="gene_count_eisa_exon_matrix.csv gene_count_eisa_intron_matrix.csv"
    fi
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/sendEmail.py" "GeneTPM" $EISA_FILES $EMAIL $jobID $RNA_ENV
 
elif [ "$ANALYSIS_TYPE" == "TPM_DESeq2" ]; then

    echo -e "sample,condition" > coldata_SampleName.csv 

    # 处理控制样品
    for i in $(seq 1 $CONTROL_SAMPLE_COUNT); do
        process_sample $i "RNAseq_control"
    done
    # 处理处理样品
    for i in $(seq 1 $TREATMENT_SAMPLE_COUNT); do
        process_sample $((i + CONTROL_SAMPLE_COUNT)) "RNAseq_treatment"
    done

    echo "Generating TPM table for annotation..."
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" rnaseqTPM_merge -j $jobID -s $SPECIES

    echo "count calculation"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list.txt -l 150 -g gene_count.csv

    # 【新增】EISA prepDE for DESeq2 mode
    if [ "$PERFORM_EISA" == "yes" ]; then
        echo "Calculating EISA Counts..."
        /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list_eisa_exon.txt -l 150 -g gene_count_eisa_exon.csv
        /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/prepDE.py3" -i sample_list_eisa_intron.txt -l 150 -g gene_count_eisa_intron.csv
    fi

    # 使用geneID作为index，然后做差异基因分析
    echo "Deseq2 by R"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" reorder_geneCountFileColumn
    
    # rm gene_count.csv  # 删除没有order column的 gene count csv文件
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/Rscript "$PHP_ROOT/PyScript/analysis.R" "$OUTPUT_DIR"

    echo "Create DESEQ report"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" Deseq2_data_report -j $jobID

    echo "Send Deseq2 result from email"

    EISA_FILES=""
    if [ "$PERFORM_EISA" == "yes" ]; then
        EISA_FILES="EISA_analysis_results.csv gene_count_eisa_exon_matrix.csv gene_count_eisa_intron_matrix.csv"
    fi

    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/sendEmail.py" "Deseq2" $EISA_FILES $EMAIL $jobID $RNA_ENV

fi

echo "RNA-Seq done"
rm *.ctab *.gtf
rm *.bam  *.bam.bai
rm transcript_count_matrix.csv  
rm *.table
date