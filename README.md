# [cite_start]CLASHub: an integrated database and analytical platform for microRNA-target interactions [cite: 1]

[cite_start][https://clashub.rc.ufl.edu](https://clashub.rc.ufl.edu) [cite: 20]
---

## Required Content Summary

- [cite_start]**Source code**: All core scripts, including `clashub.py`, are available in this repository[cite: 108, 452].
- [cite_start]**Demo dataset**: Example CLASH, RNA-seq, and miRNA-seq data are available at [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html)[cite: 109, 536].

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
- [cite_start]Visit [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html) [cite: 536]
- Download the demo datasets for:
  - CLASH data
  - RNA-seq data
  - miRNA-seq data
  - Differentially expressed genes (.csv)

**Run Instructions**
`clashub.py` is not meant to be run directly by users. [cite_start]It powers the backend of the CLASHub web platform[cite: 424].

## 3. Instructions for Use

[cite_start]Users are encouraged to use the CLASHub Web Platform to upload their own datasets and perform analysis[cite: 203]. The Python backend (including `clashub.py`) handles:

- [cite_start]CLASH chimeric read processing [cite: 438] 
- [cite_start]RNA-seq and miRNA-seq normalization [cite: 133, 479] 
- [cite_start]Differential expression analysis [cite: 136] 
- [cite_start]Plotting and cumulative distribution analysis [cite: 144] 

[cite_start]The web-based interface dynamically passes uploaded files to the backend for automated processing[cite: 106]. [cite_start]The backend pipeline consists of modular functions implemented in `clashub.py`, and utilizes a variety of bioinformatics tools, listed with versions below[cite: 108].

---

### 🧪 Software and Tools Used

- [cite_start]**Python Backend**: `clashub.py` (custom, maintained on GitHub: https://github.com/UF-Xie-Lab/CLASHub) [cite: 108, 531]
- [cite_start]**Adapter Trimming**: `cutadapt` v2.10 [cite: 113, 425]  
- [cite_start]**Read Merging**: `PEAR` v0.9.6 [cite: 113, 426]  
- [cite_start]**Redundancy Collapse**: `fastx_collapser` v0.0.14 [cite: 113, 426]  
- [cite_start]**Hybrid Identification**: `hyb` (Travis et al. 2014) [cite: 117, 428]
- [cite_start]**Alignment**: `bowtie2` v2.5.3 [cite: 117, 428][cite_start], `HISAT2` v2.2.1 [cite: 132, 490]
- [cite_start]**Sequence Repair**: `repair.sh` (BBMap suite) [cite: 733]
- [cite_start]**Peak Calling**: `Piranha` v1.2.1 [cite: 435, 708]
- [cite_start]**Genome Coverage & Format Conversion**: `BEDTools` v2.31.1 [cite: 431, 707][cite_start], `bedGraphToBigWig` v2.10 [cite: 432, 708]
- [cite_start]**Quality Control**: `RSeQC` (read_distribution.py) [cite: 740]
- [cite_start]**Transcript Quantification**: `StringTie` v2.2.1 [cite: 133, 492]
- [cite_start]**Differential Expression**: `DESeq2` v1.44 (via R) [cite: 136, 496]
- [cite_start]**Conservation Scoring**: `phyloP` (via UCSC genome browser tracks) [cite: 170, 444]
- [cite_start]**Free Energy Calculation**: `UNAfold` v3.8 [cite: 429]
- [cite_start]**miRNA Reference**: miRBase Release 22.1 [cite: 117, 428]
- [cite_start]**Genome Reference**: Ensembl (e.g., GRCh38, GRCm39, BDGP6, WBcel235) [cite: 117, 428]

---

## 4. How is CLASH data analyzed in CLASHub?

### Step 1: Data Upload and Input
- [cite_start]**Accepts**: Paired-end FASTQ (.gz) or Cleaned single-end FASTA (.gz) [cite: 112, 424]  
- **Required inputs**:
  - [cite_start]Adapter sequences [cite: 113, 425]  
  - [cite_start]Target species [cite: 105, 254]  
  - [cite_start]Output file name [cite: 105, 254]  
  - [cite_start]Email address for notification [cite: 106, 254]  
- [cite_start]**UMI Configuration**: Users can specify 5′ and 3′ UMI lengths[cite: 114, 426]. [cite_start]If both UMI lengths are set to zero, the deduplication and UMI-trimming steps are bypassed[cite: 115, 427].

### Step 2: Data Preprocessing
- [cite_start]**Adapter Trimming**: `cutadapt` [cite: 113, 425]
- [cite_start]**Read Merging**: `PEAR` (for paired-end reads) [cite: 113, 426]
- [cite_start]**Redundancy Collapse**: `fastx_collapser` (skipped if UMIs are 0) [cite: 115, 427]
- [cite_start]**UMI Trimming**: via `cutadapt` [cite: 115, 426]

### Step 3: Genome Mapping & Peak Calling
- [cite_start]**Downsampling**: To prevent memory overload, input files exceeding 20 million reads are downsampled prior to mapping[cite: 703, 704].
- [cite_start]**Alignment**: Reads are aligned to the genome using `HISAT2` and sorted with `SAMtools`[cite: 430, 707].
- [cite_start]**Peak Calling**: `Piranha` is used for peak-calling to assess target site confidence[cite: 435, 708].
- [cite_start]**Visualization**: BigWig files are generated for genome-browser visualization (e.g., in IGV)[cite: 433, 708].

### Step 4: Hybrid Identification
- [cite_start]**Tool**: `hyb` (Travis et al.) [cite: 117, 428]
- [cite_start]**Aligner**: `bowtie2` [cite: 117, 428]
- [cite_start]**Reference DB**: Ensembl transcripts + miRBase mature miRNAs [cite: 117, 428]
- [cite_start]**Stability**: ΔG and base-pairing patterns calculated via `UNAfold` [cite: 429]

### Step 5: Conservation Score & Site Classification
- [cite_start]**Conservation**: Calculated using `phyloP` tracks per species (e.g., `g38.phyloP100way`, `mm39.phyloP35way`)[cite: 515].
- [cite_start]**Types**: Offset 6mer, 6mer, 7mer-A1, 7mer-m8, 8mer[cite: 78, 512].

### Step 6: Output Results
- [cite_start]Summary HTML report [cite: 120]  
- [cite_start]Comprehensive table with detailed columns including Piranha Peak p-values [cite: 120, 437]
- [cite_start]Normalized hybrid abundance across conditions [cite: 80]  

---

## 5. How is AQ-miRNA-seq data analyzed in CLASHub?

### Step 1: Upload
- [cite_start]**Accepted formats**: Paired-end FASTQ, Single-end FASTQ, Cleaned FASTA [cite: 122]  
- [cite_start]**Input**: adapter sequences, output file name, species, email [cite: 299]  
- [cite_start]**UMI Configuration**: Specify 5′ and 3′ lengths[cite: 124, 473]. [cite_start]Setting lengths to zero (for standard kits without UMIs) will automatically skip deduplication[cite: 126, 476].

### Step 2: Preprocessing
- [cite_start]**Adapter trimming**: `cutadapt` [cite: 472]
- [cite_start]**Read merging (if paired-end)**: `PEAR` [cite: 472]
- [cite_start]**Collapse & UMI trimming**: `fastx_collapser` and `cutadapt` (skipped if UMIs = 0) [cite: 474, 477]

### Step 3: miRNA Quantification
- [cite_start]**Mapping**: The first 18 nucleotides of each read are perfectly matched to mature miRNA sequences from miRBase[cite: 127, 479].
- [cite_start]**Expression**: Total miRNA levels and isoform-specific abundances are calculated[cite: 127, 479].

### Step 4: Output
- [cite_start]Total expression table [cite: 128]  
- [cite_start]Isoform table [cite: 128]  
- [cite_start]Summary HTML report [cite: 129, 483]  

---

## 6. How is RNA-seq data analyzed in CLASHub?

### Step 1: Upload & Configuration
- [cite_start]**Format**: Paired-end FASTQ (.gz) [cite: 131, 487]  
- [cite_start]**Inputs**: adapter sequences, species, output file name, email [cite: 306]  
- [cite_start]**Library Configuration**: Specify Library Type (stranded or unstranded)[cite: 306, 491].
- [cite_start]**Analysis Options**: Users can optionally enable Exon-Intron Split Analysis (EISA)[cite: 138, 497].

### Step 2: Preprocessing & QC
- [cite_start]**Auto-Repair**: Broken paired-end reads are automatically checked and repaired using `repair.sh`[cite: 733].
- [cite_start]**Adapter trimming**: `cutadapt` [cite: 487]
- [cite_start]**Alignment**: `HISAT2` to Ensembl genome [cite: 490]
- [cite_start]**Quality Check**: `RSeQC` is used to run read distribution for quality checks[cite: 740].

### Step 3: Expression Quantification
- [cite_start]**Standard**: `StringTie` generates TPM values[cite: 133, 492].
- [cite_start]**EISA (Optional)**: `StringTie` calculates coverage separately using customized Exon-only and Intron-only GTF files[cite: 501, 744].

### Step 4: Differential Expression
- [cite_start]**Raw count generation**: `prepDE.py3` [cite: 133, 495]
- [cite_start]**DE analysis**: `DESeq2` (via R) [cite: 136, 496]

### Step 5: Output
- [cite_start]TPM and Raw count tables [cite: 137]  
- [cite_start]DESeq2 DE results [cite: 137]  
- [cite_start]HTML summary report [cite: 137, 507]  
- [cite_start]EISA classification tables (if enabled) [cite: 504, 762]

---

## 7. How is cumulative fraction curve analysis performed in CLASHub?

### Step 1: Input
- [cite_start]**Required file**: CSV with `GeneName`, `BaseMean`, `log2FoldChange`[cite: 142, 521].
- [cite_start]**Additional**: species, miRNA name, base mean threshold (default: 100)[cite: 143, 522].

### Step 2: Target Grouping & Filtering
- [cite_start]Targets are classified via CLASH-derived datasets and TargetScan-derived predictions[cite: 144, 521].
- **Analysis Modes**: 
  - [cite_start]*Standard Analysis*: Groups targets by broad conservation status[cite: 145, 523].
  - [cite_start]*Stringent Filtering*: Selects the top 25% of predicted targets based on TargetScan Context++ scores for higher efficacy[cite: 145, 524].

### Step 3: Curve Generation
- [cite_start]Compares fold change distribution between target and non-target genes[cite: 141, 526].
- [cite_start]Statistical significance is determined using two-sided Mann–Whitney U tests[cite: 150, 527].

### Step 4: Output
- [cite_start]Cumulative fraction curve plots (SVG format) [cite: 768]
- [cite_start]Detailed merged targets dataset (CSV format) [cite: 768]

---

## 8. Reproducing Results from the Manuscript (Optional)

[cite_start]The analysis described in the manuscript was performed using CLASHub's web platform and backend pipeline (`clashub.py`)[cite: 468, 529]. To reproduce the quantitative results:

1. [cite_start]Download demo or raw datasets from: [https://clashub.rc.ufl.edu/Analyzer.html](https://clashub.rc.ufl.edu/Analyzer.html) [cite: 536]
2. Follow the usage instructions in Sections 3–7 of this README to run:
   - CLASH hybrid identification
   - RNA-seq differential analysis
   - AQ-miRNA-seq quantification
   - Cumulative fraction curve analysis
3. Use the output `.csv` files to recreate figures as described in the manuscript.
