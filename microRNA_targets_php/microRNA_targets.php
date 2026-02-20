<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
header("Content-Type: text/html; charset=utf-8");

require('../db.php');

if (!function_exists('normalizeBasePattern')) {
    function normalizeBasePattern($pattern) {
        if ($pattern === null) { return ''; }
        $pattern = (string)$pattern;
        if ($pattern === '') { return ''; }
        // Force first character to be a space to reflect that the first base does not pair
        $first = substr($pattern, 0, 1);
        if ($first === '|' || $first === '.' || $first === ' ') {
            return ' ' . substr($pattern, 1);
        }
        return $pattern;
    }
}

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("DB Connection failed: " . $conn->connect_error);
    die("Connection failed. Please try again later.");
}
$searchTerm = isset($_GET['index_CLASH_name']) ? $_GET['index_CLASH_name'] : '';
$siteType = isset($_GET['site_type']) ? $_GET['site_type'] : '';
$indexSpecies = isset($_GET['CLASH_CellLine']) ? $_GET['CLASH_CellLine'] : '';

// --- SECURITY: Allowed Table Names (Whitelist) ---
$allowed_tables = [
    'CLASH_Human_Consensus_Final',
    'CLASH_Mouse_Consensus_Final',
    'CLASH_human_HEK293T_Expanded',
    'CLASH_human_A549_Expanded',
    'CLASH_human_501Mel_Expanded',
    'CLASH_human_Colorectal_tissue',
    'CLASH_human_D425_Expanded',
    'CLASH_human_ES2_Expanded',
    'CLASH_human_H1299_Expanded',
    'CLASH_human_HCT116',
    'CLASH_human_HepG2_Expanded',
    'CLASH_human_MB002_Expanded',
    'CLASH_human_MDAMB231_Expanded',
    'CLASH_human_Ovcar8_Expanded',
    'CLASH_human_T98G_Expanded',
    'CLASH_human_TIVE',
    'CLASH_human_U87MG_Expanded',
    'CLASH_mouse_3T12',
    'CLASH_mouse_Cortex',
    'CLASH_mouse_HE2_1B',
    'CLASH_mouse_Heart_Expanded',
    'CLASH_mouse_Kidney_Expanded',
    'CLASH_mouse_MEF_Expanded',
    'CLASH_mouse_Striatal_Cell_Expanded',
    'CLASH_Drosophila_S2_Expanded',
    'CLASH_Celegans_Consensus_Final',
    'CLASH_Celegans_Embryo_Expanded',
    'CLASH_Celegans_L4_Expanded'
];

// If the table name is missing or NOT in our safe list, stop everything.
if (empty($indexSpecies) || !in_array($indexSpecies, $allowed_tables)) {
    header("HTTP/1.1 403 Forbidden");
    die("Error: Access Denied. The requested data source is not authorized.");
}

$baseSql = "FROM $indexSpecies";
$whereClauses = [];

if (!empty($searchTerm)) {
    $variants = [
        $searchTerm,
        'hsa-' . $searchTerm,
        'mmu-' . $searchTerm,
        'dme-' . $searchTerm,
        'cel-' . $searchTerm,
        $searchTerm,
        $searchTerm
    ];

    $whereClauses[] = "(
        miRNA_name = ? OR 
        miRNA_name = ? OR 
        miRNA_name = ? OR 
        miRNA_name = ? OR 
        miRNA_name = ? OR 
        Gene_name = ? OR 
        Gene_ID = ?
    )";
}

if (!empty($siteType)) {
    $siteTypeEscaped = $conn->real_escape_string($siteType);
    $whereClauses[] = "site_type = '$siteTypeEscaped'";
}

if (!empty($whereClauses)) {
    $baseSql .= " WHERE " . implode(" AND ", $whereClauses);
}

$sql = "SELECT * $baseSql";
$stmt = $conn->prepare($sql);

if (!empty($searchTerm)) {
    $stmt->bind_param('sssssss', ...$variants);
}

$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    error_log("Query failed: " . $conn->error);
    die("An error occurred while retrieving data. Please try again later.");
}
// 设置表头和表行，基于选择的 species
$tableHeaders = "";
$tableRows = "";

// Define region display mapping once for all tables
$regionDisplayMap = [
    '5UTR' => "5' UTR",
    'CDS' => "CDS",
    '3UTR' => "3' UTR",
    '5UTR_CDS' => "5' UTR/CDS",
    '3UTR_CDS' => "3' UTR/CDS",
    'intron' => "Intron",
    '3UTR_5UTR_CDS' => "5' UTR/CDS/3' UTR",
];

$tablesWithFullExp = [
    'CLASH_human_HEK293T_Expanded', 
    'CLASH_human_A549_Expanded'
];

// 2. Tables with ONLY Gene (WT) Expression columns
$tablesWithGeneExpOnly = [
    'CLASH_human_501Mel_Expanded', 
    'CLASH_human_D425_Expanded', 
    'CLASH_human_ES2_Expanded', 
    'CLASH_human_HepG2_Expanded', 
    'CLASH_human_H1299_Expanded', 
    'CLASH_human_MB002_Expanded', 
    'CLASH_human_MDAMB231_Expanded', 
    'CLASH_human_Ovcar8_Expanded', 
    'CLASH_human_T98G_Expanded', 
    'CLASH_human_U87MG_Expanded'
];

// Helper flags for the current table
$hasFullExp = in_array($indexSpecies, $tablesWithFullExp);
$hasGeneExpOnly = in_array($indexSpecies, $tablesWithGeneExpOnly);

