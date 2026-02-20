#!/bin/bash
#SBATCH --mail-type=END          # Mail events (NONE, BEGIN, END, FAIL, ALL)
#SBATCH --mail-user=luli1@ufl.edu     # Where to send mail    
#SBATCH --ntasks=1                    # Run on a single CPU
#SBATCH --mem=10gb                     # Job memory request
#SBATCH --time=1:00:00               # Time limit hrs:min:sec
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/%x.log

pwd; hostname; date

TARGET_ENV=${CumulativeCurve_ENV:-prod} # Default to prod if empty

if [[ "$TARGET_ENV" == "dev" ]]; then
    ENVIRONMENT="dev"
    CODE_ROOT="/pubapps/mingyi.xie/clashhub/dev"
else
    ENVIRONMENT="prod"
    CODE_ROOT="/pubapps/mingyi.xie/clashhub/prod"
fi

PHP_ROOT="$CODE_ROOT/app/php"

echo "[ENV DETECTED] ENVIRONMENT = $ENVIRONMENT"
echo "[ENV DETECTED] CODE_ROOT = $CODE_ROOT"
echo "[ENV DETECTED] PHP_ROOT = $PHP_ROOT"

echo "Input file: $CumulativeCurve_INPUT_FILE"
echo "Species: $CumulativeCurve_SPECIES"
echo "miRNA name: $CumulativeCurve_mirnaName"
echo "miRNA Seed: $CumulativeCurve_SEED" 
echo "BaseMean: $CumulativeCurve_BaseMean"
echo "Output file: $CumulativeCurve_outputFileName"
echo "Email: $CumulativeCurve_EMAIL"
echo "Job ID: $CumulativeCurve_JOBID"
echo "Target Env: $TARGET_ENV" 
echo "Perform Advanced: $CumulativeCurve_ADVANCED"

# [UPDATE] Add Advanced info to the start-up email
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/BeforeAnalysisSendEmail.py" \
  --email "$CumulativeCurve_EMAIL" \
  --jobID "$CumulativeCurve_JOBID" \
  --species "$CumulativeCurve_SPECIES" \
  --sample_count 1 \
  --sample_info "miRNA Name: $CumulativeCurve_mirnaName, Seed: $CumulativeCurve_SEED, BaseMean: $CumulativeCurve_BaseMean, Advanced: $CumulativeCurve_ADVANCED"

# [UPDATE] Pass the --advanced flag to CLASHub.py
/pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/CLASHub.py" \
  Cumulative_fraction_curve_targetScan_CLASH \
  -d "${CumulativeCurve_INPUT_FILE}" \
  -b "$CumulativeCurve_BaseMean" \
  -m "$CumulativeCurve_mirnaName" \
  -o "$CumulativeCurve_outputFileName" \
  -s "$CumulativeCurve_SPECIES" \
  --seed "$CumulativeCurve_SEED" \
  --advanced "$CumulativeCurve_ADVANCED"

# [NEW] Conditional Email Sending Logic
# If user selected Advanced Analysis (yes), send 3 files.
# If user selected Standard only (no), send 2 files.

if [[ "$CumulativeCurve_ADVANCED" == "yes" ]]; then
    echo "Sending email with 3 files (Base + Advanced + CSV)..."
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/sendEmail.py" \
      "${CumulativeCurve_outputFileName}_CumulativeFractionCurve_Standard.svg" \
      "${CumulativeCurve_outputFileName}_CumulativeFractionCurve_Stringent.svg" \
      "${CumulativeCurve_outputFileName}_merged_targets_data.csv" \
      "$CumulativeCurve_EMAIL" \
      "$CumulativeCurve_JOBID" \
      "$ENVIRONMENT"
else
    echo "Sending email with 2 files (Base + CSV)..."
    # Note: Even if Advanced is OFF, the standard plot is still named "_Base.svg" by the Python script logic
    /pubapps/mingyi.xie/miniconda3/envs/myflaskenv/bin/python3 "$PHP_ROOT/PyScript/sendEmail.py" \
      "${CumulativeCurve_outputFileName}_CumulativeFractionCurve_Standard.svg" \
      "${CumulativeCurve_outputFileName}_merged_targets_data.csv" \
      "$CumulativeCurve_EMAIL" \
      "$CumulativeCurve_JOBID" \
      "$ENVIRONMENT"
fi

echo "Cumulative Fraction Curve is done"