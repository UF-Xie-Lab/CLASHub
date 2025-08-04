#!/bin/bash
#SBATCH --mail-type=ALL          # Mail events (NONE, BEGIN, END, FAIL, ALL)
#SBATCH --mail-user=luli1@ufl.edu     # Where to send mail    
#SBATCH --ntasks=1               # 只需要 1 个 task
#SBATCH --cpus-per-task=24       # 每个 task 使用 12 个 CPU
#SBATCH --mem=120gb
#SBATCH --qos=mingyi.xie-b
#SBATCH --time=24:00:00
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log
pwd; hostname; date

cd $OUTPUT_DIR
# 使用通过 `--export` 传递给该脚本的环境变量
echo "sbatch hyb upload_type: $UPLOAD_TYPE"
echo "sbatch hyb Output file: $OUTPUT_FILE"
echo "sbatch hyb Species: $SPECIES"
echo "sbatch hyb email: $EMAIL"
echo "sbatch hyb OUTPUT_DIR: $OUTPUT_DIR"
echo "sbatch hyb jobID ${jobID}"
echo "sbatch Five Prime Adapter: $FIVE_PRIME_ADAPTER" # 打印5'适配器序列
echo "sbatch Three Prime Adapter: $THREE_PRIME_ADAPTER" # 打印3'适配器序列
OUTPUT_FILE_BASENAME=$(basename "$OUTPUT_FILE")
echo "sbatch output basename: $OUTPUT_FILE_BASENAME" 

# Prepare arguments for BeforeAnalysisSendEmail.py
declare -a PYTHON_ARGS=(
    "--email" "$EMAIL"
    "--jobID" "$jobID"
    "--species" "$SPECIES"
    "--sample_count" "1"
    "--sample_info" "Sample 1: Input type: ${UPLOAD_TYPE}, Output file: $(basename "${OUTPUT_FILE}.fasta")"
)

if [ "$UPLOAD_TYPE" = "fastq" ]; then
    PYTHON_ARGS+=("--sample_info" "Input files: $(basename "$INPUT_FILE1"), $(basename "$INPUT_FILE2"); Adapters: 5' ${FIVE_PRIME_ADAPTER}, 3' ${THREE_PRIME_ADAPTER}")
elif [ "$UPLOAD_TYPE" = "fasta" ]; then
    PYTHON_ARGS+=("--sample_info" "Input file: $(basename "$INPUT_FILE")")
fi

# Send the pre-analysis email
python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/BeforeAnalysisSendEmail.py  "${PYTHON_ARGS[@]}"

if [ "$UPLOAD_TYPE" = "fastq" ]; then
    echo "sbatch Input fastq1: $INPUT_FILE1"
    echo "sbatch Input fastq2: $INPUT_FILE2"                         # 删除解压前的文件扩展名
    echo "sbatch Five Prime Adapter: $FIVE_PRIME_ADAPTER"
    echo "sbatch Three Prime Adapter: $THREE_PRIME_ADAPTER"

    # cutadapt
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -a $THREE_PRIME_ADAPTER -A $FIVE_PRIME_ADAPTER \
    -o "${OUTPUT_FILE}_R1.cut.fastq.gz" \
    -p "${OUTPUT_FILE}_R2.cut.fastq.gz" \
    $INPUT_FILE1 $INPUT_FILE2 --minimum-length 24 -j 24

    # 解压文件
    pigz -d -p 24 "${OUTPUT_FILE}_R1.cut.fastq.gz"
    pigz -d -p 24 "${OUTPUT_FILE}_R2.cut.fastq.gz"

    # pear file
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/pear -f "${OUTPUT_FILE}_R1.cut.fastq" -r "${OUTPUT_FILE}_R2.cut.fastq" -o "$OUTPUT_FILE" -n 44 -j 24

    # collapse 文件
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/fastx_collapser -i "${OUTPUT_FILE}.assembled.fastq" > "${OUTPUT_FILE}.collapsed.fasta"

    # remove UMI
    /pubapps/mingyi.xie/miniconda3/envs/CutAdapter1/bin/cutadapt -u 4 -u -4 -o "${OUTPUT_FILE}.fasta" "${OUTPUT_FILE}.collapsed.fasta" -m 36 -j 24

    # hyb analysis
    case $SPECIES in
        Human)
            echo "sbatch Human hyb analysis start"
            DATABASE=martquery_0228172604_181_human_unique1_add18S28S
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0228172604_181_human_unique1_add18S28S_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0228172604_181_human_unique1_add18S28S_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/martquery_0228172604_181_human_unique1_add18S28S.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/human_transcripts_CS_20220422.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_0228172604_181_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/hsa_pre.fas

            ;;
        Mouse)
            echo "sbatch Mouse hyb analysis start"
            DATABASE=martquery_0530193902_838_mm39_unique_add18S28S
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0530193902_838_mm39_unique_add18S28S_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0530193902_838_mm39_unique_add18S28S_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/martquery_0530193902_838_mm39_unique_add18S28S.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20230606_Exp320_mouse_transcript_CS.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_0530193902_838_mm39_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/mmu_pre.fas
            ;;
        D.melanogaster)
            echo "sbatch D.melanogaster hyb analysis start"
            DATABASE=20220221_dm6_unique
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_20220221_dm6_unique_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_20220221_dm6_unique_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/20220221_dm6_unique.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20220223_dm6_all_conservation_score2.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_1109155317_9_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/dme_pre.fas
            ;;
        C.elegans)
            echo "sbatch C.elegans hyb analysis start"
            DATABASE=20230616martquery_0613142828_717_WBcel235_unique
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_20230616martquery_0613142828_717_WBcel235_unique_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_20230616martquery_0613142828_717_WBcel235_unique_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/20230616martquery_0613142828_717_WBcel235_unique.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20230618_Exp325_Celegans_CS.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/EXP325_20230618_C.elegans_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Cel_pre.fas
            ;;
    esac
