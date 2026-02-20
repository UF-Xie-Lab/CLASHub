<?php
header('Content-Type: text/plain');

// 检查是否有POST请求
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    echo "POST request received.\n";
} else {
    echo "No POST request received.\n";
}

// 输出所有POST数据
echo "POST data:\n";
print_r($_POST);

$js_env = $_POST['env'] ?? null;
$ENV = 'prod';
if ($js_env === 'dev') {
    $ENV = 'dev';
} elseif ($js_env === 'test') {
    $ENV = 'test';
}
$ROOT = "/pubapps/mingyi.xie/clashhub/$ENV";

echo "[ENV FROM JS] $js_env\n";
echo "[ENV USING] $ENV\n";
echo "[ROOT] $ROOT\n";

$analysisType = isset($_POST['analysisType']) ? $_POST['analysisType'] : die("Error: analysisType not received.\n"); // 接收传递的分析类型

if ($analysisType == 'aqPairedEndRead') {
    $required_params = ['jobID', 'analysisType', 'aqseq_species', 'aqseq_email', 'umi5', 'umi3']; // 设置aqPairedEndRead所需的参数
} elseif ($analysisType == 'aqSingleEndRead') {
    $required_params = ['jobID', 'analysisType', 'aqseq_species', 'aqseq_email', 'umi5', 'umi3']; // 设置aqSingleEndRead所需的参数
} elseif ($analysisType == 'CleanRead') {
    $required_params = ['jobID', 'analysisType', 'aqseq_species', 'aqseq_email', 'umi5', 'umi3']; // 设置CleanRead所需的参数
} else {
    die("Error: Invalid analysisType received.\n"); // 处理无效的analysisType
}

