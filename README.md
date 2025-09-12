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