// Reusable Header HTML
$headerMiRNA_WT = "<th data-column='miRNA_Exp_sgNT_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from sgNT (Control) miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(sgNT CPM)</span></th>";
$headerMiRNA_KO = "<th data-column='miRNA_Exp_zs8_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from sgZSWIM8 (KO) miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(sgZ8 CPM)</span></th>";
$headerGene_WT  = "<th data-column='Gene_Exp_WT_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Wild Type RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(WT TPM)</span></th>";


// =======================================================
// GROUP: ALL HUMAN CONSENSUS (The Summary Table)
// =======================================================
if ($indexSpecies == 'CLASH_Human_Consensus_Final') {

    // 1. Define Headers
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold)</th>
    <th data-column='gene_name'>Gene Name</th>

    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th> 
    <th data-column='gene_type'>Gene Type</th>
    
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='total_cell_lines'>Total Cell Lines <br><span style='font-size:0.85em; font-weight:normal;'>Out of 15 Tissues/Lines</span></th>
    <th data-column='cell_line_names'>Specific Cell Lines <br><span style='font-size:0.85em; font-weight:normal;'>(Click to view details)</span></th>
    </tr>";

    // 2. Define the Map (Short Name -> Real Table Name)
    // This is crucial for the links to work!
    $cellMap = [
        '501Mel'     => 'CLASH_human_501Mel_Expanded',
        'A549'       => 'CLASH_human_A549_Expanded',
        'Colorectal_tissue' => 'CLASH_human_Colorectal_tissue',
        'D425'       => 'CLASH_human_D425_Expanded',
        'ES2'        => 'CLASH_human_ES2_Expanded',
        'H1299'      => 'CLASH_human_H1299_Expanded',
        'HCT116'     => 'CLASH_human_HCT116',
        'HEK293T'    => 'CLASH_human_HEK293T_Expanded',
        'HepG2'      => 'CLASH_human_HepG2_Expanded',
        'MB002'      => 'CLASH_human_MB002_Expanded',
        'MDA-MB-231' => 'CLASH_human_MDAMB231_Expanded',
        'Ovcar8'     => 'CLASH_human_Ovcar8_Expanded',
        'T98G'       => 'CLASH_human_T98G_Expanded',
        'TIVE'       => 'CLASH_human_TIVE',
        'U87MG'      => 'CLASH_human_U87MG_Expanded'
    ];

    // 3. Build Rows
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            
            // Standard Columns
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";

            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>"; // INSERTED
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";

            // Region Mapping (reusing your existing map)
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";

            // Genome Position (Link to UCSC)
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (!empty($genomePos) && strpos($genomePos, ':') !== false) {
                $parts = explode(':', $genomePos);
                $chr = $parts[0];
                // Remove commas from the range part to ensure math works (e.g. "1,000" -> "1000")
                $cleanRangePart = str_replace(',', '', $parts[1]);
                $range = explode('-', $cleanRangePart);
                
                if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                    // Use +/- 100 padding to match other tables
                    $newStart = max(0, $range[0] - 100);
                    $newEnd   = $range[1] + 100;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                } else { 
                    // Fallback for complex ranges
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=" . urlencode($genomePos);
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                }
            } else { $tableRows .= htmlspecialchars($genomePos); }
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";

            // --- THE NEW COLUMNS ---
            
            // 1. Total Count
            $count = htmlspecialchars($row['total_cell_lines'] ?? '0');
            // Make high numbers stand out
            $style = ($count >= 5) ? "font-weight:bold; color:#d9534f;" : ""; 
            $tableRows .= "<td style='text-align:center; {$style}'>" . $count . "</td>";

            // 2. Clickable Cell Line Links
            $cellListStr = $row['cell_line_names'] ?? '';
            $cellArray = explode(', ', $cellListStr);
            $linksArray = [];

            foreach($cellArray as $shortName) {
                $shortName = trim($shortName);
                if(isset($cellMap[$shortName])) {
                    $realTable = $cellMap[$shortName];
                    $currentSearch = urlencode($searchTerm);
                    $displayName = str_replace('_', ' ', $shortName);
                    $url = "microRNA_targets.html?index_CLASH_name={$currentSearch}&CLASH_CellLine=" . urlencode($realTable) . "&CLASH_CellLine_text=" . urlencode($shortName);


                    $linksArray[] = "<a href='{$url}' class='cell-link' target='_blank' style='text-decoration:underline; color:#0066cc;'>{$displayName}</a>";
                } else {
                    $displayName = str_replace('_', ' ', $shortName);  // ← also fix fallback display
                    $linksArray[] = $displayName;
                }
            }

            $tableRows .= "<td>" . implode(", ", $linksArray) . "</td>";
            
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='12'>No results found in any human cell line.</td></tr>";
    }

// =======================================================
// GROUP 1: Single Condition (WT / Tissue)
// =======================================================
} elseif  (in_array($indexSpecies, [
    'CLASH_human_HEK293T_Expanded', 
    'CLASH_human_Colorectal_tissue', 
    'CLASH_human_D425_Expanded', 
    'CLASH_human_HepG2_Expanded', 
    'CLASH_human_TIVE'
])) {
    
    // 1. Initialize Defaults
    $col_occur = 'WT_Detected_3'; 
    $col_abund = 'WT_Mean_CPM';
    $label_count = '(3 datasets)'; 
    $extraHeaders = "";

    // 2. Customize per Cell Line
    if ($indexSpecies == 'CLASH_human_HEK293T_Expanded') {
        $col_occur = 'WT_Detected_8';
        $label_count = '(8 datasets)';
        $extraHeaders .= $headerMiRNA_WT . $headerMiRNA_KO . $headerGene_WT;

    } elseif ($indexSpecies == 'CLASH_human_Colorectal_tissue') {
        $col_occur = 'Colorectal_tissue_Detected_2';
        $col_abund = 'Colorectal_tissue_Mean_CPM';
        $label_count = '(2 datasets)';
        
    } elseif ($hasGeneExpOnly) {
        // Covers D425 and HepG2
        $extraHeaders .= $headerGene_WT;
    }
    
    // 3. Set Table Headers
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='{$col_occur}'>Hybrid Occurrence <br><span style='font-size:0.85em; font-weight:normal;'>{$label_count}</span></th>
    <th data-column='{$col_abund}'>Hybrid CPM <br><span style='font-size:0.85em; font-weight:normal;'>(Normalized)</span></th>
    {$extraHeaders}
    </tr>";

    // 4. Rows
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_occur] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_abund] ?? '') . "</td>";
            
            // --- DYNAMIC EXTRA COLUMNS ---
            if ($hasFullExp) {
                $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_sgNT_CPM'] ?? '-') . "</td>";
                $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_zs8_CPM'] ?? '-') . "</td>";
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            } elseif ($hasGeneExpOnly) {
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            }
            
            $tableRows .= "</tr>";
        }
    } else {
        $colspan = ($hasFullExp) ? 15 : (($hasGeneExpOnly) ? 13 : 12);
        $tableRows .= "<tr><td colspan='{$colspan}'>No results found.</td></tr>";
    }

