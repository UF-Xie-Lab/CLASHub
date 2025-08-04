<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: text/html; charset=utf-8");

require('../db.php');

// 创建数据库连接
$conn = new mysqli($servername, $username, $password, $dbname);

// 检查连接
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

$searchTerm = isset($_GET['index_CLASH_name']) ? $_GET['index_CLASH_name'] : '';
$siteType = isset($_GET['site_type']) ? $_GET['site_type'] : '';
$indexSpecies = isset($_GET['CLASH_CellLine']) ? $_GET['CLASH_CellLine'] : '';

$baseSql = "FROM $indexSpecies";
$whereClauses = [];

if (!empty($searchTerm)) {
    $searchTermEscaped = $conn->real_escape_string($searchTerm);
    $whereClauses[] = "(miRNA_name LIKE '%$searchTermEscaped%' OR Gene_name LIKE '%$searchTermEscaped%')";
}

if (!empty($siteType)) {
    $siteTypeEscaped = $conn->real_escape_string($siteType);
    $whereClauses[] = "site_type = '$siteTypeEscaped'";
}

if (!empty($whereClauses)) {
    $baseSql .= " WHERE " . implode(" AND ", $whereClauses);
}

// 不再进行分页查询，获取所有数据
$sql = "SELECT * $baseSql";
$result = $conn->query($sql);
if (!$result) {
    die("Query failed: " . $conn->error);
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

if ($indexSpecies == '20240619_293t_eclip_h1toh8') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_8_replicates'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance'>Normalized abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_8_replicates']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_HCT116_qCLASH_h9toh16') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_5_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_5_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_MB002_qCLASH_h17toh24') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_U87MG_qCLASH_h25toh30') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_T98G_qCLASH_h31toh36') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized abundance wild type wt</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20241022_MDAMB231_eCLIP_qCLASH_h437toh42_h101toh106') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_6_replicates_in_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_in_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_6_replicates_in_zs8'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_in_zs8'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_6_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_6_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20241022_A549_eCLIP_qCLASH_h43toh48_h95toh100') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_6_replicates_in_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_in_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_6_replicates_in_zs8'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_in_zs8'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_6_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_6_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_ES2_qCLASH_h49toh54') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_Ovcar8_qCLASH_h55toh60') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_H1299_qCLASH_h61toh66') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_Mel501_qCLASH_h67toh72') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_HepG2_qCLASH_h73toh75') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number Of Datasets With Hybrid Occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_D425_qCLASH_h76toh78') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number Of Datasets With Hybrid Occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240621_liver_qCLASH_h79') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Normalized_abundance_1_liver_cancer_tissue'>Normalized abundance in 1 liver cancer tissue</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_1_liver_cancer_tissue']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240911_TIVE_qCLASH_h80toh82') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number Of Datasets With Hybrid Occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240911_Huh75_qCLASH_h83toh94') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_12_replicates_wt'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=hg38&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_12_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240628_Celegans_eCLIP_S1tohS10') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_ebax_knockout'>Number Of Datasets With Hybrid Occurrence In Ebax Knockout</th>
    <th data-column='Normalized_abundance_ebax_knockout'>Normalized Abundance In Ebax Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Caenorhabditis_elegans/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == 'alg1_l3_c11toc17_20250801') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='Free_Energy'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_7_replicates_in_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_in_wt'>Normalized Abundance In Wild Type</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . 
    (isset($row['Pairing_pattern']) ? htmlspecialchars($row['Pairing_pattern']) : "N/A") . 
    "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Caenorhabditis_elegans/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Free_Energy'] ?? 'N/A') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_7_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == 'alg_1_mid_l4_c18toc22_20250801') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='Free_Energy'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_5_replicates_in_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_in_wt'>Normalized Abundance In Wild Type</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['Pairing_pattern'] ?? 'N/A') . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Caenorhabditis_elegans/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Free_Energy'] ?? 'N/A') . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                $chromosome = $positionParts[0];
                $range = $positionParts[1];
                if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                } else {
                    list($originalStart, $originalEnd) = explode('-', $range);
                    $extendedStart = max(0, $originalStart - 100);
                    $extendedEnd = $originalEnd + 100;
                    $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                    $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                    $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=ce11&" . $positionParam . "&" . $highlightParam;
                    $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_5_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240701_DrosophilaS2_qCLASH_d1tod6') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Drosophila_melanogaster/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=dm6&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
    
} elseif ($indexSpecies == '20241022_MouseStriatal_eCLIP_m1tom8') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_in_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_in_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_4_replicates_in_zs8'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_in_zs8'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_4_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240813_mouse_eCLIP_m9_to_m12') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_2_replicates_wt'>Number of Datasets With Hybrid Occurrence In Wild Type</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance In Wild Type</th>
    <th data-column='Number_of_occurrences_in_2_replicates_zswim8_KO'>Number Of Datasets With Hybrid Occurrence In ZSWIM8 Knockout</th>
    <th data-column='Normalized_abundance_zswim8_KO'>Normalized Abundance In ZSWIM8 Knockout</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_2_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_2_replicates_in_zs8']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_zs8']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240813_mouse_eCLIP_m13tom14') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_2_replicates_wt'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_2_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240813_mouse_eCLIP_m15tom16') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_2_replicates_wt'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_2_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240912_MouseCortex_qCLASH_m17tom32') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_16_replicates_wt'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_16_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240912_MouseHE21b_CLEARCLIP_m33tom38') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_6_replicates_wt'>Number of datasets with hybrid occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_6_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
    }
} elseif ($indexSpecies == '20240912_Mouse3T12_CLEARCLIP_m39tom41') {
    $tableHeaders = "<tr>
    <th data-column='miRNA_name'>miRNA Name</th>
    <th data-column='UNAfold'>Pairing Pattern (UNAfold)</th>
    <th data-column='Gene_name'>Gene Name</th>
    <th data-column='Gene_ID'>Gene ID</th>
    <th data-column='Conservation_score'>Conservation Score</th>
    <th data-column='dG'>Free Energy (kcal/mol)</th>
    <th data-column='Gene_type'>Gene Type</th>
    <th data-column='Element_region'>Element Region</th>
    <th data-column='Genome_position'>Genome Position</th>
    <th data-column='Site_type'>Binding Site Type</th>
    <th data-column='Number_of_occurrences_in_3_replicates_wt'>Number Of Datasets With Hybrid Occurrence</th>
    <th data-column='Normalized_abundance_wt'>Normalized Abundance</th>
    </tr>";
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $tableRows .= "<tr>";
            $tableRows .= "<td><a href='https://www.mirbase.org/results/?query=" . htmlspecialchars($row['miRNA_name']) . "' target='_blank'>" . htmlspecialchars($row['miRNA_name']) . "</a></td>";
            $tableRows .= "<td class='pairing'>";
            $tableRows .= "<div class='match-lines miRNA-seq'>miRNA: &nbsp;5'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["miRNA (5'-3')"])) . "</div>";
            $tableRows .= "<div class='match-lines'>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" . htmlspecialchars($row['base_pattern']) . "</div>";
            $tableRows .= "<div class='match-lines target-seq'>target: 3'&nbsp;" . htmlspecialchars(str_replace("T", "U", $row["target (3'-5')"])) . "</div>";
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_name']) . "</td>";
            $tableRows .= "<td><a href='https://useast.ensembl.org/Mus_musculus/Gene/Summary?db=core;g=" . htmlspecialchars($row['Gene_ID']) . "' target='_blank'>" . htmlspecialchars($row['Gene_ID']) . "</a></td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Conservation_score']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['dG']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Gene_type']) . "</td>";
            $tableRows .= "<td>" . (isset($regionDisplayMap[$row['element_region']]) ? $regionDisplayMap[$row['element_region']] : htmlspecialchars($row['element_region'])) . "</td>";
            $tableRows .= "<td>";
            if (empty($row['chr_genome_position']) || strpos($row['chr_genome_position'], 'multiple_elements') !== false) {
                $tableRows .= !empty($row['chr_genome_position']) ? htmlspecialchars($row['chr_genome_position']) : "N/A";
            } else {
                $positionParts = explode(':', $row['chr_genome_position']);
                if (count($positionParts) == 2) {
                    $chromosome = $positionParts[0];
                    $range = $positionParts[1];
                    if (strpos($range, ',') !== false || strpos($range, ';') !== false) {
                        $tableRows .= htmlspecialchars($row['chr_genome_position']);
                    } else {
                        $rangeParts = explode('-', $range);
                        if (count($rangeParts) == 2 && is_numeric($rangeParts[0]) && is_numeric($rangeParts[1])) {
                            list($originalStart, $originalEnd) = $rangeParts;
                            $extendedStart = max(0, $originalStart - 100);
                            $extendedEnd = $originalEnd + 100;
                            $highlightParam = "highlight=" . $chromosome . "%3A" . $originalStart . "-" . $originalEnd . "%23FF5733";
                            $positionParam = "position=" . $chromosome . "%3A" . $extendedStart . "-" . $extendedEnd;
                            $ucscUrl = "https://genome.ucsc.edu/cgi-bin/hgTracks?db=mm39&" . $positionParam . "&" . $highlightParam;
                            $tableRows .= "<a href='" . $ucscUrl . "' target='_blank'>" . htmlspecialchars($row['chr_genome_position']) . "</a>";
                        } else {
                            error_log("Unexpected range format: " . $range);
                            $tableRows .= htmlspecialchars($row['chr_genome_position']);
                        }
                    }
                } else {
                    error_log("Unexpected chr_genome_position format: " . $row['chr_genome_position']);
                    $tableRows .= htmlspecialchars($row['chr_genome_position']);
                }
            }
            $tableRows .= "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['site_type']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Number_of_occurrences_in_3_replicates_in_wt']) . "</td>";
            $tableRows .= "<td>" . htmlspecialchars($row['Normalized_abundance_in_wt']) . "</td>";
            $tableRows .= "</tr>";
        }
    } else {
        $tableRows .= "<tr><td colspan='10'>No results found.</td></tr>";
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
