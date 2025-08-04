#!/bin/bash
#SBATCH --mail-type=ALL          # Mail events (NONE, BEGIN, END, FAIL, ALL)
#SBATCH --mail-user=luli1@ufl.edu
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=12       # 每个 task 使用 12 个 CPU
#SBATCH --mem=40gb
#SBATCH --time=24:00:00
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log
pwd; hostname; date

cd $OUTPUT_DIR

# Check analysis type
echo "miR-seq Analysis type: $ANALYSIS_TYPE"
echo "miR-seq job ID: $jobID"
echo "miR-seq Species: $SPECIES"
echo "miR-seq email: $EMAIL"
echo "miR-seq OUTPUT_DIR: $OUTPUT_DIR"

# 准备发送邮件的样本信息
declare -a PYTHON_ARGS=(
    "--email" "$EMAIL"
    "--jobID" "$jobID"
    "--species" "$SPECIES"
    "--sample_count" "$SAMPLE_COUNT"
)

for ((i=1; i<=SAMPLE_COUNT; i++)); do
    if [ "$ANALYSIS_TYPE" = "aqPairedEndRead" ]; then
        inputFile1="INPUT_FILE1_$i"
        inputFile2="INPUT_FILE2_$i"
        outputFile="OUTPUT_FILE_$i"
        fivePrimeAdapter="FIVE_PRIME_ADAPTER_$i"
        threePrimeAdapter="THREE_PRIME_ADAPTER_$i"

        # 使用 basename 提取文件名
        inputFileName1=$(basename "${!inputFile1}")
        inputFileName2=$(basename "${!inputFile2}")
        outputFileName1="${!outputFile}_R1.cut.fastq.gz"
        outputFileName2="${!outputFile}_R2.cut.fastq.gz"

        sample_info="Sample $i: Input files: ${inputFileName1}, ${inputFileName2}; Output files: ${outputFileName1}, ${outputFileName2}; 5' Adapter: ${!fivePrimeAdapter}; 3' Adapter: ${!threePrimeAdapter}"
    elif [ "$ANALYSIS_TYPE" = "aqSingleEndRead" ]; then
        inputFile1="INPUT_FILE1_$i"
        outputFile="OUTPUT_FILE_$i"
        threePrimeAdapter="THREE_PRIME_ADAPTER_$i"

        inputFileName1=$(basename "${!inputFile1}")
        outputFileName1="${!outputFile}_R1.cut.fastq.gz"

        sample_info="Sample $i: Input file: ${inputFileName1}; Output file: ${outputFileName1}; 3' Adapter: ${!threePrimeAdapter}"
    elif [ "$ANALYSIS_TYPE" = "CleanRead" ]; then
        inputFile1="INPUT_FILE1_$i"
        outputFile="OUTPUT_FILE_$i"

        inputFileName1=$(basename "${!inputFile1}")
        outputFileName1="${!outputFile}.CutUMI.fasta"

        sample_info="Sample $i: Input file: ${inputFileName1}; Output file: ${outputFileName1}"
    fi

    PYTHON_ARGS+=("--sample_info" "$sample_info")
done

# 调用 Python 脚本发送邮件
python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/BeforeAnalysisSendEmail.py "${PYTHON_ARGS[@]}"


# Handle different analysis types
if [ "$ANALYSIS_TYPE" = "aqPairedEndRead" ]; then
    echo "Processing paired-end reads."
    for ((i=1; i<=SAMPLE_COUNT; i++)); do
        inputFile1="INPUT_FILE1_$i"
        inputFile2="INPUT_FILE2_$i"
        outputFile="OUTPUT_FILE_$i"
        fivePrimeAdapter="FIVE_PRIME_ADAPTER_$i"
        threePrimeAdapter="THREE_PRIME_ADAPTER_$i"

        echo "Sample $i Input fastq1: ${!inputFile1}"
        echo "Sample $i Input fastq2: ${!inputFile2}"
        echo "Sample $i output file name: ${!outputFile}"
        echo "Sample $i Five Prime Adapter: ${!fivePrimeAdapter}"
        echo "Sample $i Three Prime Adapter: ${!threePrimeAdapter}"

        # Run cutadapt
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -a "${!threePrimeAdapter}" -A "${!fivePrimeAdapter}" \
        -o "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq.gz" \
        -p "${OUTPUT_DIR}/${!outputFile}_R2.cut.fastq.gz" \
        "${!inputFile1}" "${!inputFile2}" --minimum-length 26 -j 12

        # Decompress files
        pigz -d -p 12 "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq.gz"
        pigz -d -p 12 "${OUTPUT_DIR}/${!outputFile}_R2.cut.fastq.gz"

        # Run PEAR
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/pear -f "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq" -r "${OUTPUT_DIR}/${!outputFile}_R2.cut.fastq" -o "${OUTPUT_DIR}/${!outputFile}" -n 26 -j 12

        # Collapse sequences
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/fastx_collapser -i "${OUTPUT_DIR}/${!outputFile}.assembled.fastq" > "${OUTPUT_DIR}/${!outputFile}.collapsed.fasta"

        # Remove UMI
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -u 4 -u -4 -o "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" "${OUTPUT_DIR}/${!outputFile}.collapsed.fasta" -m 18 -M 30 -j 12

        # miRNA abundance count
        case $SPECIES in
            Human)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Human_microRNA_database_SpikeIn.fa 
                ;;
            Mouse)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Mouse_microRNA_database_SpikeIn.fa 
                ;;
            D.melanogaster)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Dm6_microRNA_database_SpikeIn.fa 
                ;;
            C.elegans)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Celegans_microRNA_database_SpikeIn.fasta 
                ;;
        esac
        # miRNA count concat
    done