// =======================================================
// GROUP 2: Control vs ZSWIM8 KO
// =======================================================
} elseif (in_array($indexSpecies, [
    'CLASH_human_501Mel_Expanded', 'CLASH_human_ES2_Expanded', 'CLASH_human_H1299_Expanded', 
    'CLASH_human_HCT116', 'CLASH_human_MB002_Expanded', 'CLASH_human_Ovcar8_Expanded', 
    'CLASH_human_T98G_Expanded', 'CLASH_human_U87MG_Expanded'
])) {
    // 1. Defaults
    $col_wt_count = 'Control_Detected_3'; 
    $col_ko_count = 'ZSWIM8_KO_Detected_3';
    $label_wt = '3 datasets';
    $label_ko = '3 datasets';
    $extraHeaders = "";
    
    // 2. Custom Exceptions
    if ($indexSpecies == 'CLASH_human_HCT116') {
        $col_wt_count = 'Control_Detected_5';
        $label_wt = '5 datasets';
    } elseif ($indexSpecies == 'CLASH_human_MB002_Expanded') {
        $col_wt_count = 'Control_Detected_4';
        $col_ko_count = 'ZSWIM8_KO_Detected_4';
        $label_wt = '4 datasets';
        $label_ko = '4 datasets';
    }

    // 3. Add Gene Exp Header for Expanded tables
    if ($hasGeneExpOnly) {
        $extraHeaders .= $headerGene_WT;
    }

    // 4. Headers
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='{$col_wt_count}'>Control <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>({$label_wt})</span></th>
    <th data-column='Control_Mean_CPM'>Control <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    
    <th data-column='{$col_ko_count}'>ZSWIM8 KO <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>({$label_ko})</span></th>
    <th data-column='ZSWIM8_KO_Mean_CPM'>ZSWIM8 KO <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    {$extraHeaders}
    </tr>";

    // 5. Rows
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_wt_count] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Control_Mean_CPM'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_ko_count] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['ZSWIM8_KO_Mean_CPM'] ?? '') . "</td>";
            
            // --- DYNAMIC EXTRA COLUMN ---
            if ($hasGeneExpOnly) {
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            }
            $tableRows .= "</tr>";
        }
    } else {
        $colspan = ($hasGeneExpOnly) ? 15 : 14;
        $tableRows .= "<tr><td colspan='{$colspan}'>No results found.</td></tr>";
    }