// 检查必须的参数
foreach ($required_params as $param) {
    if (isset($_POST[$param])) {
        echo "$param: " . $_POST[$param] . "\n"; // 打印存在的参数值
    } else {
        echo "$param is missing.\n"; // 打印缺失参数的信息
    }
}

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {
    // SECURITY FIX: Sanitize Job ID to allow only safe characters
    $rawJobID = $_POST['jobID'] ?? '';
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $rawJobID)) {
        die("Error: Invalid Job ID format. Security violation detected.\n");
    }
    $jobID = $rawJobID;

    $species = $_POST['aqseq_species'] ?? 'not exist';
    $email = $_POST['aqseq_email'] ?? 'not exist';

    // SECURITY FIX: Force UMI values to be integers
    $umi5 = intval($_POST['umi5'] ?? 0);
    $umi3 = intval($_POST['umi3'] ?? 0);


    echo "PHP AQseq UMI 5': $umi5\n";
    echo "PHP AQseq UMI 3': $umi3\n";

    $baseStorageDir = "$ROOT/app/TemporaryStorage";
    $outputDir = $baseStorageDir . '/' . $jobID;
    $slurmScript = "$ROOT/app/php/Analyzer_php/aqseq_slurm.sbatch";

    echo "[Storage] $baseStorageDir\n";
    echo "[SLURM Script] $slurmScript\n";

    if (!file_exists($slurmScript)) {
        die("Error: SLURM script file does not exist at: $slurmScript\n");
    }

    $samples = [];
    if ($analysisType === 'aqPairedEndRead') {
        $sampleCount = 0;
        for ($i = 1; isset($_POST["aqseq_PairedEnd_outputFileName_$i"]); $i++) {
            // SECURITY FIX: Use basename() for files and whitelist adapters (A-Z only)
            $sample = [
                'outputFileName' => basename($_POST["aqseq_PairedEnd_outputFileName_$i"] ?? ''),
                'inputFile1' => $outputDir . '/' . basename($_POST["aqseq_PairedEnd_fileToUpload_fastq1_$i"] ?? ''),
                'inputFile2' => $outputDir . '/' . basename($_POST["aqseq_PairedEnd_fileToUpload_fastq2_$i"] ?? ''),
                'fivePrimeAdapter' => preg_replace('/[^a-zA-Z]/', '', $_POST["aqseq_PairedEnd_fivePrimeAdapter_$i"] ?? ''),
                'threePrimeAdapter' => preg_replace('/[^a-zA-Z]/', '', $_POST["aqseq_PairedEnd_threePrimeAdapter_$i"] ?? '')
            ];
            if (!file_exists($sample['inputFile1']) || !file_exists($sample['inputFile2'])) {
                die("Error: One or both target files for paired-end sample $i do not exist.\n");
            }

            $samples[] = $sample;
            $sampleCount++;
        }
    } elseif ($analysisType === 'aqSingleEndRead') {
        $sampleCount = 0;
        for ($i = 1; isset($_POST["aqseq_SingleEnd_outputFileName_$i"]); $i++) {
            // SECURITY FIX: Use basename() and sanitize adapter
            $sample = [
                'outputFileName' => basename($_POST["aqseq_SingleEnd_outputFileName_$i"] ?? ''),
                'inputFile1' => $outputDir . '/' . basename($_POST["aqseq_SingleEnd_fileToUpload_fastq1_$i"] ?? ''),
                'threePrimeAdapter' => preg_replace('/[^a-zA-Z]/', '', $_POST["aqseq_SingleEnd_threePrimeAdapter_$i"] ?? '')
            ];
            if (!file_exists($sample['inputFile1'])) {
                die("Error: Input file for single-end sample $i does not exist.\n");
            }

            $samples[] = $sample;
            $sampleCount++;
        }
    } elseif ($analysisType === 'CleanRead') {
        $sampleCount = 0;
        for ($i = 1; isset($_POST["aqseq_CleanedFasta_outputFileName_$i"]); $i++) {
            // SECURITY FIX: Use basename()
            $sample = [
                'outputFileName' => basename($_POST["aqseq_CleanedFasta_outputFileName_$i"] ?? ''),
                'inputFile1' => $outputDir . '/' . basename($_POST["aqseq_CleanedFasta_fileToUpload_fasta_$i"] ?? '')
            ];
            if (!file_exists($sample['inputFile1'])) {
                die("Error: Input file for cleaned fasta sample $i does not exist.\n");
            }

            $samples[] = $sample;
            $sampleCount++;
        }
    } else {
        die("Error: Unsupported analysis type.\n");
    }

    // 构建命令参数
    $sampleParams = [];
    foreach ($samples as $index => $sample) {
        $sampleIndex = $index + 1;
        
        $inputFile1 = "INPUT_FILE1_$sampleIndex=" . escapeshellarg($sample['inputFile1']);
        echo $inputFile1 . "\n"; // 打印INPUT_FILE1参数
        $sampleParams[] = $inputFile1; // 添加输入文件1
        
        if (isset($sample['inputFile2'])) {
            $inputFile2 = "INPUT_FILE2_$sampleIndex=" . escapeshellarg($sample['inputFile2']);
            echo $inputFile2 . "\n"; // 打印INPUT_FILE2参数
            $sampleParams[] = $inputFile2; // 添加输入文件2
        }
        
        $outputFile = "OUTPUT_FILE_$sampleIndex=" . escapeshellarg($sample['outputFileName']);
        echo $outputFile . "\n"; // 打印OUTPUT_FILE参数
        $sampleParams[] = $outputFile; // 添加输出文件名
        
        if (isset($sample['fivePrimeAdapter'])) {
            $fivePrimeAdapter = "FIVE_PRIME_ADAPTER_$sampleIndex=" . escapeshellarg($sample['fivePrimeAdapter']);
            echo $fivePrimeAdapter . "\n"; // 打印FIVE_PRIME_ADAPTER参数
            $sampleParams[] = $fivePrimeAdapter; // 添加5'适配器
        }
        
        if (isset($sample['threePrimeAdapter'])) {
            $threePrimeAdapter = "THREE_PRIME_ADAPTER_$sampleIndex=" . escapeshellarg($sample['threePrimeAdapter']);
            echo $threePrimeAdapter . "\n"; // 打印THREE_PRIME_ADAPTER参数
            $sampleParams[] = $threePrimeAdapter; // 添加3'适配器
        }
    }
    
    $sampleParams[] = "SAMPLE_COUNT=" . escapeshellarg($sampleCount); // 样品总数
    $sampleParams[] = "ANALYSIS_TYPE=" . escapeshellarg($analysisType); // 分析类型
    
    // 构建命令
    $command = "/opt/slurm/bin/sbatch --export=" . implode(',', $sampleParams) . 
        ",UMI5=" . escapeshellarg($umi5) . ",UMI3=" . escapeshellarg($umi3) .
        ",SPECIES=" . escapeshellarg($species) . 
        ",EMAIL=" . escapeshellarg($email) . 
        ",OUTPUT_DIR=" . escapeshellarg($outputDir) . 
        ",jobID=" . escapeshellarg($jobID) . 
        ",ENVIRONMENT=" . escapeshellarg($ENV) . " " . // <--- ADD THIS LINE
        "--job-name=" . escapeshellarg($jobID) . " " . 
        escapeshellarg($slurmScript) . " 2>&1";

    echo "PHP AQ-seq Output directory: " . $outputDir . "\n";
    echo "PHP AQ-seq Species: " . $species . "\n"; // 显示选择的物种
    echo "PHP AQ-seq Email: " . $email . "\n"; // 显示电子邮件
    foreach ($samples as $index => $sample) {
        $sampleIndex = $index + 1;
        echo "PHP AQ-seq Sample $sampleIndex input: " . $sample['inputFile1'] . "\n";
        if (isset($sample['inputFile2'])) {
            echo "PHP AQ-seq Sample $sampleIndex input 2: " . $sample['inputFile2'] . "\n";
        }
        echo "PHP AQ-seq Sample $sampleIndex output: " . $sample['outputFileName'] . "\n";
        if (isset($sample['fivePrimeAdapter'])) {
            echo "PHP AQ-seq Sample $sampleIndex 5' Adapter: " . $sample['fivePrimeAdapter'] . "\n";
        }
        if (isset($sample['threePrimeAdapter'])) {
            echo "PHP AQ-seq Sample $sampleIndex 3' Adapter: " . $sample['threePrimeAdapter'] . "\n";
        }
    }

    exec($command, $output, $returnVar);

    // 根据返回状态码判断作业是否成功提交
    if ($returnVar == 0) {
        echo "Your analysis has been submitted to the SLURM queue. You will receive an email notification upon completion.\n";
    } else {
        // 如果作业提交失败，通知用户并展示错误信息
        echo "PHP AQ-seq There was an error submitting your analysis to the SLURM queue.\n";
        echo "PHP AQ-seq Debug: Return var - $returnVar\n";  // 显示返回的状态码，用于调试
        echo "PHP AQ-seq Debug: Output from command - \n";    // 显示命令的输出内容，用于调试
        foreach ($output as $line) {
            echo htmlspecialchars($line) . "\n";
        }
    }

} else {
    echo "No POST request received or execute parameter missing.\n";
}
?>
