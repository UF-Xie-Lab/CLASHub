#!/bin/bash
#SBATCH --mail-type=ALL          # Mail events (NONE, BEGIN, END, FAIL, ALL)
#SBATCH --mail-user=luli1@ufl.edu     # Where to send mail    
#SBATCH --ntasks=12                   # Run with 12 CPUs
#SBATCH --mem=60gb                    # Job memory request
#SBATCH --qos=mingyi.xie-b
#SBATCH --time=48:00:00               # Time limit hrs:min:sec
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log   # Standard output and error log

cd $OUTPUT_DIR
pwd; hostname; date

# 打印所有环境变量以进行调试
echo "Environment Variables:"
printenv

# 使用通过 `--export` 传递给该脚本的环境变量
echo "sbatch RNAseq Species: $SPECIES"
echo "sbatch RNAseq email: $EMAIL"
echo "sbatch Job ID: $jobID"
echo "sbatch RNAseq OUTPUT_DIR: $OUTPUT_DIR"
echo "sbatch RNAseq Analysis Type: $ANALYSIS_TYPE"
echo "sbatch RNAseq Control Sample Count: $CONTROL_SAMPLE_COUNT"
echo "sbatch RNAseq Treatment Sample Count: $TREATMENT_SAMPLE_COUNT"

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

        # Include adapter sequences in sample_info
        PYTHON_ARGS+=("--sample_info" "Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER")
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

        # Include adapter sequences in sample_info
        PYTHON_ARGS+=("--sample_info" "Control Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER")
    done

    # Add treatment sample information
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

        # Include adapter sequences in sample_info
        PYTHON_ARGS+=("--sample_info" "Treatment Sample $i: Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Output file: $(basename "${OUTPUT_FILE}.fasta"); 5' Adapter: $FIVE_PRIME_ADAPTER; 3' Adapter: $THREE_PRIME_ADAPTER")
    done
fi

# Call BeforeAnalysisSendEmail.py with the arguments
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 \
/pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/BeforeAnalysisSendEmail.py \
"${PYTHON_ARGS[@]}"