fi   # 添加fi来结束条件

if [ "$UPLOAD_TYPE" = "fasta" ]; then
    echo "sbatch Input fasta: $INPUT_FILE"
    pigz -d -p 24 "$INPUT_FILE"
    INPUT_FILE="${INPUT_FILE%.gz}"                            # 删除解压前的文件扩展名
    echo "Total reads in the raw FASTA file is $(($(wc -l < $INPUT_FILE) / 2))"
    mv $INPUT_FILE "${OUTPUT_FILE}.fasta" #改名字

    case $SPECIES in
        Human)
            echo "sbatch Human hyb analysis start"
            DATABASE=martquery_0228172604_181_human_unique1_add18S28S
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0228172604_181_human_unique1_add18S28S_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0228172604_181_human_unique1_add18S28S_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/martquery_0228172604_181_human_unique1_add18S28S.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/human_transcripts_CS_20220422.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_0228172604_181_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/hsa_pre.fas

            ;;
        Mouse)
            echo "sbatch Mouse hyb analysis start"
            DATABASE=martquery_0530193902_838_mm39_unique_add18S28S
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0530193902_838_mm39_unique_add18S28S_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_martquery_0530193902_838_mm39_unique_add18S28S_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/martquery_0530193902_838_mm39_unique_add18S28S.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20230606_Exp320_mouse_transcript_CS.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_0530193902_838_mm39_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/mmu_pre.fas
            ;;
        D.melanogaster)
            echo "sbatch D.melanogaster hyb analysis start"
            DATABASE=20220221_dm6_unique
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_20220221_dm6_unique_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_20220221_dm6_unique_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/20220221_dm6_unique.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20220223_dm6_all_conservation_score2.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/martquery_1109155317_9_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/dme_pre.fas
            ;;
        C.elegans)
            echo "sbatch C.elegans hyb analysis start"
            DATABASE=20230616martquery_0613142828_717_WBcel235_unique
            bash /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/bin/hyb_analysis_pubapp.sh $OUTPUT_FILE_BASENAME $DATABASE
            mv "$OUTPUT_FILE_BASENAME"_comp_20230616martquery_0613142828_717_WBcel235_unique_hybrids_ua.hyb "$OUTPUT_FILE_BASENAME".hyb
            mv "$OUTPUT_FILE_BASENAME"_comp_20230616martquery_0613142828_717_WBcel235_unique_hybrids_ua.viennad "$OUTPUT_FILE_BASENAME".viennad
            /pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py Viennad_to_Table -t /pubapps/mingyi.xie/clashhub/prod/software/hyb-master/data/db/20230616martquery_0613142828_717_WBcel235_unique.fasta -c /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/20230618_Exp325_Celegans_CS.txt -i $OUTPUT_FILE_BASENAME -n /pubapps/mingyi.xie/clashhub/prod/app/Transcript_DB/EXP325_20230618_C.elegans_name.txt -p /pubapps/mingyi.xie/clashhub/prod/app/MiRNA_database/Cel_pre.fas
            ;;
    esac
fi  # 添加fi来结束条件

rm *fastq
rm "${OUTPUT_FILE}.collapsed.fasta"
rm *fasta *gz
rm *blast *tab *txt *ref
rm *hybrids.hyb *.vienna *dg.hyb *merged.hyb

echo "html start"
/pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py data_report -j "${jobID}" -o "${OUTPUT_FILE}"
echo "html end"

/pubapps/mingyi.xie//miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/sendEmail.py "${OUTPUT_FILE}_FinalResult.csv" $EMAIL $jobID

echo "hyb done"

