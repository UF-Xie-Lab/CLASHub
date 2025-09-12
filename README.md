# CLASHub:an integrated database and analytical platform for microRNA-target interactions

CLASHub is an integrated platform that combines a curated database of CLASH-derived miRNA–target interactions with powerful tools for analyzing CLASH, miRNA-seq, and RNA-seq datasets. [https://clashub.rc.ufl.edu](https://clashub.rc.ufl.edu).
---

## Required Content Summary

- **Source code**: All core scripts, including `clashub.py`, are available in this repository.
- **Demo dataset**: Example CLASH, RNA-seq, and miRNA-seq data are available at [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html).

---

## 1. System Requirements

- **Operating System**: macOS, or Windows Subsystem
- **Python version**: Python 3.12
- **Memory**: ≥ 8 GB RAM recommended

### Required Python Packages

Make sure the following Python packages are installed:

pip install matplotlib seaborn numpy pandas biopython plotly scipy jinja2

Also make sure your Python installation includes:

csv, getopt, collections, os, re, sys, glob, subprocess, logging, traceback

These are all part of Python’s standard library.

## 2. Demo

Input Data
	•	Visit https://clashub.rc.ufl.edu/Analyzer.html
	•	Download the demo datasets for:
	•	CLASH data
	•	RNA-seq data
	•	miRNA-seq data
	•	Differentially expressed genes (.csv)

Run Instructions

clashub.py is not meant to be run directly by users. It powers the backend of the CLASHub web platform.


## 3. 🧰 Instructions for Use

Users are encouraged to use the CLASHub Web Platform to upload their own datasets and perform analysis. The Python backend (including clashub.py) handles:
	•	CLASH chimeric read processing
	•	RNA-seq and miRNA-seq normalization
	•	Differential expression analysis
	•	Plotting and cumulative distribution analysis

The web-based interface dynamically passes uploaded files to the backend for automated processing.

# 太好了！你已经完成了大部分内容，现在只需要把这些 CLASH 分析流程（由 .sbatch 执行的那一部分）提炼总结进 README.md，用 Markdown 写清楚各步骤的逻辑就行。下面是我为你完整补充并整理好的一段内容，你可以直接复制粘贴进你的 README.md 文件中适当位置（推荐放在系统说明或 demo 之后）。

⸻

🧬 CLASH Analysis Pipeline Details

CLASHub uses a modularized backend analysis pipeline to process CLASH sequencing data and identify miRNA–target chimeric interactions. The analysis is powered by a series of automated SLURM job scripts (.sbatch), which are triggered via the web interface.

Note: These scripts are not designed for direct use by most users, but rather orchestrated automatically by the backend based on uploaded files and user selections (e.g., species, input format).

⚙️ Workflow Overview

The CLASH data processing pipeline follows these steps:
	1.	Preprocessing of raw reads
Depending on the input type:
	•	FASTQ input: Performs adapter trimming (cutadapt), read merging (PEAR), UMI removal, and collapsing.
	•	FASTA input: Decompression and renaming to standardized format.
	2.	Hybrid Detection via HYB
Runs hyb_analysis_pubapp.sh to:
	•	Map reads to species-specific miRNA/transcriptome reference.
	•	Predict RNA duplexes (Vienna format).
	•	Generate .hyb and .viennad output files.
	3.	Species-Specific Analysis
Automatically selects reference databases and annotation files based on the species:
	•	Human
	•	Mouse
	•	Drosophila (D. melanogaster)
	•	C. elegans
	4.	Chimera Table Generation
Runs:

CLASHub.py Viennad_to_Table

Converts .viennad and .hyb results into an annotated table of miRNA–target interactions using species-specific references.

	5.	Cleanup
Deletes intermediate files to reduce storage footprint.
	6.	Result Report Generation
Runs:

CLASHub.py data_report

	•	Summarizes analysis.
	•	Generates .csv output table and email notification.

⸻

📂 Example Output Files
	•	*.hyb — hybrid interactions (raw)
	•	*.viennad — RNA secondary structure predictions
	•	*_FinalResult.csv — Final annotated miRNA–target interaction table
	•	.log — sbatch log files
	•	.html — visual summary report (auto-generated)

⸻

🛠️ Script Dispatch Flow

Step	Script/Tool	Purpose
cutadapt	Adapter trimming	
pear	Merge R1/R2 reads	
fastx_collapser	Collapse identical reads	
hyb_analysis_pubapp.sh	Predict hybrid interactions	
CLASHub.py Viennad_to_Table	Parse viennad into structured table	
CLASHub.py data_report	Generate summary CSV and plots	
sendEmail.py	Send result to user	


⸻

这段说明可以无缝插入你的 README.md 中，让用户和评审都清楚 CLASH 分析流程中 .sbatch 是如何调用分析脚本的。

如果你还需要我把完整 README.md 合并输出一份 markdown 文本，方便你一键复制，我也可以帮你完成。是否需要？