// =======================================================
// GROUP 3: Complex Tables (qCLASH + Chimeric eCLIP)
// =======================================================
} elseif (in_array($indexSpecies, ['CLASH_human_A549_Expanded', 'CLASH_human_MDAMB231_Expanded'])) {
    
    $extraHeaders = "";
    
    // A549 now has Full Data (miRNA + Gene)
    if ($hasFullExp) {
        $extraHeaders .= $headerMiRNA_WT . $headerMiRNA_KO . $headerGene_WT;
    } 
    // MDA-MB-231 has Gene Data Only
    elseif ($hasGeneExpOnly) {
        $extraHeaders .= $headerGene_WT;
    }

    // UPDATED HEADERS: Added "(3 datasets)" to qCLASH and eCLIP columns to match other tables
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='qCLASH_Control_Detected_3' style='background-color:#f0f8ff;'>qCLASH Control<br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='qCLASH_Control_Mean_CPM' style='background-color:#f0f8ff;'>qCLASH Control<br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    <th data-column='qCLASH_ZSWIM8_KO_Detected_3' style='background-color:#e6f3ff;'>qCLASH KO<br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='qCLASH_ZSWIM8_KO_Mean_CPM' style='background-color:#e6f3ff;'>qCLASH KO<br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    
    <th data-column='Chimeric_eCLIP_Control_Detected_3' style='background-color:#fff0f5;'>Chimeric eCLIP Control<br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='Chimeric_eCLIP_Control_Mean_CPM' style='background-color:#fff0f5;'>Chimeric eCLIP Control<br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    <th data-column='Chimeric_eCLIP_KO_Detected_3' style='background-color:#ffe6eb;'>Chimeric eCLIP KO<br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='Chimeric_eCLIP_KO_Mean_CPM' style='background-color:#ffe6eb;'>Chimeric eCLIP KO<br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    {$extraHeaders}
    </tr>";

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            
            // --- qCLASH Data ---
            $tableRows .= "<td>" . htmlspecialchars($row['qCLASH_Control_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['qCLASH_Control_Mean_CPM'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['qCLASH_ZSWIM8_KO_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['qCLASH_ZSWIM8_KO_Mean_CPM'] ?? '') . "</td>";
            
            // --- eCLIP Data ---
            $tableRows .= "<td>" . htmlspecialchars($row['Chimeric_eCLIP_Control_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Chimeric_eCLIP_Control_Mean_CPM'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Chimeric_eCLIP_KO_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Chimeric_eCLIP_KO_Mean_CPM'] ?? '') . "</td>";
            
            // --- DYNAMIC EXTRA COLUMNS ---
            if ($hasFullExp) {
                $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_sgNT_CPM'] ?? '-') . "</td>";
                $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_zs8_CPM'] ?? '-') . "</td>";
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            } elseif ($hasGeneExpOnly) {
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            }
            
            $tableRows .= "</tr>";
        }
    } else {
        $colspan = ($hasFullExp) ? 21 : (($hasGeneExpOnly) ? 19 : 18);
        $tableRows .= "<tr><td colspan='{$colspan}'>No results found.</td></tr>";
    }

// =======================================================
// GROUP: ALL MOUSE CONSENSUS (The Summary Table)
// =======================================================
} elseif ($indexSpecies == 'CLASH_Mouse_Consensus_Final') {

    // 1. Define Headers
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold)</th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>

    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th> 
    <th data-column='gene_type'>Gene Type</th>

    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='total_cell_lines'>Total Tissues/Lines <br><span style='font-size:0.85em; font-weight:normal;'>Out of 7 Tissues/Lines</span></th>
    <th data-column='cell_line_names'>Specific Tissues/Lines <br><span style='font-size:0.85em; font-weight:normal;'>(Click to view details)</span></th>
    </tr>";

    // 2. Define the Mouse Map (Table Name Mapping)
    $mouseCellMap = [
        '3T12'          => 'CLASH_mouse_3T12',
        'Cortex'        => 'CLASH_mouse_Cortex',
        'HE2_1B'        => 'CLASH_mouse_HE2_1B',
        'Heart'         => 'CLASH_mouse_Heart_Expanded',
        'Kidney'        => 'CLASH_mouse_Kidney_Expanded',
        'MEF'           => 'CLASH_mouse_MEF_Expanded',
        'Striatal Cell' => 'CLASH_mouse_Striatal_Cell_Expanded'
    ];

    // 3. Build Rows
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>"; // INSERTED
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";

            // Genome Position (Link to UCSC mm39)
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (!empty($genomePos) && strpos($genomePos, ':') !== false) {
                $parts = explode(':', $genomePos);
                $chr = $parts[0];
                $cleanRangePart = str_replace(',', '', $parts[1]); 
                $range = explode('-', $cleanRangePart);
                
                if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                    $newStart = max(0, $range[0] - 100);
                    $newEnd   = $range[1] + 100;
                    // Note: db=mm39
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                } else {
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&position=" . urlencode($genomePos);
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                }
            } else { $tableRows .= htmlspecialchars($genomePos); }
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";

            // Total Count Column
            $count = htmlspecialchars($row['total_cell_lines'] ?? '0');
            $style = ($count >= 3) ? "font-weight:bold; color:#d9534f;" : ""; 
            $tableRows .= "<td style='text-align:center; {$style}'>" . $count . "</td>";

            // Clickable Links for Mouse
            $cellListStr = $row['cell_line_names'] ?? '';
            $cellArray = explode(', ', $cellListStr);
            $linksArray = [];
            foreach($cellArray as $shortName) {
                $shortName = trim($shortName);
                if(isset($mouseCellMap[$shortName])) {
                    $realTable = $mouseCellMap[$shortName];
                    $currentSearch = urlencode($searchTerm); 
                    $url = "microRNA_targets.html?index_CLASH_name={$currentSearch}&CLASH_CellLine=" . urlencode($realTable) . "&CLASH_CellLine_text=" . urlencode($shortName);
                    $linksArray[] = "<a href='{$url}' class='cell-link' target='_blank' style='text-decoration:underline; color:#0066cc;'>{$shortName}</a>";
                } else { $linksArray[] = $shortName; }
            }
            $tableRows .= "<td>" . implode(", ", $linksArray) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='12'>No results found in any mouse tissue.</td></tr>";
    }
