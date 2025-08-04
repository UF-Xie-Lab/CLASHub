<?php
require('../db.php');
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
$geneName = isset($_GET['TargetAbundance_GeneName']) ? $_GET['TargetAbundance_GeneName'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : 'Mouse'; // 默认物种为Mouse

if (empty($geneName)) {
    error_log("gene name is empty");
    die(json_encode(['error' => "miRNA_php name is required."]));
}

$geneName = $conn->real_escape_string($geneName);

// 根据物种选择SQL查询
switch ($species) {
    case 'Mouse':
        $sql = "SELECT * FROM `20240822_mousegenetpm` WHERE `Combined` LIKE '%$geneName%'";
        break;
    case 'Human':
        // 占位符SQL查询
        $sql = "SELECT * FROM `20240903_humangenetpm` WHERE `Combined` LIKE '%$geneName%'";
        break;
    case 'D.melanogaster':
        // 占位符SQL查询
        $sql = "SELECT * FROM `20240904_drosophilagenetpm` WHERE `Combined` LIKE '%$geneName%'";
        break;
    case 'C.elegans':
        // 占位符SQL查询
        $sql = "SELECT * FROM `celegansgenetpm20250801` WHERE `Combined` LIKE '%$geneName%'";
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


    switch ($species) {
        case 'Mouse':
            $tissues = [
            'AdrenalGland' => ['SRR5273702_MaleAdrenalGland', 'SRR5273670_FemaleAdrenalGland', 'SRR5273654_FemaleAdrenalGland', 'SRR5273686_MaleAdrenalGland'],
            'BoneMarrow' => ['SRR5273648_FemaleBoneMarrow', 'SRR5273680_MaleBoneMarrow', 'SRR5273664_FemaleBoneMarrow','SRR5273696_MaleBoneMarrow'],
            'Brain' => ['SRR5273637_FemaleBrain', 'SRR5273639_MaleBrain', 'SRR5273641_MaleBrain', 'SRR5273673_FemaleBrain','SRR5273657_FemaleBrain','SRR5273635_FemaleBrain','SRR5273689_MaleBrain','SRR5273705_MaleBrain'],
            'EmbryonicStemCell' => ['ERR2640636_EmbryonicStemCell', 'ERR2640637_EmbryonicStemCell'],
            'Forestomach' => ['SRR5273662_FemaleForestomach', 'SRR5273694_MaleForestomach', 'SRR5273678_MaleForestomach', 'SRR5273646_FemaleForestomach'],
            'Heart' => ['SRR5273651_FemaleHeart', 'SRR5273683_MaleHeart', 'SRR5273667_FemaleHeart', 'SRR5273699_MaleHeart'],
            'iNeuron' => ['ERR2640652_neuron', 'ERR2640653_neuron', 'ERR2640654_neuron'],
            'Kidney' => ['SRR5273655_FemaleKidney', 'SRR5273671_FemaleKidney', 'SRR5273703_MaleKidney','SRR5273687_MaleKidney'],
            'LargeIntestine' => ['SRR5273676_MaleLargeIntestine', 'SRR5273692_MaleLargeIntestine', 'SRR5273660_FemaleLargeIntestine', 'SRR5273644_FemaleLargeIntestine'],
            'Liver' => ['SRR5273636_FemaleLiver', 'SRR5273656_FemaleLiver', 'SRR5273640_MaleLiver', 'SRR5273634_FemaleLiver','SRR5273638_MaleLiver','SRR5273672_FemaleLiver','SRR5273704_MaleLiver','SRR5273688_MaleLiver'],
            'Lung' => ['SRR5273668_FemaleLung', 'SRR5273700_MaleLung', 'SRR5273684_MaleLung', 'SRR5273652_FemaleLung'],
            'MEF' => ['SRR25443485_MEF', 'SRR25443484_MEF', 'SRR25443483_MEF'],
            'Muscle' => ['SRR5273643_FemaleMuscle', 'SRR5273691_MaleMuscle', 'SRR5273659_FemaleMuscle', 'SRR5273675_MaleMuscle'],
            'NeuralPrecursor' => ['ERR2640640_NeuralPrecursor', 'ERR2640641_NeuralPrecursor'],
            'Ovary' => ['SRR5273665_FemaleOvary', 'SRR5273649_FemaleOvary'],
            'Placenta' => ['SRR27386997_FemalePlacenta', 'SRR27386999_FemalePlacenta', 'SRR27386998_FemalePlacenta', 'SRR27387000_MalePlacenta','SRR27387002_MalePlacenta','SRR27387001_MalePlacenta'],
            'Skin' => ['SRR22952493_Skin', 'SRR22952494_Skin', 'SRR22952490_Skin', 'SRR22952491_Skin','SRR22952492_Skin'],
            'SmallIntestine' => ['SRR5273661_FemaleSmallIntestine', 'SRR5273693_MaleSmallIntestine', 'SRR5273677_MaleSmallIntestine', 'SRR5273645_FemaleSmallIntestine'],
            'Spleen' => ['SRR5273653_FemaleSpleen', 'SRR5273685_MaleSpleen', 'SRR5273669_FemaleSpleen','SRR5273701_MaleSpleen'],
            'Stomach' => ['SRR5273663_FemaleStomach', 'SRR5273647_FemaleStomach', 'SRR5273695_MaleStomach', 'SRR5273679_MaleStomach'],
            'Testis' => ['SRR5273681_MaleTestis', 'SRR5273697_MaleTestis'],
            'Thymus' => ['SRR5273650_FemaleThymus', 'SRR5273682_MaleThymus', 'SRR5273698_MaleThymus','SRR5273666_FemaleThymus'],
            'VesicularGland' => ['SRR5273658_Female_VesicularGland', 'SRR5273674_Male_VesicularGland', 'SRR5273690_MaleVesicularGland'],
            'StriatalCellHetsgNT' => ['CS1', 'CS2',],
            'StriatalCellHetzs8' => ['C1', 'C2'],
            'StriatalCellHomosgNT' => ['OS1', 'OS2'],
            'StriatalCellHomozs8' => ['O1', 'O2']
            ];
            break;
        case 'Human':
            $tissues = [
                'A549' => ['SRR28535493_A549','SRR28535494_A549','SRR28535495_A549','SRR21237863_A549','SRR21237869_A549','SRR21237879_A549','SRR18462418_A549'],
                'D425' =>  ['SRR16119415_D425','SRR16119416_D425','SRR11924485_D425','SRR11924486_D425','SRR8315029_D425'],
                'ES2' => ['SRR22410790_ES2','SRR22410791_ES2','SRR22410792_ES2','SRR26439462_ES2','SRR26439463_ES2','SRR26439464_ES2'],
                'HEK293T' => ['SRR24421974_HEK293T','SRR24421975_HEK293T','SRR24421976_HEK293T','SRR18074813_HEK293T','SRR18074814_HEK293T','SRR18074815_HEK293T','SRR18074816_HEK293T'],
                'Hela' => ['SRR30058518_Hela','SRR30058519_Hela','SRR30058520_Hela','SRR22407570_Hela','SRR22407571_Hela','SRR22407572_Hela','SRR18462415_Hela'],
                'HepG2' =>  ['SRR28685775_HepG2','SRR28685776_HepG2','SRR28685777_HepG2','SRR23387178_HepG2','SRR23387179_HepG2'],
                'H1299' => ['SRR18462412_H1299','SRR21237865_H1299','SRR21237873_H1299','SRR21237881_H1299'],
                'K562' =>  ['SRR18462409_K562','SRR13800753_K562','SRR13800754_K562','SRR13800737_K562','SRR13800738_K562','abSRR13800739_K562c'],
                'MB002' => ['SRR28341540_MB002','SRR28341542_MB002','SRR28341541_MB002','SRR28341543_MB002'],
                'MCF7' => ['SRR14915857_MCF7','SRR17944548_MCF7','SRR17944549_MCF7','SRR13296901_MCF7','SRR13296902_MCF7','SRR13296903_MCF7','SRR14915858_MCF7'],
                'MDA-MB-231' => ['SRR11544576_MDAMB231','SRR11544577_MDAMB231','SRR11544578_MDAMB231','SRR14870088_MDAMB231','SRR14870089_MDAMB231','SRR14870090_MDAMB231'],
                'Ovcar8' => ['SRR26536802_Ovcar8','SRR26536803_Ovcar8','SRR26536798_Ovcar8','SRR26536799_Ovcar8'],
                'T98G' => ['SRR10358029_T98G','SRR10358030_T98G','SRR10358031_T98G','SRR6881782_T98G','SRR6881783_T98G'],
                'U87MG' => ['SRR11433766_U87MG','SRR11433767_U87MG','SRR11433768_U87MG','SRR24991947_U87MG','SRR24991948_U87MG','SRR24991949_U87MG'],
                '501Mel' =>  ['SRR6163777_501Mel','SRR6163778_501Mel','SRR6163779_501Mel','SRR6163780_501Mel','SRR8473015_501Mel','SRR8473019_501Mel','SRR8473020_501Mel']
            ];
            break;
        case 'D.melanogaster':
            $tissues = [
                'S2scr' => ['SRR22129330_S2scr','SRR22129281_S2scr','SRR22129317_S2scr','SRR22129316_S2scr'],
                'S2WT' => ['SRR18048483_S2WT','SRR18048484_S2WT','SRR18048425_S2WT','SRR18048423_S2WT','SRR18048424_S2WT'],
                'S2Dora' => ['SRR18048427_S2Dora','SRR18048468_S2Dora','SRR18048426_S2Dora'],
                '2to4hEmbryosWT' => ['SRR18048437_2to4hEmbryosWT','SRR18048436_2to4hEmbryosWT','SRR18048435_2to4hEmbryosWT','SRR18048446_2to4hEmbryosWT'],
                '8to12hEmbryosWT' => ['SRR18048461_8to12hEmbryosWT','SRR18048433_8to12hEmbryosWT','SRR18048512_8to12hEmbryosWT','SRR18048481_8to12hEmbryosWT','SRR18048482_8to12hEmbryosWT','SRR18048434_8to12hEmbryosWT'],
                '8to12hEmbryosDora' => ['SRR18048499_8to12hEmbryosDora','SRR18048531_8to12hEmbryosDora','SRR18048442_8to12hEmbryosDora','SRR18048532_8to12hEmbryosDora'],
                '12to16hEmbryosWT' => ['SRR18048539_12to16hEmbryosWT','SRR18048525_12to16hEmbryosWT','SRR18048508_12to16hEmbryosWT','SRR18048459_12to16hEmbryosWT','SRR18048432_12to16hEmbryosWT','SRR18048465_12to16hEmbryosWT'],
                '12to16hEmbryosDora' => ['SRR18048448_12to16hEmbryosDora','SRR18048497_12to16hEmbryosDora','SRR18048529_12to16hEmbryosDora','SRR18048516_12to16hEmbryosDora'],
                '16to20hEmbryosWT' => ['SRR18048421_16to20hEmbryosWT','SRR18048538_16to20hEmbryosWT','SRR18048479_16to20hEmbryosWT','SRR18048463_16to20hEmbryosWT','SRR18048527_16to20hEmbryosWT'],
                '16to20hEmbryosDora' => ['SRR18048542_16to20hEmbryosDora','SRR18048443_16to20hEmbryosDora','SRR18048495_16to20hEmbryosDora','SRR18048501_16to20hEmbryosDora'],
                'flyscr' => ['SRR22129292_flyscr','SRR22129294_flyscr','SRR22129296_flyscr']
            ];
            break;
        case 'C.elegans':
            $tissues = [
                'embryos' => ['SRR23049957_embryos','SRR23049959_embryos','SRR23049928_embryos','SRR23049954_embryos'],
                'L1_wt' => ['SRR2010468_L1','SRR2010469_L1','SRR28479531_L1','SRR28479532_L1','SRR28479533_L1','SRR28479534_L1','SRR29013570_L1_wt','SRR29013571_L1_wt'],
                'L1_ebax' => ['SRR29013568_L1_exba1','SRR29013569_L1_exba1'],
                'L2' => ['SRR28868053_L2','SRR28868054_L2','SRR28868055_L2'],
                'L3' => ['SRR13238604_L3','SRR13238605_L3','SRR13238606_L3'],
                'L4' => ['SRR23049963_L4','SRR23049955_L4','SRR23049961_L4'],
                'Adult_wt' => ['SRR23049965_adult','SRR23049966_adult','SRR23049906_adult','SRR23049937_adult','SRR29013567_adult_wt'],
                'Adult_ebax' => ['SRR29013566_adult_exba1'],
            ];
            break;
        default:
            $tissues = []; // 默认值，如果没有匹配到任何物种
            break;}
    
// 处理数据
foreach ($tissues as $tissueName => $tissueColumns) {
    foreach ($tissueColumns as $column) {
        if (isset($row[$column])) {
            $data[$tissueName][] = (float)$row[$column];
        }
    }
}
} else {
    error_log("No rows found for target name: $geneName");
    $tissues = []; // ✅ 明确初始化为空，防止未定义变量报错
}

$response = [
    'geneFound' => $geneFound,
    'data' => $data,
    'tissues' => $tissues
];

$dataJson = json_encode($response);
error_log("JSON Data: " . $dataJson);

$conn->close();
echo $dataJson;
?>