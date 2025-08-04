#!/bin/bash
#SBATCH --mail-type=END          # Mail events (NONE, BEGIN, END, FAIL, ALL)
#SBATCH --mail-user=luli1@ufl.edu     # Where to send mail    
#SBATCH --ntasks=1                    # Run on a single CPU
#SBATCH --mem=40gb                     # Job memory request
#SBATCH --time=12:00:00               # Time limit hrs:min:sec
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log

pwd; hostname; date

# 使用通过 `--export` 传递给该脚本的环境变量
echo "Input file: $CumulativeCurve_INPUT_FILE"
echo "Species: $CumulativeCurve_SPECIES"
echo "miRNA name: $CumulativeCurve_mirnaName"
echo "BaseMean: $CumulativeCurve_BaseMean"
echo "Output file: $CumulativeCurve_outputFileName"
echo "Email: $CumulativeCurve_EMAIL"
echo "Job ID: $CumulativeCurve_JOBID"

# 确保已经定义所有必要的参数
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/BeforeAnalysisSendEmail.py \
  --email "$CumulativeCurve_EMAIL" \
  --jobID "$CumulativeCurve_JOBID" \
  --species "$CumulativeCurve_SPECIES" \
  --sample_count 1 \
  --sample_info "miRNA Name: $CumulativeCurve_mirnaName, BaseMean: $CumulativeCurve_BaseMean, Input File: $(basename "$CumulativeCurve_INPUT_FILE"), , Output File: $(basename "$CumulativeCurve_outputFileName")"

# 执行 miRNA abundance count 分析
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/CLASHub.py \
  Cumulative_fraction_curve_targetScan_CLASH \
  -d "${CumulativeCurve_INPUT_FILE}" \
  -b "$CumulativeCurve_BaseMean" \
  -m "$CumulativeCurve_mirnaName" \
  -o "$CumulativeCurve_outputFileName" \
  -s "$CumulativeCurve_SPECIES"

# 发送完成邮件
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 /pubapps/mingyi.xie/clashhub/prod/app/php/PyScript/sendEmail.py \
  "${CumulativeCurve_outputFileName}_CumulativeFractionCurve.svg" \
  "${CumulativeCurve_outputFileName}_merged_targets_data.csv" \
  "$CumulativeCurve_EMAIL" \
  "$CumulativeCurve_JOBID" 

echo "Cumulative Fraction Curve is done"