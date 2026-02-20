<?php
require '../db.php';

ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Internal Server Error."]));
}

$conn->set_charset('utf8mb4');

$miRNAName = isset($_GET['mirnaAbundance_name']) ? $_GET['mirnaAbundance_name'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : 'Mouse';

if (empty($miRNAName)) {
    error_log("miRNA name is empty");
    die(json_encode(['error' => "miRNA_php name is required."]));
}

$allowedSpecies = ['Mouse', 'Human', 'D.melanogaster', 'C.elegans'];
if (!in_array($species, $allowedSpecies, true)) {
    error_log("Unknown species requested: " . substr($species, 0, 100));
    die(json_encode(['error' => "Unknown species."]));
}

$tableMap = [
    'Mouse'           => 'miRNA_abundance_Mouse_CPM',
    'Human'           => 'miRNA_abundance_Human_CPM',
    'D.melanogaster'  => 'miRNA_abundance_Drosophila_CPM',
    'C.elegans'       => 'miRNA_abundance_Celegans_CPM',
];

$tableName = $tableMap[$species]; // Safe: $species is already whitelisted

$searchTerm = '%' . $miRNAName . '%';
$stmt = $conn->prepare("SELECT * FROM `$tableName` WHERE `miRNA_name` LIKE ?");
$stmt->bind_param('s', $searchTerm);
$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    error_log("Query failed on table $tableName: " . $conn->error);
    die(json_encode(['error' => "Query failed. Please try again later."]));
}


$data = [];
$geneFound = false;