// =======================================================
// GROUP 4A: MOUSE EXPANDED (Heart, Kidney, MEF)
// =======================================================
} elseif (in_array($indexSpecies, [
    'CLASH_mouse_Heart_Expanded', 
    'CLASH_mouse_Kidney_Expanded', 
    'CLASH_mouse_MEF_Expanded'
])) {
    
    // Initialize variables
    $col_clash_wt_count = ''; 
    $col_clash_wt_cpm   = '';
    $col_clash_ko_count = ''; 
    $col_clash_ko_cpm   = ''; 

    $label_clash_wt = '';
    $label_clash_ko = '';
    
    $label_count_wt = '';
    $label_count_ko = '';
    
    // Expression Tooltip Labels
    $mir_ctrl_label = 'Control';
    $mir_ko_label   = 'KO';
    $gene_ctrl_label = 'Control';
    $gene_ko_label   = 'KO';
    
    $show_gene_ko = true;

    // -----------------------------------------------------------
    // CONFIGURATION A: Heart & Kidney (Single CLASH Condition: WT)
    // -----------------------------------------------------------
    if ($indexSpecies == 'CLASH_mouse_Heart_Expanded') {
        $col_clash_wt_count = 'Heart_Detected_2';
        $col_clash_wt_cpm   = 'Heart_Mean_CPM';
        $label_clash_wt     = 'Wild Type';
        $label_count_wt     = '(2 datasets)';
        
        $mir_ctrl_label  = 'WT';
        $mir_ko_label    = 'KO';
        $gene_ctrl_label = 'Het'; 
        $gene_ko_label   = 'KO';

    } elseif ($indexSpecies == 'CLASH_mouse_Kidney_Expanded') {
        $col_clash_wt_count = 'Kidney_Detected_2';
        $col_clash_wt_cpm   = 'Kidney_Mean_CPM';
        $label_clash_wt     = 'Wild Type';
        $label_count_wt     = '(2 datasets)';
        
        $mir_ctrl_label  = 'WT';
        $mir_ko_label    = 'KO';
        $gene_ctrl_label = 'Het';
        $gene_ko_label   = 'KO';

    // -----------------------------------------------------------
    // CONFIGURATION B: MEF (Dual CLASH Condition: NT vs KO)
    // -----------------------------------------------------------
    } elseif ($indexSpecies == 'CLASH_mouse_MEF_Expanded') {
        $col_clash_wt_count = 'Control_Detected_2';
        $col_clash_wt_cpm   = 'Control_Mean_CPM';
        $col_clash_ko_count = 'ZSWIM8_KO_Detected_2';
        $col_clash_ko_cpm   = 'ZSWIM8_KO_Mean_CPM';
        
        $label_clash_wt     = 'sgNT';
        $label_clash_ko     = 'sgZ8 (KO)';
        $label_count_wt     = '(2 datasets)';
        $label_count_ko     = '(2 datasets)';
        
        $mir_ctrl_label  = 'sgNT';
        $mir_ko_label    = 'sgZ8';
        $gene_ctrl_label = 'sgNT';
        $show_gene_ko    = false; // MEF has no Gene KO column
    }

    // --- BUILD HEADERS ---
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>

    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='{$col_clash_wt_count}'>{$label_clash_wt} <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>{$label_count_wt}</span></th>
    <th data-column='{$col_clash_wt_cpm}'>{$label_clash_wt} <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>";

    if (!empty($col_clash_ko_count)) {
        $tableHeaders .= "<th data-column='{$col_clash_ko_count}'>{$label_clash_ko} <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>{$label_count_ko}</span></th>
        <th data-column='{$col_clash_ko_cpm}'>{$label_clash_ko} <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>";
    }

    $tableHeaders .= "<th data-column='miRNA_Exp_Control_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from {$mir_ctrl_label} miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$mir_ctrl_label} CPM)</span></th>
    
    <th data-column='miRNA_Exp_KO_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from {$mir_ko_label} miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$mir_ko_label} CPM)</span></th>
    
    <th data-column='Gene_Exp_Control_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from {$gene_ctrl_label} RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$gene_ctrl_label} TPM)</span></th>";
    
    if ($show_gene_ko) {
        $tableHeaders .= "<th data-column='Gene_Exp_KO_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from {$gene_ko_label} RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$gene_ko_label} TPM)</span></th>";
    }
    $tableHeaders .= "</tr>";

    // --- BUILD ROWS ---
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            
            // CLASH Data
            $tableRows .= "<td>" . htmlspecialchars($row[$col_clash_wt_count] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_clash_wt_cpm] ?? '-') . "</td>";
            
            if (!empty($col_clash_ko_count)) {
                $tableRows .= "<td>" . htmlspecialchars($row[$col_clash_ko_count] ?? '-') . "</td>";
                $tableRows .= "<td>" . htmlspecialchars($row[$col_clash_ko_cpm] ?? '-') . "</td>";
            }

            // Expression Data
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Control_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_KO_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Control_TPM'] ?? '-') . "</td>";
            
            if ($show_gene_ko) {
                $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_KO_TPM'] ?? '-') . "</td>";
            }
            
            $tableRows .= "</tr>";
        }
    } else {
        $colspan = ($show_gene_ko) ? 18 : 17;
        if (empty($col_clash_ko_count)) { $colspan -= 2; }
        $tableRows .= "<tr><td colspan='{$colspan}'>No results found.</td></tr>";
    }
// =======================================================
// GROUP 4B: MOUSE STRIATAL CELL (4 GROUPS)
// =======================================================
} elseif ($indexSpecies == 'CLASH_mouse_Striatal_Cell_Expanded') {

    // --- headers ---
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='HD_Het_sgNT_Detected_2'>Het sgNT <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(2 datasets)</span></th>
    <th data-column='HD_Het_sgNT_Mean_CPM'>Het sgNT <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    <th data-column='HD_Het_sgZ8_Detected_2'>Het sgZ8 <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(2 datasets)</span></th>
    <th data-column='HD_Het_sgZ8_Mean_CPM'>Het sgZ8 <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>

    <th data-column='HD_Hom_sgNT_Detected_2'>Hom sgNT <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(2 datasets)</span></th>
    <th data-column='HD_Hom_sgNT_Mean_CPM'>Hom sgNT <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    <th data-column='HD_Hom_sgZ8_Detected_2'>Hom sgZ8 <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(2 datasets)</span></th>
    <th data-column='HD_Hom_sgZ8_Mean_CPM'>Hom sgZ8 <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>

    <th data-column='miRNA_Exp_Het_sgNT_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Het sgNT miRNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Het sgNT CPM)</span></th>
    <th data-column='miRNA_Exp_Het_sgZ8_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Het sgZ8 miRNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Het sgZ8 CPM)</span></th>
    <th data-column='Gene_Exp_Het_sgNT_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Het sgNT RNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Het sgNT TPM)</span></th>
    <th data-column='Gene_Exp_Het_sgZ8_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Het sgZ8 RNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Het sgZ8 TPM)</span></th>

    <th data-column='miRNA_Exp_Hom_sgNT_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Hom sgNT miRNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Hom sgNT CPM)</span></th>
    <th data-column='miRNA_Exp_Hom_sgZ8_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Hom sgZ8 miRNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Hom sgZ8 CPM)</span></th>
    <th data-column='Gene_Exp_Hom_sgNT_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Hom sgNT RNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Hom sgNT TPM)</span></th>
    <th data-column='Gene_Exp_Hom_sgZ8_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Hom sgZ8 RNA-seq.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Hom sgZ8 TPM)</span></th>
    </tr>";

    // --- rows ---
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            
            // --- CLASH DATA ---
            // Het sgNT
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Het_sgNT_Detected_2'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Het_sgNT_Mean_CPM'] ?? '-') . "</td>";
            // Het sgZ8
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Het_sgZ8_Detected_2'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Het_sgZ8_Mean_CPM'] ?? '-') . "</td>";
            // Hom sgNT
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Hom_sgNT_Detected_2'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Hom_sgNT_Mean_CPM'] ?? '-') . "</td>";
            // Hom sgZ8
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Hom_sgZ8_Detected_2'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['HD_Hom_sgZ8_Mean_CPM'] ?? '-') . "</td>";

            // --- EXPRESSION DATA ---
            // Het Expression
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Het_sgNT_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Het_sgZ8_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Het_sgNT_TPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Het_sgZ8_TPM'] ?? '-') . "</td>";
            
            // Hom Expression
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Hom_sgNT_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Hom_sgZ8_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Hom_sgNT_TPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Hom_sgZ8_TPM'] ?? '-') . "</td>";
            
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='26'>No results found.</td></tr>";
    }