process_sample() {
    local i=$1
    local prefix=$2

    INPUT_FILE1_VAR="INPUT_FILE1_$i"
    INPUT_FILE2_VAR="INPUT_FILE2_$i"
    OUTPUT_FILE_VAR="OUTPUT_FILE_$i"
    FIVE_PRIME_ADAPTER_VAR="FIVE_PRIME_ADAPTER_$i"
    THREE_PRIME_ADAPTER_VAR="THREE_PRIME_ADAPTER_$i"

    INPUT_FILE1=${!INPUT_FILE1_VAR} # 获取 INPUT_FILE1_VAR 变量的实际值
    INPUT_FILE2=${!INPUT_FILE2_VAR}
    OUTPUT_FILE=${!OUTPUT_FILE_VAR}
    FIVE_PRIME_ADAPTER=${!FIVE_PRIME_ADAPTER_VAR}
    THREE_PRIME_ADAPTER=${!THREE_PRIME_ADAPTER_VAR}

    # 打印变量名称和值以进行调试
    echo "sbatch ${prefix}_INPUT_FILE1_$i=${INPUT_FILE1}"
    echo "sbatch ${prefix}_INPUT_FILE2_$i=${INPUT_FILE2}"
    echo "sbatch ${prefix}_OUTPUT_FILE_$i=${OUTPUT_FILE}"
    echo "sbatch ${prefix}_FIVE_PRIME_ADAPTER_$i=${FIVE_PRIME_ADAPTER}"
    echo "sbatch ${prefix}_THREE_PRIME_ADAPTER_$i=${THREE_PRIME_ADAPTER}"

    # cutadapt
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -a $THREE_PRIME_ADAPTER -A $FIVE_PRIME_ADAPTER \
    -o "${OUTPUT_FILE}_R1.cut.fastq.gz" \
    -p "${OUTPUT_FILE}_R2.cut.fastq.gz" \
    $INPUT_FILE1 $INPUT_FILE2 --minimum-length 24 -j 12 # 运行 cutadapt 以裁剪适配器

    case $SPECIES in
    Human)
        echo "Running HISAT2 for Human..."
        ~/miniconda3/envs/CutAdapter1/bin/hisat2 -x /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Hg38/hg38 -1 "${OUTPUT_FILE}_R1.cut.fastq.gz" -2 "${OUTPUT_FILE}_R2.cut.fastq.gz" -S "${OUTPUT_FILE}.sam" -p 12
        ;;
    Mouse)
        echo "Running HISAT2 for Mouse..."
        ~/miniconda3/envs/CutAdapter1/bin/hisat2 -x /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Mouse/mouse -1 "${OUTPUT_FILE}_R1.cut.fastq.gz" -2 "${OUTPUT_FILE}_R2.cut.fastq.gz" -S "${OUTPUT_FILE}.sam" -p 12
        ;;
    D.melanogaster)
        echo "Running HISAT2 for D.melanogaster..."
        ~/miniconda3/envs/CutAdapter1/bin/hisat2 -x /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Drosophila2/drosphila -1 "${OUTPUT_FILE}_R1.cut.fastq.gz" -2 "${OUTPUT_FILE}_R2.cut.fastq.gz" -S "${OUTPUT_FILE}.sam" -p 12
        ;;
    C.elegans)
        echo "Running HISAT2 for C.elegans..."
        ~/miniconda3/envs/CutAdapter1/bin/hisat2 -x /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Celegans/Celegans -1 "${OUTPUT_FILE}_R1.cut.fastq.gz" -2 "${OUTPUT_FILE}_R2.cut.fastq.gz" -S "${OUTPUT_FILE}.sam" -p 12
        ;;
    esac # 运行 hisat2 以进行比对


    # 检查文件是否存在并打印文件信息
    if [ -f "$INPUT_FILE1" ]; then
        echo "Deleting $INPUT_FILE1"
        rm $INPUT_FILE1 # 删除输入文件1
    else
        echo "File $INPUT_FILE1 does not exist or has already been deleted."
    fi

    if [ -f "$INPUT_FILE2" ]; then
        echo "Deleting $INPUT_FILE2"
        rm $INPUT_FILE2 # 删除输入文件2
    else
        echo "File $INPUT_FILE2 does not exist or has already been deleted."
    fi

    if [ -f "${OUTPUT_FILE}_R1.cut.fastq.gz" ]; then
        echo "Deleting ${OUTPUT_FILE}_R1.cut.fastq.gz"
        rm "${OUTPUT_FILE}_R1.cut.fastq.gz" # 删除裁剪后的输出文件1
    else
        echo "File ${OUTPUT_FILE}_R1.cut.fastq.gz does not exist or has already been deleted."
    fi

    if [ -f "${OUTPUT_FILE}_R2.cut.fastq.gz" ]; then
        echo "Deleting ${OUTPUT_FILE}_R2.cut.fastq.gz"
        rm "${OUTPUT_FILE}_R2.cut.fastq.gz" # 删除裁剪后的输出文件2
    else
        echo "File ${OUTPUT_FILE}_R2.cut.fastq.gz does not exist or has already been deleted."
    fi

    # Sort
    ~/miniconda3/envs/CutAdapter1/bin/samtools sort "${OUTPUT_FILE}.sam" -@ 12 -o "${OUTPUT_FILE}.sortBypos.bam" -O BAM # 排序 BAM 文件
    ~/miniconda3/envs/CutAdapter1/bin/samtools index -@ 12 "${OUTPUT_FILE}.sortBypos.bam" # 生成 BAM 索引文件（.bai）
    rm "${OUTPUT_FILE}.sam" # 删除中间 SAM 文件

    # TPM 计算
    case $SPECIES in
        Human)
            ~/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Hg38/Homo_sapiens.GRCh38.112.chr.gtf -p 12 -eB -A "${OUTPUT_FILE}.sortBypos.table" -o "${OUTPUT_FILE}.sortBypos.gtf"
            ;;
        Mouse)
            ~/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Mouse/Mus_musculus.GRCm39.112.chr.gtf -p 12 -eB -A "${OUTPUT_FILE}.sortBypos.table" -o "${OUTPUT_FILE}.sortBypos.gtf"
            ;;
        D.melanogaster)
            ~/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Drosophila2/Drosophila_melanogaster.BDGP6.46.112.gtf -p 12 -eB -A "${OUTPUT_FILE}.sortBypos.table" -o "${OUTPUT_FILE}.sortBypos.gtf"
            ;;
        C.elegans)
            ~/miniconda3/envs/CutAdapter1/bin/stringtie "${OUTPUT_FILE}.sortBypos.bam" -G /pubapps/mingyi.xie/clashhub/prod/app/RNAseqGenomeDB/Hisat2_Celegans/Caenorhabditis_elegans.WBcel235.112.gtf -p 12 -eB -A "${OUTPUT_FILE}.sortBypos.table" -o "${OUTPUT_FILE}.sortBypos.gtf"
            ;;
    esac # 运行 stringtie 以计算 TPM

    # 添加输出 gtf 到 sample_list.txt
    echo -e "${OUTPUT_FILE}  ${OUTPUT_FILE}.sortBypos.gtf " >> sample_list.txt # 将 GTF 文件路径追加到 sample_list.txt

    if [[ $prefix == *"control"* ]]; then
        echo -e "${OUTPUT_FILE},control" >> coldata_SampleName.csv # 将 control 样品的输出文件名写入 sample_output_filename.txt
    elif [[ $prefix == *"treatment"* ]]; then
        echo -e "${OUTPUT_FILE},treatment" >> coldata_SampleName.csv # 将 treatment 样品的输出文件名写入 sample_output_filename.txt
    fi
}


