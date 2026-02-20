<?php
require('../db.php');

// 1. DISABLE display_errors to prevent JSON breakage
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// 2. JSON Header
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Database connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Internal Server Error."]));
}

$conn->set_charset('utf8mb4');

$geneName = isset($_GET['TargetAbundance_GeneName']) ? $_GET['TargetAbundance_GeneName'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : 'Mouse';

if (empty($geneName)) {
    die(json_encode(['error' => "Gene name is required."]));
}

$allowedSpecies = ['Mouse', 'Human', 'D.melanogaster', 'C.elegans'];
if (!in_array($species, $allowedSpecies, true)) {
    error_log("Unknown species requested: " . substr($species, 0, 100));
    die(json_encode(['error' => "Unknown species."]));
}

$tableMap = [
    'Mouse'           => 'gene_abundance_Mouse_TPM',
    'Human'           => 'gene_abundance_Human_TPM',
    'D.melanogaster'  => 'gene_abundance_Drosophila_TPM',
    'C.elegans'       => 'gene_abundance_Celegans_TPM',
];

$tableName = $tableMap[$species]; // Safe: $species is already whitelisted

if (strpos($geneName, '|') !== false) {
    $parts = explode('|', $geneName);
    $geneID = $parts[0];
    $stmt = $conn->prepare("SELECT * FROM `$tableName` WHERE `GeneID` = ?");
    $stmt->bind_param('s', $geneID);
} else {
    $searchTerm = '%' . $geneName . '%';
    $stmt = $conn->prepare("SELECT * FROM `$tableName` WHERE `Combined` LIKE ?");
    $stmt->bind_param('s', $searchTerm);
}

$stmt->execute();
$result = $stmt->get_result();

if (!$result) {
    error_log("Query failed on table $tableName: " . $conn->error);
    die(json_encode(['error' => "Query failed. Please try again later."]));
}

$data = [];
$geneFound = false;

if ($result->num_rows > 0) {
    $geneFound = true;
    $row = $result->fetch_assoc();
    error_log("Query result: " . print_r($row, true));

    switch ($species) {
        case 'Mouse':
            $tissues = [
            'Eye_Zswim8_Het' => ['SRR24391480_Eye', 'SRR24391481_Eye','SRR24391536_Eye'],
            'Eye_Zswim8_KO' => ['SRR24391488_Eye', 'SRR24391489_Eye','SRR24391526_Eye'],
            'Forebrain_Zswim8_Het' => ['SRR24391514_Forebrain', 'SRR24391515_Forebrain','SRR24391547_Forebrain'],
            'Forebrain_Zswim8_KO' => ['SRR24391522_Forebrain', 'SRR24391523_Forebrain','SRR24391534_Forebrain'],
            'Heart_Zswim8_Het' => ['SRR24391510_Heart', 'SRR24391511_Heart','SRR24391543_Heart'],
            'Heart_Zswim8_KO' => ['SRR24391502_Heart', 'SRR24391503_Heart','SRR24391533_Heart'],
            'Hindbrain_Zswim8_Het' => ['SRR24391512_Hindbrain', 'SRR24391513_Hindbrain','SRR24391546_Hindbrain'],
            'Hindbrain_Zswim8_KO' => ['SRR24391520_Hindbrain', 'SRR24391521_Hindbrain','SRR24391538_Hindbrain'],
            'Intestine_Zswim8_Het' => ['SRR24391486_Intestine', 'SRR24391487_Intestine','SRR24391545_Intestine'],
            'Intestine_Zswim8_KO' => ['SRR24391494_Intestine', 'SRR24391495_Intestine','SRR24391530_Intestine'],
            'Kidney_Zswim8_Het' => ['SRR24391482_Kidney', 'SRR24391483_Kidney','SRR24391539_Kidney'],
            'Kidney_Zswim8_KO' => ['SRR24391490_Kidney', 'SRR24391491_Kidney','SRR24391531_Kidney'],
            'Liver_Zswim8_Het' => ['SRR24391484_Liver', 'SRR24391485_Liver','SRR24391540_Liver'],
            'Liver_Zswim8_KO' => ['SRR24391492_Liver', 'SRR24391493_Liver','SRR24391527_Liver'],
            'Lung_Zswim8_Het' => ['SRR24391508_Lung', 'SRR24391509_Lung','SRR24391542_Lung'],
            'Lung_Zswim8_KO' => ['SRR24391500_Lung', 'SRR24391501_Lung','SRR24391532_Lung'],
            'Muscle_Zswim8_Het' => ['SRR24391478_Muscle', 'SRR24391479_Muscle','SRR24391535_Muscle'],
            'Muscle_Zswim8_KO' => ['SRR24391518_Muscle', 'SRR24391519_Muscle','SRR24391525_Muscle'],
            'Placenta_Zswim8_Het' => ['SRR24391476_Placenta', 'SRR24391477_Placenta','SRR24391537_Placenta'],
            'Placenta_Zswim8_KO' => ['SRR24391516_Placenta', 'SRR24391517_Placenta','SRR24391524_Placenta'],
            'Skin_Zswim8_Het' => ['SRR24391504_Skin', 'SRR24391505_Skin','SRR24391541_Skin'],
            'Skin_Zswim8_KO' => ['SRR24391496_Skin', 'SRR24391497_Skin','SRR24391528_Skin'],
            'Stomach_Zswim8_Het' => ['SRR24391506_Stomach', 'SRR24391507_Stomach','SRR24391544_Stomach'],
            'Stomach_Zswim8_KO' => ['SRR24391498_Stomach', 'SRR24391499_Stomach','SRR24391529_Stomach'],
            'EmbryonicStemCell' => ['ERR2640636_EmbryonicStemCell', 'ERR2640637_EmbryonicStemCell'],
            'iNeuron' => ['ERR2640652_neuron', 'ERR2640653_neuron', 'ERR2640654_neuron'],
            'MEF' => ['SRR25443485_MEF', 'SRR25443484_MEF', 'SRR25443483_MEF'],
            'NeuralPrecursor' => ['ERR2640640_NeuralPrecursor', 'ERR2640641_NeuralPrecursor'],
            'Striatal_HD_Het_sgNT' => ['SRR34804892_StriatalCell', 'SRR34804893_StriatalCell',],
            'Striatal_HD_Het_Z8KO' => ['SRR34804890_StriatalCell', 'SRR34804891_StriatalCell'],
            'Striatal_HD_Hom_sgNT' => ['SRR34804896_StriatalCell', 'SRR34804897_StriatalCell'],
            'Striatal_HD_Hom_Z8KO' => ['SRR34804894_StriatalCell', 'SRR34804895_StriatalCell']
            ];
            break;
        case 'Human':
            $tissues = [
                'A549' => ['SRR28535493_A549','SRR28535494_A549','SRR28535495_A549','SRR21237863_A549','SRR21237869_A549','SRR21237879_A549','SRR18462418_A549'],
                'D425' => ['SRR16119415_D425','SRR16119416_D425','SRR11924485_D425','SRR11924486_D425','SRR8315029_D425'],
                'ES2' => ['SRR22410790_ES2','SRR22410791_ES2','SRR22410792_ES2','SRR26439462_ES2','SRR26439463_ES2','SRR26439464_ES2'],
                'HEK293T' => ['SRR24421974_HEK293T','SRR24421975_HEK293T','SRR24421976_HEK293T','SRR18074813_HEK293T','SRR18074814_HEK293T','SRR18074815_HEK293T','SRR18074816_HEK293T'],
                'Hela' => ['SRR30058518_Hela','SRR30058519_Hela','SRR30058520_Hela','SRR22407570_Hela','SRR22407571_Hela','SRR22407572_Hela','SRR18462415_Hela'],
                'HepG2' => ['SRR28685775_HepG2','SRR28685776_HepG2','SRR28685777_HepG2','SRR23387178_HepG2','SRR23387179_HepG2'],
                'H1299' => ['SRR18462412_H1299','SRR21237865_H1299','SRR21237873_H1299','SRR21237881_H1299'],
                'K562' => ['SRR18462409_K562','SRR13800753_K562','SRR13800754_K562','SRR13800737_K562','SRR13800738_K562','SRR13800739_K562' ],
                'MB002' => ['SRR28341542_MB002','SRR28341543_MB002','SRR24099835_MB002','SRR24099836_MB002','SRR24099837_MB002'],
                'MCF7' => ['SRR14915857_MCF7','SRR17944548_MCF7','SRR17944549_MCF7','SRR13296901_MCF7','SRR13296902_MCF7','SRR13296903_MCF7','SRR14915858_MCF7'],
                'MDA-MB-231' => ['SRR11544576_MDAMB231','SRR11544577_MDAMB231','SRR11544578_MDAMB231','SRR14870088_MDAMB231','SRR14870089_MDAMB231','SRR14870090_MDAMB231'],
                'Ovcar8' => ['SRR26536802_OVCAR8','SRR26536803_OVCAR8','SRR26536798_OVCAR8','SRR26536799_OVCAR8'],
                'T98G' => ['SRR10358029_T98G','SRR10358030_T98G','SRR10358031_T98G','SRR6881782_T98G','SRR6881783_T98G'],
                'U87MG' => ['SRR11433766_U87MG','SRR11433767_U87MG','SRR11433768_U87MG','SRR24991947_U87MG','SRR24991948_U87MG','SRR24991949_U87MG'],
                '501Mel' => ['SRR6163777_501Mel','SRR6163778_501Mel','SRR6163779_501Mel','SRR6163780_501Mel','SRR8473015_501Mel','SRR8473019_501Mel','SRR8473020_501Mel']];
            break;
        case 'D.melanogaster':
            $tissues = [
                'S2WT' => ['SRR18048483_S2WT','SRR18048484_S2WT','SRR18048425_S2WT','SRR18048423_S2WT','SRR18048424_S2WT'],
                'S2Dora' => ['SRR18048426_S2dora','SRR18048427_S2dora','SRR18048468_S2dora'],
                '0to4hEmbryosWT' => ['SRR18048437_0_2h','SRR18048436_2_4h','SRR18048435_2_4h','SRR18048446_0_2h'],
                '8to12hEmbryosWT' => ['SRR18048461_8to12hEmbryosWT','SRR18048433_8to12hEmbryosWT','SRR18048512_8to12hEmbryosWT','SRR18048481_8to12hEmbryosWT','SRR18048482_8to12hEmbryosWT','SRR18048434_8to12hEmbryosWT'],
                '8to12hEmbryosDora' => ['SRR18048499_8to12hEmbryosDora','SRR18048531_8to12hEmbryosDora','SRR18048442_8to12hEmbryosDora','SRR18048532_8to12hEmbryosDora'],
                '12to16hEmbryosWT' => ['SRR18048539_12to16hEmbryosWT','SRR18048525_12to16hEmbryosWT','SRR18048508_12to16hEmbryosWT','SRR18048459_12to16hEmbryosWT','SRR18048432_12to16hEmbryosWT','SRR18048465_12to16hEmbryosWT'],
                '12to16hEmbryosDora' => ['SRR18048448_12to16hEmbryosDora','SRR18048497_12to16hEmbryosDora','SRR18048529_12to16hEmbryosDora','SRR18048516_12to16hEmbryosDora'],
                '16to20hEmbryosWT' => ['SRR18048421_16to20hEmbryosWT','SRR18048538_16to20hEmbryosWT','SRR18048479_16to20hEmbryosWT','SRR18048463_16to20hEmbryosWT','SRR18048527_16to20hEmbryosWT'],
                '16to20hEmbryosDora' => ['SRR18048542_16to20hEmbryosDora','SRR18048443_16to20hEmbryosDora','SRR18048495_16to20hEmbryosDora','SRR18048501_16to20hEmbryosDora'],
                'flyscr' => ['SRR22129292_fly','SRR22129294_fly','SRR22129296_fly']
            ];
            break;
        case 'C.elegans':
            $tissues = [
                'embryos' => ['SRR23049957_embryos','SRR23049959_embryos','SRR23049928_embryos','SRR23049954_embryos'],
                'L1_wt' => ['SRR2010468_L1','SRR2010469_L1','SRR28479534_L1','SRR29013570_L1','SRR29013571_L1'],
                'L1_ebax' => ['SRR29013568_L1','SRR29013569_L1'],
                'L2' => ['SRR28868053_L2','SRR28868054_L2','SRR28868055_L2'],
                'L3' => ['SRR13238604_L3','SRR13238605_L3','SRR13238606_L3'],
                'L4' => ['SRR23049963_L4','SRR23049955_L4','SRR23049961_L4'],
                'Adult' => ['SRR23049965_adult','SRR23049966_adult','SRR23049906_adult','SRR23049937_adult']];          
            break;
        default:
            $tissues = [];
            break;}
    
    // Process Data
    foreach ($tissues as $tissueName => $tissueColumns) {
        foreach ($tissueColumns as $column) {
            if (isset($row[$column])) {
                $data[$tissueName][] = (float)$row[$column];
            }
        }
    }

} else {
    // No rows found
    $tissues = [];
}

// ============================================================
// FIX 5: Close prepared statement
// ORIGINAL: (missing)
// ADD THIS:
// ============================================================
$stmt->close();

$response = [
    'geneFound' => $geneFound,
    'data' => $data,
    'tissues' => $tissues
];

// 3. EXIT explicitly to ensure no extra whitespace
echo json_encode($response);
$conn->close();
exit;