// =======================================================
// GROUP 5: Remaining Mouse Single Condition (HE2_1B, 3T12, Cortex)
// =======================================================
} elseif (strpos($indexSpecies, 'CLASH_mouse_') === 0) {
    // ... (Keep existing Single Condition Mouse logic) ...
    $col_occur = 'Detected_2'; 
    $col_abund = 'Mean_CPM';   
    $label_count = '(2 datasets)';

    if ($indexSpecies == 'CLASH_mouse_HE2_1B') {
        $col_occur = 'HE2_1B_Detected_6';
        $col_abund = 'HE2_1B_Mean_CPM';
        $label_count = '(6 datasets)';
    } elseif ($indexSpecies == 'CLASH_mouse_3T12') {
        $col_occur = '3T12_Detected_3';
        $col_abund = '3T12_Mean_CPM';
        $label_count = '(3 datasets)';
    } elseif ($indexSpecies == 'CLASH_mouse_Cortex') {
        $col_occur = 'Cortex_Detected_8';
        $col_abund = 'Cortex_Mean_CPM';
        $label_count = '(8 datasets)';
    }
    // Heart/Kidney removed from here as they are now in Group 4

    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='{$col_occur}'>Hybrid Occurrence <br><span style='font-size:0.85em; font-weight:normal;'>{$label_count}</span></th>
    <th data-column='{$col_abund}'>Normalized abundance (CPM)</th>
    </tr>";

    // ... (Keep Rows for Group 5) ...
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                $positionParts = explode(':', $genomePos);
                if (count($positionParts) >= 2) {
                    $chromosome = $positionParts[0]; $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($genomePos);
                    } else {
                        $rangeParts = explode('-', $range);
                        if(count($rangeParts) == 2) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&position=" . urlencode($chromosome) . "%3A" . max(0, $originalStart - 100) . "-" . ($originalEnd + 100) . "&highlight=" . urlencode($chromosome) . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                        } else { $tableRows .= htmlspecialchars($genomePos); }
                    }
                } else { $tableRows .= htmlspecialchars($genomePos); }
            }
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_occur] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row[$col_abund] ?? '') . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='12'>No results found.</td></tr>";
    }

// =======================================================
// GROUP 6: Drosophila S2 (Control vs Dora KO)
// =======================================================
} elseif ($indexSpecies == 'CLASH_Drosophila_S2_Expanded') {

    // Labels for Tooltips
    $clash_ctrl_label = 'Control';
    $clash_ko_label   = 'Dora KO';
    
    $mir_ctrl_label  = 'S2WT';
    $mir_ko_label    = 'S2Dora';
    $gene_ctrl_label = 'S2WT';
    $gene_ko_label   = 'S2Dora';

    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='Control_Detected_3'>{$clash_ctrl_label} <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='Control_Mean_CPM'>{$clash_ctrl_label} <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    
    <th data-column='Dora_KO_Detected_3'>{$clash_ko_label} <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(3 datasets)</span></th>
    <th data-column='Dora_KO_Mean_CPM'>{$clash_ko_label} <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>

    <th data-column='miRNA_Exp_Control_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from {$mir_ctrl_label} miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$mir_ctrl_label} CPM)</span></th>
    
    <th data-column='miRNA_Exp_KO_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from {$mir_ko_label} miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$mir_ko_label} CPM)</span></th>
    
    <th data-column='Gene_Exp_Control_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from {$gene_ctrl_label} RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$gene_ctrl_label} TPM)</span></th>
    
    <th data-column='Gene_Exp_KO_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from {$gene_ko_label} RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>({$gene_ko_label} TPM)</span></th>
    </tr>";

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Drosophila_melanogaster/Gene/Summary?db=core;g=" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            // Genome Position (dm6)
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";

            if (empty($genomePos) || strpos($genomePos, 'multiple_elements') !== false) {
                $tableRows .= !empty($genomePos) ? htmlspecialchars($genomePos) : "N/A";
            } else {
                // Drosophila Logic (dm6) with padding
                $parts = explode(':', $genomePos);
                if (count($parts) >= 2) {
                    $chr = $parts[0];
                    $cleanRangePart = str_replace(',', '', $parts[1]); 
                    $range = explode('-', $cleanRangePart);
                    
                    if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                        $newStart = max(0, $range[0] - 100);
                        $newEnd   = $range[1] + 100;
                        $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=dm6&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                        $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                    } else {
                        // Fallback
                        $tableRows .= "<a href='https://genome.ucsc.edu/cgi-bin/hgTracks?db=dm6&position=" . urlencode($genomePos) . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                    }
                } else {
                    $tableRows .= htmlspecialchars($genomePos);
                }
            }

            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            
            // CLASH Data
            $tableRows .= "<td>" . htmlspecialchars($row['Control_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Control_Mean_CPM'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Dora_KO_Detected_3'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Dora_KO_Mean_CPM'] ?? '') . "</td>";
            
            // Expression Data
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Control_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_KO_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_Control_TPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_KO_TPM'] ?? '-') . "</td>";
            
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='18'>No results found.</td></tr>";
    }