# 根据分析类型处理样品
if [ "$ANALYSIS_TYPE" == "TPM" ]; then
    for i in $(seq 1 $SAMPLE_COUNT); do
        process_sample $i "RNAseq"
    done

    ## 我用的stringtie 2.2.1 
    echo "Create report TPM"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py GeneTPM_data_report -j $jobID

    echo "TPM merge"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py rnaseqTPM_merge -j $jobID -s $SPECIES

    echo "Send GeneTPM result from email"
    /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/sendEmail.py "GeneTPM" $EMAIL $jobID

elif [ "$ANALYSIS_TYPE" == "TPM_DESeq2" ]; then

    echo -e "sample,condition" > coldata_SampleName.csv #这个文件里面输入control和treatment的各个文件名字

    # 处理控制样品
    for i in $(seq 1 $CONTROL_SAMPLE_COUNT); do
        process_sample $i "RNAseq_control"
    done
    # 处理处理样品
    for i in $(seq 1 $TREATMENT_SAMPLE_COUNT); do
        process_sample $((i + CONTROL_SAMPLE_COUNT)) "RNAseq_treatment"
    done
    echo "count calculation"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/prepDE.py3 -i sample_list.txt -l 150 -g gene_count.csv

    # 使用geneID作为index，然后做差异基因分析
    echo "Deseq2 by R"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py reorder_geneCountFileColumn
    
    # rm gene_count.csv  # 删除没有order column的 gene count csv文件
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/Rscript /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/analysis.R $jobID

    echo "merge differential expressed genes description "
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py rnaseqDEseqtable_merge -j $jobID -s $SPECIES

    ## 我用的stringtie 2.2.1 
    echo "Create DESEQ report"
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Deseq2_data_report -j $jobID

    echo "Send Deseq2 result from email"
    /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/sendEmail.py "Deseq2" $EMAIL $jobID

fi

echo "RNA-Seq done"
rm *.ctab *.gtf
# rm *.bam
# rm transcript_count_matrix.csv	
# rm *.table
date


