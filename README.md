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

3. Demo

📁 Input Data
	•	Visit https://clashub.rc.ufl.edu/Analyzer.html
	•	Download the demo datasets for:
	•	CLASH data
	•	RNA-seq data
	•	miRNA-seq data
	•	Differentially expressed genes (.csv)

▶️ Run Instructions

⚠️ clashub.py is not meant to be run directly by users. It powers the backend of the CLASHub web platform.
To test the software locally for peer-review purposes:

python clashub.py --demo

A simple log message or plot will be generated to demonstrate module execution.
Expected run time: < 1 min on standard desktop.

⸻

4. 🧰 Instructions for Use

Users are encouraged to use the CLASHub Web Platform to upload their own datasets and perform analysis. The Python backend (including clashub.py) handles:
	•	CLASH chimeric read processing
	•	RNA-seq and miRNA-seq normalization
	•	Differential expression analysis
	•	Plotting and cumulative distribution analysis
	•	Integration of ZSWIM8 knockout data across species

The web-based interface dynamically passes uploaded files to the backend for automated processing.

⸻

📈 Reproduction Instructions (Optional)

To reproduce the plots and quantitative results shown in the manuscript:
	1.	Download the specific datasets used in the study from NCBI SRA PRJNA1166120
	2.	Format the data according to examples provided on the Analyzer page.
	3.	Upload to CLASHub or modify clashub.py to run analysis locally by replacing the input paths.

⸻

🔐 License

This project is released under the MIT License.

⸻

🔗 Citation

If you use CLASHub in your research, please cite:

Xie Lab, University of Florida. “CLASHub: an integrated database and analytical platform for microRNA-target interactions.” Nature Communications (in review).

⸻

📂 Repository

All source code:
🔗 https://github.com/UF-Xie-Lab/CLASHub

Demo data available at:
🔗 https://clashub.rc.ufl.edu/Analyzer.html


