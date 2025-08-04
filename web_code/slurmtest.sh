#!/bin/bash
#SBATCH --job-name=test
#SBATCH --time=00:00:30
#SBATCH --output=/pubapps/mingyi.xie/clashhub/prod/slurmlogs/test_%j.log
date;hostname;pwd

echo "I am a test in a container"

sleep 10
