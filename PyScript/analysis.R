# Get the working directory from the command line arguments
args <- commandArgs(trailingOnly = TRUE)
working_dir <- args[1]
if (is.na(working_dir)) {stop("Error: No working directory provided provided in arguments.")}
setwd(working_dir)
print(paste("R Current working directory is now:", getwd()))
library(DESeq2) 
library(pheatmap)
library(ggplot2)

if (!file.exists("coldata_SampleName.csv")) {
    stop("Error: coldata_SampleName.csv not found!")
}
coldata <- read.csv("coldata_SampleName.csv", row.names=1, check.names=FALSE)

run_deseq_analysis <- function(input_csv, coldata, output_prefix) {
    
    print(paste("--> Starting analysis for:", input_csv))
    
    if (!file.exists(input_csv)) {
        print(paste("Skipping:", input_csv, "File not found."))
        return(NULL)
    }
    counts_raw <- read.csv(input_csv, row.names=1, check.names=FALSE)
    
    if ("Combined" %in% colnames(counts_raw)) {
        counts <- counts_raw[, !(names(counts_raw) %in% c("Combined"))]
        gene_annotations <- counts_raw[, "Combined", drop=FALSE]
    } else {
        counts <- counts_raw
        gene_annotations <- NULL
    }
    
    print("--- [DEBUG 1] Raw Counts Peek (Top 3 rows) ---")
    num_samples_to_show <- min(ncol(counts), 5) 
    print(head(counts[, 1:num_samples_to_show], 3))
    print("----------------------------------------------")

    common_samples <- intersect(rownames(coldata), colnames(counts))
    if (length(common_samples) == 0) {
        stop(paste("Error: No matching samples between coldata and", input_csv))
    }
    
    counts <- counts[, common_samples]
    coldata_subset <- coldata[common_samples, , drop=FALSE]
    
    print("--- [DEBUG 2] Sample Alignment Check ---")
    alignment_table <- data.frame(
        Coldata_RowNames = rownames(coldata_subset),
        Counts_ColNames  = colnames(counts),
        Condition_Group  = coldata_subset$condition,
        Is_Match         = (rownames(coldata_subset) == colnames(counts))
    )
    print(alignment_table)
    
    if (!all(alignment_table$Is_Match)) {
        stop("CRITICAL ERROR: Sample names mismatch! Please check your inputs.")
    }
    print("----------------------------------------")

    counts <- as.matrix(counts)
    counts[is.na(counts)] <- 0
    
    dds <- DESeqDataSetFromMatrix(countData = counts, colData = coldata_subset, design = ~ condition)
    
    keep <- rowMeans(counts(dds)) >= 24
    dds <- dds[keep, ]
    
    if ("control" %in% levels(dds$condition)) {
        dds$condition <- relevel(dds$condition, ref = "control")
        print("--- [DEBUG 3] Reference level set to: 'control' ---")
    } else {
        print(paste("--- [DEBUG 3] Warning: 'control' group not found. Using first level as ref:", levels(dds$condition)[1], "---"))
    }
    print(paste("Comparison will be:", paste(levels(dds$condition)[2:length(levels(dds$condition))], collapse=" vs "), "vs", levels(dds$condition)[1]))
    print("--------------------------------------------------")

    dds <- DESeq(dds)
    res <- results(dds)
    
    resDF <- as.data.frame(res)
    resDF$GeneID <- rownames(resDF)
    
    if (!is.null(gene_annotations)) {
        resDF <- merge(resDF, gene_annotations, by.x="GeneID", by.y="row.names", all.x=TRUE)
    }
    
    resDF <- resDF[order(resDF$padj), ]
    
    output_filename <- paste0(output_prefix, "_results.csv")
    write.csv(resDF, file=output_filename, row.names=FALSE)
    print(paste("Saved results to:", output_filename))
    
    return(resDF)
}

# 1.  Standard Analysis
print("=== Running Standard Analysis ===")
res_standard <- run_deseq_analysis("gene_count_matrix.csv", coldata, "differential_expression")

# 2.  EISA Analysis
eisa_exon_file <- "gene_count_eisa_exon_matrix.csv"
eisa_intron_file <- "gene_count_eisa_intron_matrix.csv"

if (file.exists(eisa_exon_file) && file.exists(eisa_intron_file)) {
    print("=== Running EISA Analysis ===")
    res_exon <- run_deseq_analysis(eisa_exon_file, coldata, "eisa_exon_temp")
    res_intron <- run_deseq_analysis(eisa_intron_file, coldata, "eisa_intron_temp")
    
    if (!is.null(res_exon) && !is.null(res_intron)) {
        cols_to_keep <- c("GeneID", "log2FoldChange", "padj", "baseMean")
        cols_for_exon <- cols_to_keep
        if ("Combined" %in% colnames(res_exon)) {
            cols_for_exon <- c(cols_to_keep, "Combined")
        }
        
        eisa_merged <- merge(
            res_exon[, cols_for_exon],  # 动态选择列
            res_intron[, cols_to_keep], 
            by="GeneID", 
            suffixes=c("_Exon", "_Intron")
        )

        eisa_merged$EISA_Score <- eisa_merged$log2FoldChange_Exon - eisa_merged$log2FoldChange_Intron
        
        eisa_merged$Regulation_Type <- "Ambiguous"

        threshold <- 1 
        
        eisa_merged$Regulation_Type[eisa_merged$EISA_Score > threshold] <- "Post-transcriptional (Up)"
        eisa_merged$Regulation_Type[eisa_merged$EISA_Score < -threshold] <- "Post-transcriptional (Down)"
        
        sig_idx <- which(eisa_merged$padj_Exon < 0.05 & eisa_merged$padj_Intron < 0.05 & abs(eisa_merged$EISA_Score) < threshold)
        eisa_merged$Regulation_Type[sig_idx] <- "Transcriptional"

        eisa_merged <- eisa_merged[order(abs(eisa_merged$EISA_Score), decreasing = TRUE), ]
        
        final_cols <- c("GeneID", "EISA_Score", "Regulation_Type", 
                        "log2FoldChange_Exon", "padj_Exon", 
                        "log2FoldChange_Intron", "padj_Intron", 
                        "Combined")
        
        final_cols <- intersect(final_cols, names(eisa_merged))
        eisa_final <- eisa_merged[, final_cols]
        
        write.csv(eisa_final, file="EISA_analysis_results.csv", row.names=FALSE)
        print("Success: EISA_analysis_results.csv generated.")
        
    }
} else {
    print("EISA files not found, skipping EISA calculation.")
}

print("All R analysis done.")