// Tissue definitions per species (unchanged)
switch ($species) {
    case 'Mouse':
        $tissues = [
            'Stomach_WT' => ['SRR24941020_Stomach', 'SRR24941009_Stomach', 'SRR24940990_Stomach'],
            'Stomach_Z8' => ['SRR24941006_Stomach', 'SRR24941025_Stomach', 'SRR24941013_Stomach'],
            'Skin_WT' => ['SRR24941019_Skin', 'SRR24940991_Skin', 'SRR24940997_Skin'],
            'Skin_Z8' => ['SRR24941024_Skin', 'SRR24941007_Skin', 'SRR24941014_Skin'],
            'Lung_WT' => ['SRR24940992_Lung', 'SRR24940998_Lung', 'SRR24941018_Lung'],
            'Lung_Z8' => ['SRR24941008_Lung', 'SRR24941031_Lung','SRR24941015_Lung'],
            'Liver_WT' => ['SRR24941004_Liver', 'SRR24940989_Liver', 'SRR24941030_Liver'],
            'Liver_Z8' => ['SRR24941010_Liver', 'SRR24941032_Liver','SRR24941016_Liver'],
            'Kidney_WT' => ['SRR24941001_Kidney', 'SRR24940993_Kidney', 'SRR24941029_Kidney'],
            'Kidney_Z8' => ['SRR24941011_Kidney', 'SRR24941033_Kidney', 'SRR24941017_Kidney'],
            'Intestine_WT' => ['SRR24941002_Intestine', 'SRR24940994_Intestine', 'SRR24941028_Intestine'],
            'Intestine_Z8' => ['SRR24941023_Intestine', 'SRR24941012_Intestine', 'SRR24941034_Intestine'],
            'Heart_WT' => ['SRR24941003_Heart', 'SRR24941027_Heart', 'SRR24940995_Heart'],
            'Heart_Z8' => ['SRR24941022_Heart', 'SRR24941035_Heart','SRR24940999_Heart'],
            'Brain_WT' => ['SRR24941005_Brain', 'SRR24941026_Brain', 'SRR24940996_Brain'],
            'Brain_Z8' => ['SRR24941021_Brain', 'SRR24941036_Brain', 'SRR24941000_Brain'],
            'Neuron_sgNT' => ['SRR13264632_sgNT_Neuron', 'SRR13264633_sgNT_Neuron', 'SRR13264634_sgNT_Neuron'],
            'Neuron_Z8' => ['SRR13264635_sgZ8_Neuron', 'SRR13264636_sgZ8_Neuron'],
            'MEF_sgNT' => ['SRR13264626_sgNT_MEF', 'SRR13264627_sgNT_MEF', 'SRR13264628_sgNT_MEF', 'SRR12650662_MEFsgNT','SRR12650663_MEFsgNT','SRR12650664_MEFsgNT'],
            'MEF_Z8' => ['SRR13264629_sgZ8_MEF', 'SRR13264630_sgZ8_MEF', 'SRR13264631_sgZ8_MEF', 'SRR12650665_MEFzs8KO','SRR12650666_MEFzs8KO','SRR12650667_MEFzs8KO'],
            'StriatalCellHet_sgNT' => ['SRR28497188_CTRL_Scr_1', 'SRR28497187_CTRL_Scr_2'],
            'StriatalCellHet_Z8' => ['SRR28497196_CTRL_ZSWIM8_KO_1', 'SRR28497195_CTRL_ZSWIM8_KO_2'],
            'StriatalCellHomo_sgNT' => ['SRR28497194_HD-homo_Scr_1', 'SRR28497193_HD-homo_Scr_2'],
            'StriatalCellHomo_Z8' => ['SRR28497192_HD-homo_ZSWIM8_KO_1', 'SRR28497191_HD-homo_ZSWIM8_KO_2']];
        break;

    case 'Human':
        $tissues = [
            'K562wt' => ['SRR12650656_K562wt', 'SRR12650657_K562wt','SRR12650658_K562wt','SRR13264707_K562wt','SRR13264708_K562wt','SRR13264709_K562wt'],
            'K562zs8' => ['SRR12650659_K562zs8', 'SRR12650660_K562zs8','SRR12650661_K562zs8','SRR13264710_K562zs8','SRR13264711_K562zs8','SRR13264712_K562zs8'],
            'HeLaSgNT' => ['SRR13264643_HeLaSgNT','SRR13264644_HeLaSgNT','SRR13264645_HeLaSgNT'],
            'HeLaZs8' => ['SRR13264646_HeLaZs8','SRR13264647_HeLaZs8','SRR13264648_HeLaZs8'],
            'A549sgNT' => ['SRR13264637_A549sgNT','SRR13264638_A549sgNT','SRR13264639_A549sgNT'],
            'A549zs8' => ['SRR13264640_A549zs8','SRR13264641_A549zs8','SRR13264642_A549zs8'],
            'MCF7sgNT' => ['SRR13264649_MCF7sgNT','SRR13264650_MCF7sgNT'],
            'MCF7zs8' => ['SRR13264651_MCF7zs8','SRR13264652_MCF7zs8','SRR13264653_MCF7zs8'],
            'HEK293TsgNT' => ['SRR12650650_HEK293TsgNT','SRR12650651_HEK293TsgNT','SRR12650652_HEK293TsgNT'],
            'HEK293Tzs8' => ['SRR12650653_HEK293Tzs8','SRR12650654_HEK293Tzs8','SRR12650655_HEK293Tzs8'],
        ];
        break;

    case 'D.melanogaster':
        $tissues = [
            'S2WT' => ['SRR13264713_S2wt', 'SRR13264714_S2wt', 'SRR13264715_S2wt'],
            'S2zs8' => ['SRR13264716_S2zs8', 'SRR13264717_S2zs8', 'SRR13264718_S2zs8'],
        ];
        break;

    case 'C.elegans':
        $tissues = [
            'N2_EE' => ['SRR29013905_EarlyEmbryoWT', 'SRR29013906_EarlyEmbryoWT'],
            'Ebax_EE' => ['SRR29013903_EarlyEmbryoEbax', 'SRR29013904_EarlyEmbryoEbax'],
            'N2_LE' => ['SRR29013901_LateEmbryoWT', 'SRR29013902_LateEmbryoWT'],
            'Ebax_LE' => ['SRR29013899_LateEmbryoEbax', 'SRR29013900_LateEmbryoEbax'],
            'N2_L1' => ['SRR29013873_L1WT', 'SRR29013874_L1WT', 'SRR29013897_L1WT', 'SRR29013898_L1WT'],
            'Ebax_L1' => ['SRR29013871_L1Ebax', 'SRR29013872_L1Ebax', 'SRR29013895_L1Ebax', 'SRR29013896_L1Ebax'],
            'N2_L2' => ['SRR29013893_L2WT', 'SRR29013894_L2WT'],
            'Ebax_L2' => ['SRR29013891_L2Ebax', 'SRR29013892_L2Ebax'],
            'N2_L3' => ['SRR29013889_L3WT', 'SRR29013890_L3WT'],
            'Ebax_L3' => ['SRR29013887_L3Ebax', 'SRR29013888_L3Ebax'],
            'N2_L4' => ['SRR29013885_L4WT', 'SRR29013886_L4WT', 'SRR29013868_L4WT', 'SRR29013869_L4WT', 'SRR29013870_L4WT'],
            'Ebax_L4' => ['SRR29013883_L4Ebax', 'SRR29013884_L4Ebax', 'SRR29013866_L4Ebax', 'SRR29013867_L4Ebax'],
            'N2_Ad' => ['SRR29013881_GravidAdultWT', 'SRR29013882_GravidAdultWT'],
            'Ebax_Ad' => ['SRR29013879_GravidAdultEbax', 'SRR29013880_GravidAdultEbax'],
            'glp4' => ['SRR29013877_glp4WT', 'SRR29013878_glp4WT'],
            'glp4_ebax' => ['SRR29013875_glp4Ebax', 'SRR29013876_glp4Ebax']
        ];
        break;

    default:
        $tissues = [];
        break;
}

if ($result->num_rows > 0) {
    $geneFound = true;
    $row = $result->fetch_assoc();
    error_log("Query result: " . print_r($row, true));

    foreach ($tissues as $tissueName => $tissueColumns) {
        foreach ($tissueColumns as $column) {
            if (isset($row[$column])) {
                $data[$tissueName][] = (float)$row[$column];
            }
        }
    }
} else {
    error_log("No rows found for miRNA name: $miRNAName");
}

$response = [
    'geneFound' => $geneFound,
    'data' => $data,
    'tissues' => $tissues
];

$stmt->close();
$conn->close();
echo json_encode($response);
exit;