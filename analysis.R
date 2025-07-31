# Get the JobID from the command line arguments
args <- commandArgs(trailingOnly = TRUE)
jobID <- args[1]

setwd(file.path("/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/", jobID)) 
getwd()
library(DESeq2) 
library(pheatmap)
library(ggplot2)

counts <- read.csv("gene_count_reordered.csv", row.names=1, check.names=FALSE)
coldata <- read.csv("coldata_SampleName.csv", row.names=1, check.names=FALSE)

# Create DESeq2 dataset
counts[is.na(counts)] <- 0
dds <- DESeqDataSetFromMatrix(countData = counts, colData = coldata, design = ~ condition)

# Perform differential expression analysis
dds <- DESeq(dds)
# Extract results 
res <- results(dds) 
# Order results by adjusted p-value
resOrdered <- res[order(res$padj), ]

# Convert to data frame
resOrderedDF <- as.data.frame(resOrdered)

# Reset row names to a column named 'GeneID'
resOrderedDF$GeneID <- rownames(resOrderedDF)

# Reorder columns to place 'GeneID' at the beginning
resOrderedDF <- resOrderedDF[, c("GeneID", setdiff(names(resOrderedDF), "GeneID"))]

# Print top 10 rows before writing to CSV
print(head(resOrderedDF, 10))

# Write to CSV without row names since 'GeneID' is now a column
write.csv(resOrderedDF, file='differential_expression_results.csv', row.names=FALSE, col.names=TRUE)