// =======================================================
// GROUP: ALL C. ELEGANS CONSENSUS
// =======================================================
} elseif ($indexSpecies == 'CLASH_Celegans_Consensus_Final') {

    // 1. Define Headers
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold)</th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>

    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th> 
    <th data-column='gene_type'>Gene Type</th>

    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='total_cell_lines'>Total Stages <br><span style='font-size:0.85em; font-weight:normal;'>Out of 2 Stages</span></th>
    <th data-column='cell_line_names'>Specific Stages <br><span style='font-size:0.85em; font-weight:normal;'>(Click to view details)</span></th>
    </tr>";

    // 2. Define the C. elegans Map
    $wormMap = [
        'Embryo' => 'CLASH_Celegans_Embryo_Expanded',
        'L4'     => 'CLASH_Celegans_L4_Expanded'
    ];

    // 3. Build Rows
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            
            // miRNA Name with miRBase link
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars((string)($row['miRNA_name'] ?? '')) . "' target='_blank'>" . htmlspecialchars((string)($row['miRNA_name'] ?? '')) . "</a></td>";
            
            // FIXED: Added missing Pairing Pattern Column
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", (string)($row["miRNA_seq_5p_3p"] ?? ''))) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", (string)($row["target_seq_3p_5p"] ?? ''))) . "</div>";
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars((string)($row['gene_name'] ?? '')) . "</td>";
            
            // WormBase link for Gene ID
            $tableRows .= "<td><a href='https://wormbase.org/species/c_elegans/gene/" . htmlspecialchars((string)($row['gene_id'] ?? '')) . "' target='_blank'>" . htmlspecialchars((string)($row['gene_id'] ?? '')) . "</a></td>";
            
            $tableRows .= "<td>" . htmlspecialchars((string)($row['conservation_score'] ?? '')) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars((string)($row['free_energy'] ?? '')) . "</td>"; // INSERTED
            $tableRows .= "<td>" . htmlspecialchars((string)($row['gene_type'] ?? '')) . "</td>";

            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars((string)($regionVal ?? ''));
            $tableRows .= "<td>" . $displayVal . "</td>";

            // Genome Position (Link to UCSC ce11)
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            if (!empty($genomePos) && strpos($genomePos, ':') !== false) {
                $parts = explode(':', $genomePos);
                $chr = $parts[0];
                $cleanRangePart = str_replace(',', '', $parts[1]);
                $range = explode('-', $cleanRangePart);

                if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                    $newStart = max(0, $range[0] - 100);
                    $newEnd   = $range[1] + 100;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                } else {
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($genomePos);
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                }
            } else { $tableRows .= htmlspecialchars((string)$genomePos); }
            $tableRows .= "</td>";

            $tableRows .= "<td>" . htmlspecialchars((string)($row['site_type'] ?? '')) . "</td>";

            // Total Count Column (Following Mouse style)
            $count = htmlspecialchars((string)($row['total_cell_lines'] ?? '0'));
            $style = ($count == 2) ? "font-weight:bold; color:#d9534f;" : ""; 
            $tableRows .= "<td style='text-align:center; {$style}'>" . $count . "</td>";

            // Clickable Links for Life Stages
            $cellListStr = $row['cell_line_names'] ?? '';
            $cellArray = explode(', ', $cellListStr);
            $linksArray = [];
            foreach($cellArray as $shortName) {
                $shortName = trim($shortName);
                if(isset($wormMap[$shortName])) {
                    $realTable = $wormMap[$shortName];
                    $currentSearch = urlencode($searchTerm); 
                    $url = "microRNA_targets.html?index_CLASH_name={$currentSearch}&CLASH_CellLine=" . urlencode($realTable) . "&CLASH_CellLine_text=" . urlencode($shortName);
                    $linksArray[] = "<a href='{$url}' class='cell-link' target='_blank' style='text-decoration:underline; color:#0066cc;'>{$shortName}</a>";
                } else { $linksArray[] = htmlspecialchars($shortName); }
            }
            $tableRows .= "<td>" . implode(", ", $linksArray) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='12'>No results found in any C. elegans stage.</td></tr>";
    }

