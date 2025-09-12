# CLASHub:an integrated database and analytical platform for microRNA-target interactions

[https://clashub.rc.ufl.edu](https://clashub.rc.ufl.edu).
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


## 3. Instructions for Use

Users are encouraged to use the CLASHub Web Platform to upload their own datasets and perform analysis. The Python backend (including `clashub.py`) handles:

- CLASH chimeric read processing  
- RNA-seq and miRNA-seq normalization  
- Differential expression analysis  
- Plotting and cumulative distribution analysis  

The web-based interface dynamically passes uploaded files to the backend for automated processing. The backend pipeline consists of modular functions implemented in `clashub.py`, and utilizes a variety of bioinformatics tools, listed with versions below.

---

### 🧪 Software and Tools Used

- **Python Backend**: `clashub.py` (custom, maintained on GitHub: https://github.com/UF-Xie-Lab/CLASHub)
- **Adapter Trimming**: `cutadapt` v2.10  
- **Read Merging**: `PEAR` v0.9.6  
- **Redundancy Collapse**: `fastx_collapser` v0.0.14  
- **Hybrid Identification**: `hyb` (Travis et al. 2014)  
- **Alignment**: `bowtie2` v2.5.3, `HISAT2` v2.2.1  
- **Transcript Quantification**: `StringTie` v2.2.1  
- **Differential Expression**: `DESeq2` v1.44 (via R)  
- **Conservation Scoring**: `phyloP` (via UCSC genome browser tracks)  
- **Free Energy Calculation**: `UNAfold` v3.8  
- **miRNA Reference**: miRBase Release 22.1  
- **Genome Reference**: Ensembl (e.g., GRCh38, GRCm39, BDGP6, WBcel235)  

---

## 4. How is CLASH data analyzed in CLASHub?

### Step 1: Data Upload and Input
- Accepts:  
  - Paired-end FASTQ (.gz)  
  - Cleaned single-end FASTA (.gz)  
- Required inputs:
  - Adapter sequences  
  - Target species  
  - Output file name  
  - Email address for notification  

### Step 2: Data Preprocessing
- Adapter Trimming: `cutadapt`  
- Read Merging: `PEAR` (for paired-end reads)  
- Redundancy Collapse: `fastx_collapser`  
- UMI Trimming: via cutadapt  

### Step 3: Hybrid Identification
- Tool: `hyb` (Travis et al.)  
- Aligner: `bowtie2`  
- Reference DB: Ensembl transcripts + miRBase mature miRNAs  
- Stability: ΔG (via `UNAfold`)  

### Step 4: Conservation Score
- Calculated using `phyloP` tracks per species:  
  - Human: `g38.phyloP100way`  
  - Mouse: `mm39.phyloP35way`  
  - Fly: `dm6.phyloP124way`  
  - Worm: `ce11.phyloP135way`  

### Step 5: Hybrid Quantification and Site Classification
- Types: 6mer, 7mer-A1, 7mer-m8, 8mer  
- Output includes: gene ID, site type, ΔG, conservation score, miRNA name, pairing pattern  

### Step 6: Output Results
- Summary HTML report  
- Comprehensive table with 12 detailed columns  
- Normalized hybrid abundance across multiple conditions  

---

## 5. How is AQ-miRNA-seq data analyzed in CLASHub?

### Step 1: Upload
- Accepted formats:  
  - Paired-end FASTQ  
  - Single-end FASTQ  
  - Cleaned FASTA  
- Input: adapter sequences, output file name, species, email  

### Step 2: Preprocessing
- Adapter trimming: `cutadapt`  
- Read merging (if paired-end): `PEAR`  
- UMI trimming: `cutadapt`  
- Collapse: `fastx_collapser`  

### Step 3: miRNA Quantification
- Mapping: miRBase mature miRNAs  
- First 18 nt matched  
- Expression: total miRNA & isoforms  

### Step 4: Output
- Total expression table  
- Isoform table  
- Summary report  

---

## 6. How is RNA-seq data analyzed in CLASHub?

### Step 1: Upload
- Format: Paired-end FASTQ (.gz)  
- Inputs: adapter sequences, species, output file name, email  

### Step 2: Preprocessing
- Adapter trimming: `cutadapt`  
- Alignment: `HISAT2` to Ensembl genome  

### Step 3: Expression Quantification
- Tool: `StringTie` → TPM values  

### Step 4: Differential Expression
- Raw count generation: `prepDE.py3`  
- DE analysis: `DESeq2` (R)  

### Step 5: Output
- TPM table  
- Raw count table  
- DESeq2 results  
- HTML summary  

---

## 7. How is cumulative fraction curve analysis performed in CLASHub?

### Step 1: Input
- Required file: CSV with `GeneName`, `BaseMean`, `log2FoldChange`  
- Additional: species, miRNA name, base mean threshold  

### Step 2: Target Grouping
- Based on:  
  - CLASH-derived targets (seed match + conservation)  
  - TargetScan-derived predictions  

### Step 3: Curve Generation
- Compares FC distribution between targets vs. non-targets  
- Filters low-expression genes  

### Step 4: Output
- Cumulative fraction curve  
- Summary report  

---

All analyses are powered by the CLASHub Python backend (`clashub.py`) and can be reproduced with proper inputs and environment setup.
