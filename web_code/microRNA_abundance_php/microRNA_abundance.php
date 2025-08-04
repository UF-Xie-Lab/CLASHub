<?php
require '../db.php';
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// 创建数据库连接
$conn = new mysqli($servername, $username, $password, $dbname);

// 检查连接
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Connection failed: " . $conn->connect_error]));
}

// 获取查询参数
$miRNAName = isset($_GET['mirnaAbundance_name']) ? $_GET['mirnaAbundance_name'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : 'Mouse';  // 默认物种为 Mouse


if (empty($miRNAName)) {
    error_log("miRNA name is empty");
    die(json_encode(['error' => "miRNA_php name is required."]));
}

$miRNAName = $conn->real_escape_string($miRNAName);

// 根据物种选择不同的组织结构
switch ($species) {
    case 'Mouse':
        $tissues = [
            'Stomach_WT' => ['SRR24941020_Stomach', 'SRR24941009_Stomach', 'SRR24940990_Stomach', 'SRR11547042_Stomach'],
            'Stomach_Z8' => ['SRR24941006_Stomach', 'SRR24391639_Stomach', 'SRR24941025_Stomach', 'SRR24391619_Stomach','SRR24941013_Stomach'],
            'Skin_WT' => ['SRR24941019_Skin', 'SRR24940991_Skin', 'SRR24940997_Skin'],
            'Skin_Z8' => ['SRR24941024_Skin', 'SRR24391638_Skin', 'SRR24941007_Skin', 'SRR24391618_Skin','SRR24941014_Skin'],
            'Lung_WT' => ['SRR24940992_Lung', 'SRR24940998_Lung', 'SRR24941018_Lung'],
            'Lung_Z8' => ['SRR24391640_Lung', 'SRR24941008_Lung', 'SRR24391628_Lung', 'SRR11547037_Lung','SRR24941031_Lung','SRR24941015_Lung'],
            'Liver_WT' => ['SRR24941004_Liver', 'SRR24940989_Liver', 'SRR24941030_Liver','SRR11547036_Liver'],
            'Liver_Z8' => ['SRR24941010_Liver', 'SRR24391636_Liver', 'SRR24391616_Liver','SRR24941032_Liver','SRR24941016_Liver'],
            'Kidney_WT' => ['SRR24941001_Kidney', 'SRR24940993_Kidney', 'SRR24941029_Kidney', 'SRR11547035_Kidney'],
            'Kidney_Z8' => ['SRR24941011_Kidney', 'SRR24391611_Kidney', 'SRR24391615_Kidney', 'SRR24941033_Kidney', 'SRR24941017_Kidney'],
            'Intestine_WT' => ['SRR24941002_Intestine', 'SRR24940994_Intestine', 'SRR24941028_Intestine'],
            'Intestine_Z8' => ['SRR24941023_Intestine', 'SRR24941012_Intestine', 'SRR24391637_Intestine', 'SRR24391617_Intestine','SRR24941034_Intestine'],
            'Heart_WT' => ['SRR24941003_Heart', 'SRR24941027_Heart', 'SRR24940995_Heart','SRR11547034_Heart'],
            'Heart_Z8' => ['SRR24941022_Heart', 'SRR24391641_Heart', 'SRR24391629_Heart', 'SRR24941035_Heart','SRR24940999_Heart'],
            'Brain_WT' => ['SRR24941005_Brain', 'SRR11547029_Brain', 'SRR24941026_Brain', 'SRR24940996_Brain'],
            'Brain_Z8' => ['SRR24941021_Brain', 'SRR24941036_Brain', 'SRR24941000_Brain'],
            'Neuron_sgNT' => ['SRR13264632_sgNT_Neuron', 'SRR13264633_sgNT_Neuron', 'SRR13264634_sgNT_Neuron'],
            'Neuron_Z8' => ['SRR13264635_sgZ8_Neuron', 'SRR13264636_sgZ8_Neuron'],
            'MEF_sgNT' => ['SRR13264626_sgNT_MEF', 'SRR13264627_sgNT_MEF', 'SRR13264628_sgNT_MEF', 'SRR12650662_MEFsgNT','SRR12650663_MEFsgNT','SRR12650664_MEFsgNT'],
            'MEF_Z8' => ['SRR13264629_sgZ8_MEF', 'SRR13264630_sgZ8_MEF', 'SRR13264631_sgZ8_MEF', 'SRR12650665_MEFzs8KO','SRR12650666_MEFzs8KO','SRR12650667_MEFzs8KO'],
            'StriatalCellHet_sgNT' => ['Cscr1', 'Cscr2'],
            'StriatalCellHet_Z8' => ['Cko1', 'Cko2'],
            'StriatalCellHomo_sgNT' => ['HomoScr1', 'HomoScr2'],
            'StriatalCellHomo_Z8' => ['HomoKo1', 'HomoKo2']];
        $sql = "SELECT * FROM `20240812mouseaqseqnormalized` WHERE `miRNA_name` LIKE '%$miRNAName%'";
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
            'HelaWT' => ['SRR13377179_Hela','SRR13377180_Hela'],
            '239tWT' => ['SRR8311265_293T','SRR8311266_293T'],
            // 其他人类组织
        ];
        $sql = "SELECT * FROM `20240820humanaqseqnormalized` WHERE `miRNA_name` LIKE '%$miRNAName%'";
        break;

    case 'D.melanogaster':
        $tissues = [
            'S2WT' => ['SRR13264713_S2wt', 'SRR13264714_S2wt','SRR13264715_S2wt'],
            'S2zs8' => ['SRR13264716_S2zs8', 'SRR13264717_S2zs8','SRR13264718_S2zs8'],
            // 其他果蝇组织
        ];
        $sql = "SELECT * FROM `2024082drosophilaaqseqnormalized` WHERE `miRNA_name` LIKE '%$miRNAName%'";
        break;

    case 'C.elegans':
        $tissues = [
            'N2_EE' => ['N2_EE_A', 'N2_EE_B'],
            'Ebax_EE' => ['CZ9907_EE_A', 'CZ9907_EE_B'],

            'N2_LE' => ['N2_LE_D', 'N2_LE_D'],
            'Ebax_LE' => ['CZ9907_LE_D', 'CZ9907_LE_E'],

            'N2_EE' => ['N2_EE_A', 'N2_EE_B'],
            'Ebax_EE' => ['CZ9907_EE_A', 'CZ9907_EE_B'],

            'N2_L1' => ['N2_L1_1', 'N2_L1_2'],
            'Ebax_L1' => ['CZ9907_L1_1', 'CZ9907_L1_2'],

            'N2_L2' => ['N2_L2_1', 'N2_L2_2'],
            'Ebax_L2' => ['CZ9907_L2_1', 'CZ9907_L2_2'],

            'N2_L3' => ['N2_L3_1', 'N2_L3_2'],
            'Ebax_L3' => ['CZ9907_L3_1', 'CZ9907_L3_2'],

            'N2_L4' => ['N2_L4_1', 'N2_L4_2'],
            'Ebax_L4' => ['CZ9907_L4_1', 'CZ9907_L4_2'],

            'N2_Ad' => ['N2_Ad_A', 'N2_Ad_B'],
            'Ebax_Ad' => ['CZ9907_Ad_A', 'CZ9907_Ad_B'],

            'glp4' => ['glp-4_A', 'glp-4_B'],
            'glp4_ebax' => ['glp-4_ebax-1_A', 'glp-4_ebax-1_B']
        ];
        $sql = "SELECT * FROM `20240816mirna_celegans_normalized` WHERE `miRNA_name` LIKE '%$miRNAName%'";
        break;

    default:
        error_log("Unknown species: $species");
        die(json_encode(['error' => "Unknown species: $species"]));
}


error_log("Executing SQL: $sql");
$result = $conn->query($sql);

if (!$result) {
    error_log("Query failed: " . $conn->error);
    die(json_encode(['error' => "Query failed: " . $conn->error]));
}

$data = [];
$geneFound = false;

if ($result->num_rows > 0) {
    $geneFound = true;
    $row = $result->fetch_assoc();
    error_log("Query result: " . print_r($row, true));

    // 处理数据
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
    'tissues' => $tissues // 将tissues包含在响应中
];


$dataJson = json_encode($response);
error_log("JSON Data: " . $dataJson);

$conn->close();
echo $dataJson;
?>