// =======================================================
// GROUP 7: C. elegans Embryo (Expanded with 5 Exp Columns)
// =======================================================
} elseif ($indexSpecies == 'CLASH_Celegans_Embryo_Expanded') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    
    <th data-column='Control_Detected_4'>Control <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(4 datasets)</span></th>
    <th data-column='Control_Mean_CPM'>Control <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>
    
    <th data-column='Ebax_KO_Detected_4'>Ebax KO <br><span style='font-size:0.85em; font-weight:normal;'>Hybrid Occur.<br>(4 datasets)</span></th>
    <th data-column='Ebax_KO_Mean_CPM'>Ebax KO <br><span style='font-size:0.85em; font-weight:normal;'>(Hybrid CPM)</span></th>

    <th data-column='miRNA_Exp_EarlyWT_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Early Embryo WT data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Early WT)</span></th>
    <th data-column='miRNA_Exp_EarlyKO_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Early Embryo Ebax KO data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Early KO)</span></th>
    <th data-column='miRNA_Exp_LateWT_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Late Embryo WT data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Late WT)</span></th>
    <th data-column='miRNA_Exp_LateKO_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from Late Embryo Ebax KO data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Late KO)</span></th>
    
    <th data-column='Gene_Exp_WT_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from Embryo RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(WT TPM)</span></th>
    </tr>";

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://wormbase.org/species/c_elegans/gene/" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            $parts = explode(':', $genomePos);
            if (count($parts) >= 2) {
                $chr = $parts[0];
                $cleanRangePart = str_replace(',', '', $parts[1]);
                $range = explode('-', $cleanRangePart);

                if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                    $newStart = max(0, $range[0] - 100);
                    $newEnd   = $range[1] + 100;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                } else {
                    $tableRows .= "<a href='https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($genomePos) . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                }
            } else {
                $tableRows .= htmlspecialchars($genomePos);
            }
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Control_Detected_4'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Control_Mean_CPM'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Ebax_KO_Detected_4'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Ebax_KO_Mean_CPM'] ?? '') . "</td>";
            
            // New Expression Columns (5 total)
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_EarlyWT_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_EarlyKO_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_LateWT_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_LateKO_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>";
            
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='19'>No results found.</td></tr>";
    }

// =======================================================
// GROUP 8: C. elegans L4 (Expanded)
// =======================================================
} elseif ($indexSpecies == 'CLASH_Celegans_L4_Expanded') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='pairing_pattern'>Pairing Pattern (UNAfold) <span class='help_site_type' tabindex='0'>? <span class='tooltip'>The first miRNA–target nucleotide is not expected to pair and is omitted from the displayed UNAfold pattern.</span> </span> </th>
    <th data-column='gene_name'>Gene Name</th>
    <th data-column='gene_id'>Gene ID</th>
    <th data-column='conservation_score'>Conservation Score</th>
    <th data-column='free_energy'>Free Energy (kcal/mol)</th>
    <th data-column='gene_type'>Gene Type</th>
    <th data-column='target_site_region'>Target Site Region</th>
    <th data-column='chr_genome_position'>Genome Position</th>
    <th data-column='site_type'>Target Site Type</th>
    <th data-column='L4_Detected_4'>Hybrid Occurrence (L4) <br><span style='font-size:0.85em; font-weight:normal;'>(4 datasets)</span></th>
    <th data-column='L4_Mean_CPM'>Hybrid CPM (L4) <br><span style='font-size:0.85em; font-weight:normal;'>(Normalized)</span></th>

    <th data-column='miRNA_Exp_Control_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from L4WT miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(WT CPM)</span></th>
    <th data-column='miRNA_Exp_KO_CPM'>miRNA Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average miRNA expression (CPM) derived from L4Ebax miRNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(Ebax KO CPM)</span></th>
    <th data-column='Gene_Exp_WT_TPM'>Gene Exp <span class='help_site_type' tabindex='0'>? <span class='tooltip'>Average gene expression (TPM) derived from L4 RNA-seq data.</span></span><br><span style='font-size:0.85em; font-weight:normal;'>(WT TPM)</span></th>
    </tr>";

    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['miRNA_name'] ?? '') . "</a></td>";
            
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA_seq_5p_3p"] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars(normalizeBasePattern($row['pairing_pattern'] ?? '')) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target_seq_3p_5p"] ?? '')) . "</div>";
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['gene_name'] ?? '') . "</td>";
            $tableRows .= "<td><a href='https://wormbase.org/species/c_elegans/gene/" . htmlspecialchars($row['gene_id'] ?? '') . "' target='_blank'>" . htmlspecialchars($row['gene_id'] ?? '') . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['conservation_score'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['free_energy'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['gene_type'] ?? '') . "</td>";
            
            $regionVal = $row['target_site_region'];
            $displayVal = isset($regionDisplayMap[$regionVal]) ? $regionDisplayMap[$regionVal] : htmlspecialchars($regionVal ?? '');
            $tableRows .= "<td>" . $displayVal . "</td>";
            
            $genomePos = $row['chr_genome_position'] ?? '';
            $tableRows .= "<td>";
            $parts = explode(':', $genomePos);
            if (count($parts) >= 2) {
                $chr = $parts[0];
                $cleanRangePart = str_replace(',', '', $parts[1]);
                $range = explode('-', $cleanRangePart);

                if(count($range) == 2 && is_numeric($range[0]) && is_numeric($range[1])) {
                    $newStart = max(0, $range[0] - 100);
                    $newEnd   = $range[1] + 100;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($chr) . "%3A" . $newStart . "-" . $newEnd . "&highlight=" . urlencode($chr) . "%3A" . $range[0] . "-" . $range[1] . "%23FF5733";
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                } else {
                    $tableRows .= "<a href='https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&position=" . urlencode($genomePos) . "' target='_blank'>" . htmlspecialchars($genomePos) . "</a>";
                }
            } else {
                $tableRows .= htmlspecialchars($genomePos);
            }
            $tableRows .= "</td>";
            
            $tableRows .= "<td>" . htmlspecialchars($row['site_type'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['L4_Detected_4'] ?? '') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['L4_Mean_CPM'] ?? '') . "</td>";
            
            // Expression Columns
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_Control_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['miRNA_Exp_KO_CPM'] ?? '-') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_Exp_WT_TPM'] ?? '-') . "</td>"; // Renamed to WT
            
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='15'>No results found.</td></tr>";
    }
}

echo "<div class='flex-container'>";
echo "<section class='table-container'>";
echo "<table>";
echo "<thead>" . $tableHeaders . "</thead>";
echo "<tbody>" . $tableRows . "</tbody>";
echo "</table>";
echo "</section>";
echo "</div>";

$conn->close();
?>