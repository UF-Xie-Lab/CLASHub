# CLASHub: an integrated database and analytical platform for microRNA-target interactions

[https://clashub.rc.ufl.edu](https://clashub.rc.ufl.edu)
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

`pip install matplotlib seaborn numpy pandas biopython plotly scipy jinja2`

Also make sure your Python installation includes:

`csv, getopt, collections, os, re, sys, glob, subprocess, logging, traceback`

These are all part of Python’s standard library.

## 2. Demo

**Input Data**
- Visit [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html)
- Download the demo datasets for:
  - CLASH data
  - RNA-seq data
  - miRNA-seq data
  - Differentially expressed genes (.csv)

**Run Instructions**
`clashub.py` is not meant to be run directly by users. It powers the backend of the CLASHub web platform.

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
- **Sequence Repair**: `repair.sh` (BBMap suite)
- **Peak Calling**: `Piranha` v1.2.1
- **Genome Coverage & Format Conversion**: `BEDTools` v2.31.1, `bedGraphToBigWig` v2.10
- **Quality Control**: `RSeQC` (read_distribution.py)
- **Transcript Quantification**: `StringTie` v2.2.1
- **Differential Expression**: `DESeq2` v1.44 (via R)
- **Conservation Scoring**: `phyloP` (via UCSC genome browser tracks)
- **Free Energy Calculation**: `UNAfold` v3.8
- **miRNA Reference**: miRBase Release 22.1
- **Genome Reference**: Ensembl (e.g., GRCh38, GRCm39, BDGP6, WBcel235)

---

## 4. How is CLASH data analyzed in CLASHub?

### Step 1: Data Upload and Input
- **Accepts**: Paired-end FASTQ (.gz) or Cleaned single-end FASTA (.gz)  
- **Required inputs**:
  - Adapter sequences  
  - Target species  
  - Output file name  
  - Email address for notification  
- **UMI Configuration**: Users can specify 5′ and 3′ UMI lengths. If both UMI lengths are set to zero, the deduplication and UMI-trimming steps are bypassed.

### Step 2: Data Preprocessing
- **Adapter Trimming**: `cutadapt`
- **Read Merging**: `PEAR` (for paired-end reads)
- **Redundancy Collapse**: `fastx_collapser` (skipped if UMIs are 0)
- **UMI Trimming**: via `cutadapt`

### Step 3: Genome Mapping & Peak Calling
- **Downsampling**: To prevent memory overload, input files exceeding 20 million reads are downsampled prior to mapping.
- **Alignment**: Reads are aligned to the genome using `HISAT2` and sorted with `SAMtools`.
- **Peak Calling**: `Piranha` is used for peak-calling to assess target site confidence.
- **Visualization**: BigWig files are generated for genome-browser visualization (e.g., in IGV).

### Step 4: Hybrid Identification
- **Tool**: `hyb` (Travis et al.)
- **Aligner**: `bowtie2`
- **Reference DB**: Ensembl transcripts + miRBase mature miRNAs
- **Stability**: Free energy and base-pairing patterns calculated via `UNAfold`

### Step 5: Conservation Score & Site Classification
- **Conservation**: Calculated using `phyloP` tracks per species (e.g., `g38.phyloP100way`, `mm39.phyloP35way`).
- **Types**: Offset 6mer, 6mer, 7mer-A1, 7mer-m8, 8mer.

### Step 6: Output Results
- Summary HTML report  
- Comprehensive table with detailed columns including Piranha Peak p-values
- Normalized hybrid abundance across conditions  

---

## 5. How is AQ-miRNA-seq data analyzed in CLASHub?

### Step 1: Upload
- **Accepted formats**: Paired-end FASTQ, Single-end FASTQ, Cleaned FASTA  
- **Input**: adapter sequences, output file name, species, email  
- **UMI Configuration**: Specify 5′ and 3′ lengths. Setting lengths to zero (for standard kits without UMIs) will automatically skip deduplication.

### Step 2: Preprocessing
- **Adapter trimming**: `cutadapt`
- **Read merging (if paired-end)**: `PEAR`
- **Collapse & UMI trimming**: `fastx_collapser` and `cutadapt` (skipped if UMIs = 0)

### Step 3: miRNA Quantification
- **Mapping**: The first 18 nucleotides of each read are perfectly matched to mature miRNA sequences from miRBase.
- **Expression**: Total miRNA levels and isoform-specific abundances are calculated.

### Step 4: Output
- Total expression table  
- Isoform table  
- Summary HTML report  

---

## 6. How is RNA-seq data analyzed in CLASHub?

### Step 1: Upload & Configuration
- **Format**: Paired-end FASTQ (.gz)  
- **Inputs**: adapter sequences, species, output file name, email  
- **Library Configuration**: Specify Library Type (stranded or unstranded).
- **Analysis Options**: Users can optionally enable Exon-Intron Split Analysis (EISA).

### Step 2: Preprocessing & QC
- **Auto-Repair**: Broken paired-end reads are automatically checked and repaired using `repair.sh`.
- **Adapter trimming**: `cutadapt`
- **Alignment**: `HISAT2` to Ensembl genome
- **Quality Check**: `RSeQC` is used to run read distribution for quality checks.

### Step 3: Expression Quantification
- **Standard**: `StringTie` generates TPM values.
- **EISA (Optional)**: `StringTie` calculates coverage separately using customized Exon-only and Intron-only GTF files.

### Step 4: Differential Expression
- **Raw count generation**: `prepDE.py3`
- **DE analysis**: `DESeq2` (via R)

### Step 5: Output
- TPM and Raw count tables  
- DESeq2 DE results  
- HTML summary report  
- EISA classification tables (if enabled)

---

## 7. How is cumulative fraction curve analysis performed in CLASHub?

### Step 1: Input
- **Required file**: CSV with `GeneName`, `BaseMean`, `log2FoldChange`.
- **Additional**: species, miRNA name, base mean threshold (default: 100).

### Step 2: Target Grouping & Filtering
- Targets are classified via CLASH-derived datasets and TargetScan-derived predictions.
- **Analysis Modes**: 
  - *Standard Analysis*: Groups targets by broad conservation status.
  - *Stringent Filtering*: Selects the top 25% of predicted targets based on TargetScan Context++ scores for higher efficacy.

### Step 3: Curve Generation
- Compares fold change distribution between target and non-target genes.
- Statistical significance is determined using two-sided Mann–Whitney U tests.

### Step 4: Output
- Cumulative fraction curve plots (SVG format)
- Detailed merged targets dataset (CSV format)

---

## 8. Reproducing Results from the Manuscript (Optional)

The analysis described in the manuscript was performed using CLASHub's web platform and backend pipeline (`clashub.py`). To reproduce the quantitative results:

1. Download demo or raw datasets from: [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html)
2. Follow the usage instructions in Sections 3–7 of this README to run:
   - CLASH hybrid identification
   - RNA-seq differential analysis
   - AQ-miRNA-seq quantification
   - Cumulative fraction curve analysis
3. Use the output `.csv` files to recreate figures as described in the manuscript.