elif [ "$ANALYSIS_TYPE" = "aqSingleEndRead" ]; then
    echo "Processing single-end reads."
    for ((i=1; i<=SAMPLE_COUNT; i++)); do
        inputFile1="INPUT_FILE1_$i"
        outputFile="OUTPUT_FILE_$i"
        threePrimeAdapter="THREE_PRIME_ADAPTER_$i"

        echo "Sample $i Input fastq1: ${!inputFile1}"
        echo "Sample $i output file name: ${!outputFile}"
        echo "Sample $i Three Prime Adapter: ${!threePrimeAdapter}"

        # Run cutadapt (only 3' adapter)
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -a "${!threePrimeAdapter}" \
        -o "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq.gz" \
        "${!inputFile1}" --minimum-length 26 -j 12

        # Decompress files
        pigz -d -p 12 "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq.gz"

        # Collapse sequences
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/fastx_collapser -i "${OUTPUT_DIR}/${!outputFile}_R1.cut.fastq" > "${OUTPUT_DIR}/${!outputFile}.collapsed.fasta"

        # Remove UMI
        /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -u 4 -u -4 -o "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" "${OUTPUT_DIR}/${!outputFile}.collapsed.fasta" -m 18 -M 30 -j 12

        # miRNA abundance count
        case $SPECIES in
            Human)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Human_microRNA_database_SpikeIn.fa 
                ;;
            Mouse)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Mouse_microRNA_database_SpikeIn.fa 
                ;;
            D.melanogaster)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Dm6_microRNA_database_SpikeIn.fa 
                ;;
            C.elegans)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Celegans_microRNA_database_SpikeIn.fasta 
                ;;
        esac
    done
elif [ "$ANALYSIS_TYPE" = "CleanRead" ]; then
    echo "Processing cleaned fasta reads."
    for ((i=1; i<=SAMPLE_COUNT; i++)); do
        inputFile1="INPUT_FILE1_$i"
        outputFile="OUTPUT_FILE_$i"

        echo "Input fasta: ${!inputFile1}"

        # Decompress file
        pigz -d -p 12 "${!inputFile1}"
        INPUT_FILE="${!inputFile1%.gz}"  # Remove the .gz extension

        # Log the total reads
        echo "Total reads in the raw FASTA file is $(($(wc -l < $INPUT_FILE) / 2))"
        echo "Sample $i output file name: ${!outputFile}"

        # Rename the file
        mv $INPUT_FILE "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta"

        # miRNA abundance count
        case $SPECIES in
            Human)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Human_microRNA_database_SpikeIn.fa 
                ;;
            Mouse)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Mouse_microRNA_database_SpikeIn.fa 
                ;;
            D.melanogaster)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Dm6_microRNA_database_SpikeIn.fa 
                ;;
            C.elegans)
                /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py all_miRNA_abundance_1st_18th -i "${OUTPUT_DIR}/${!outputFile}.CutUMI.fasta" -d /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Celegans_microRNA_database_SpikeIn.fasta 
                ;;
        esac
    done
fi

# miRNA count concat
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Concat_mirnaCount -j $jobID

# Generate report
echo "${jobID}"
echo "Generating HTML report"
if [ "$ANALYSIS_TYPE" = "aqPairedEndRead" ]; then
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py aqPE_data_report -j "${jobID}"
elif [ "$ANALYSIS_TYPE" = "aqSingleEndRead" ]; then
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py aqSE_data_report -j "${jobID}"
elif [ "$ANALYSIS_TYPE" = "CleanRead" ]; then
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py aqCR_data_report -j "${jobID}"
fi

echo "Report generation completed"

# Send email notification
# For miRNA jobs
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 \
/pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/sendEmail.py \
"${OUTPUT_DIR}/AllSample_RawCount.csv" \
"${OUTPUT_DIR}/AllSample_Isoform_RawCount.csv" \
$EMAIL \
$jobID

echo "AQ-Seq processing completed"

rm *fasta *mirnaCount.csv *totalCount.csv 

