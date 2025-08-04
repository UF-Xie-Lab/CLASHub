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

$analysisType = isset($_POST['analysisType']) ? $_POST['analysisType'] : die("Error: analysisType not received.\n"); // 接收传递的分析类型

if ($analysisType == 'TPM') {
    $required_params = ['jobID', 'analysisType', 'RNAseq_species', 'RNAseq_email', 'sampleTPM']; // 设置TPM所需的参数
} elseif ($analysisType == 'TPM_DESeq2') {
    $required_params = ['jobID', 'analysisType', 'RNAseq_species', 'RNAseq_email', 'controlSampleCount', 'treatmentSampleCount']; // 设置TPM_DESeq2所需的参数
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

// 处理文件上传和执行 SLURM 脚本
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {
    $jobID = isset($_POST['jobID']) ? $_POST['jobID'] : die("Error: jobID not received.\n"); // 接收传递的 Job ID
    $species = isset($_POST['RNAseq_species']) ? $_POST['RNAseq_species'] : 'not exist';
    $email = isset($_POST['RNAseq_email']) ? $_POST['RNAseq_email'] : 'not exist';

    $outputDir = '/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/' . $jobID; // 新文件夹路径

    $slurmScript = "/pubapps/mingyi.xie/clashhub/prod/app/php/Analyzer_php/RNAseq_slurm.sbatch";
    if (!file_exists($slurmScript)) {
        die("Error: SLURM script file does not exist at: $slurmScript\n");
    }

    // 构建所有样品的参数列表
    $samples = [];
    if ($analysisType === 'TPM') {
        $sampleTPM = isset($_POST['sampleTPM']) ? intval($_POST['sampleTPM']) : 0;
        $controlSampleCount = isset($_POST['controlSampleCount']) ? intval($_POST['controlSampleCount']) : 0;
        for ($i = 1; isset($_POST["RNAseq_outputFileName_$i"]); $i++) {
            $sample = [
                'outputFileName' => $_POST["RNAseq_outputFileName_$i"],
                'inputFile1' => $outputDir . '/' . $_POST["RNAseq_fileToUpload_fastq1_$i"],
                'inputFile2' => $outputDir . '/' . $_POST["RNAseq_fileToUpload_fastq2_$i"],
                'fivePrimeAdapter' => $_POST["RNAseq_fivePrimeAdapter_$i"],
                'threePrimeAdapter' => $_POST["RNAseq_threePrimeAdapter_$i"]
            ];

            // 检查输入文件是否存在
            if (!file_exists($sample['inputFile1']) || !file_exists($sample['inputFile2'])) {
                die("Error: One or both target files for sample $i do not exist.\n");
            }

            $samples[] = $sample;
        }
    } elseif ($analysisType === 'TPM_DESeq2') {
        $controlSampleCount = isset($_POST['controlSampleCount']) ? intval($_POST['controlSampleCount']) : 0;
        $treatmentSampleCount = isset($_POST['treatmentSampleCount']) ? intval($_POST['treatmentSampleCount']) : 0;
    
        for ($i = 1; $i <= $controlSampleCount; $i++) {
            $controlSample = [
                'outputFileName' => $_POST["controlOutputFileName_$i"], // 从表单获取输出文件名
                'inputFile1' => $outputDir . '/' . $_POST["controlFileToUpload_fastq1_$i"], // 获取上传的第一个输入文件的路径
                'inputFile2' => $outputDir . '/' . $_POST["controlFileToUpload_fastq2_$i"], // 获取上传的第二个输入文件的路径
                'fivePrimeAdapter' => $_POST["controlRNAseq_fivePrimeAdapter_$i"], // 从表单获取5'适配器
                'threePrimeAdapter' => $_POST["controlRNAseq_threePrimeAdapter_$i"] // 从表单获取3'适配器
            ];
        
            // 检查输入文件是否存在
            if (!file_exists($controlSample['inputFile1']) || !file_exists($controlSample['inputFile2'])) {
                die("Error: One or both target files for control sample $i do not exist.\n");
            }
        
            // 打印控制样本的数组内容
            echo "Deseq2 controlSample echo start\n\n";
            print_r($controlSample);
            echo "Deseq2 controlSample echo done\n\n"; // 添加换行以便于阅读输出
        
            $samples[] = $controlSample; // 将控制样本添加到样本数组中
        }
        

        for ($i = 1; $i <= $treatmentSampleCount; $i++) {
            $treatmentSample = [
                'outputFileName' => $_POST["treatmentOutputFileName_$i"],
                'inputFile1' => $outputDir . '/' . $_POST["treatmentFileToUpload_fastq1_$i"],
                'inputFile2' => $outputDir . '/' . $_POST["treatmentFileToUpload_fastq2_$i"],
                'fivePrimeAdapter' => $_POST["treatmentRNAseq_fivePrimeAdapter_$i"],
                'threePrimeAdapter' => $_POST["treatmentRNAseq_threePrimeAdapter_$i"]
            ];

            // 检查输入文件是否存在
            if (!file_exists($treatmentSample['inputFile1']) || !file_exists($treatmentSample['inputFile2'])) {
                die("Error: One or both target files for treatment sample $i do not exist.\n");
            }

            $samples[] = $treatmentSample;
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
        
        $inputFile2 = "INPUT_FILE2_$sampleIndex=" . escapeshellarg($sample['inputFile2']);
        echo $inputFile2 . "\n"; // 打印INPUT_FILE2参数
        $sampleParams[] = $inputFile2; // 添加输入文件2
        
        $outputFile = "OUTPUT_FILE_$sampleIndex=" . escapeshellarg($sample['outputFileName']);
        echo $outputFile . "\n"; // 打印OUTPUT_FILE参数
        $sampleParams[] = $outputFile; // 添加输出文件名
        
        $fivePrimeAdapter = "FIVE_PRIME_ADAPTER_$sampleIndex=" . escapeshellarg($sample['fivePrimeAdapter']);
        echo $fivePrimeAdapter . "\n"; // 打印FIVE_PRIME_ADAPTER参数
        $sampleParams[] = $fivePrimeAdapter; // 添加5'适配器
        
        $threePrimeAdapter = "THREE_PRIME_ADAPTER_$sampleIndex=" . escapeshellarg($sample['threePrimeAdapter']);
        echo $threePrimeAdapter . "\n"; // 打印THREE_PRIME_ADAPTER参数
        $sampleParams[] = $threePrimeAdapter; // 添加3'适配器
    }
    

    if ($analysisType === 'TPM') {
        $sampleCount = count($samples);
        $sampleParams[] = "SAMPLE_COUNT=" . escapeshellarg($sampleCount); // 样品总数
    } elseif ($analysisType === 'TPM_DESeq2') {
        $sampleParams[] = "CONTROL_SAMPLE_COUNT=" . escapeshellarg($controlSampleCount); // 控制样品数量
        $sampleParams[] = "TREATMENT_SAMPLE_COUNT=" . escapeshellarg($treatmentSampleCount); // 处理样品数量
    }
    
    // 添加分析类型变量
    $sampleParams[] = "ANALYSIS_TYPE=" . escapeshellarg($analysisType); // 分析类型
    
    // 构建命令，根据 analysisType 调整命令格式
    if ($analysisType === 'TPM') {
        $command = "/opt/slurm/bin/sbatch --export=" . implode(',', $sampleParams) . 
            ",SPECIES=" . escapeshellarg($species) . 
            ",EMAIL=" . escapeshellarg($email) . 
            ",OUTPUT_DIR=" . escapeshellarg($outputDir) . 
            ",jobID=" . escapeshellarg($jobID) . " " . 
            "--job-name=" . escapeshellarg($jobID) . " " . 
            escapeshellarg($slurmScript) . " 2>&1";
    } elseif ($analysisType === 'TPM_DESeq2') {
        $command = "/opt/slurm/bin/sbatch --export=" . implode(',', $sampleParams) . 
            ",SPECIES=" . escapeshellarg($species) . 
            ",EMAIL=" . escapeshellarg($email) . 
            ",OUTPUT_DIR=" . escapeshellarg($outputDir) . 
            ",jobID=" . escapeshellarg($jobID) . " " . 
            "--job-name=" . escapeshellarg($jobID) . " " . 
            escapeshellarg($slurmScript) . " 2>&1";
    }
    echo "PHP RNA-seq Output directory: " . $outputDir . "\n";
    echo "PHP RNA-seq Species: " . $species . "\n"; // 显示选择的物种
    echo "PHP RNA-seq Email: " . $email . "\n"; // 显示电子邮件
    foreach ($samples as $index => $sample) {
        $sampleIndex = $index + 1;
        echo "PHP RNA-seq Sample $sampleIndex fastq1: " . $sample['inputFile1'] . "\n";
        echo "PHP RNA-seq Sample $sampleIndex fastq2: " . $sample['inputFile2'] . "\n";
        echo "PHP RNA-seq Sample $sampleIndex output: " . $sample['outputFileName'] . "\n";
        echo "PHP RNA-seq Sample $sampleIndex 5' Adapter: " . $sample['fivePrimeAdapter'] . "\n";
        echo "PHP RNA-seq Sample $sampleIndex 3' Adapter: " . $sample['threePrimeAdapter'] . "\n";
    }

    exec($command, $output, $returnVar);

    // 根据返回状态码判断作业是否成功提交
    if ($returnVar == 0) {
        echo "Your analysis has been submitted to the SLURM queue. You will receive an email notification upon completion.\n";
    } else {
        // 如果作业提交失败，通知用户并展示错误信息
        echo "PHP RNA-seq There was an error submitting your analysis to the SLURM queue.\n";
        echo "PHP RNA-seq Debug: Return var - $returnVar\n";  // 显示返回的状态码，用于调试
        echo "PHP RNA-seq Debug: Output from command - \n";    // 显示命令的输出内容，用于调试
        foreach ($output as $line) {
            echo htmlspecialchars($line) . "\n";
        }
    }



} else {
    echo "No POST request received or execute parameter missing.\n";
}
?>
