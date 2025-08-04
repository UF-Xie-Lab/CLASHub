<?php
header('Content-Type: text/plain');
// 在 exec 之前加一行
echo "PHP CWD: " . getcwd() . "\n";
echo "All POST data received:\n";
print_r($_POST);

// 处理文件上传和执行 SLURM 脚本
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {

    $jobID = isset($_POST['jobID']) ? $_POST['jobID'] : die("Error: jobID not received.\n"); // 接收传递的 Job ID
    $hyb_outputFileName = $_POST['hyb_outputFileName']; // 接收输出文件名
    $species = isset($_POST['hyb_species']) ? $_POST['hyb_species'] : 'not exist';
    $email = isset($_POST['hyb_email']) ? $_POST['hyb_email'] : 'not exist';
    $uploadType = isset($_POST['uploadType']) ? $_POST['uploadType'] : null;
    $outputDir = '/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/' . $jobID; // 新文件夹路径
    $outputFile = $outputDir . '/' . $hyb_outputFileName; // 更新输出文件路径

    // $slurmScript = "/var/www/html/Analyzer_php/hyb_slurm.sbatch";
    $slurmScript = "/pubapps/mingyi.xie/clashhub/prod/app/php/Analyzer_php/hyb_slurm.sbatch";
    if (!file_exists($slurmScript)) {
        die("Error: SLURM script file does not exist at: $slurmScript\n");
    }

    if ($uploadType === 'fasta') {
        $inputFile = $outputDir . '/' . $_POST['hyb_fileToUpload_fasta']; // 更新输入文件路径
        echo "php fasta Input fasta: " . $inputFile . "\n";
        if (!file_exists($inputFile)) {
            die("Error: Target file does not exist.\n");
        }
        $command = "/opt/slurm/bin/sbatch " . 
        "--export=UPLOAD_TYPE=" . escapeshellarg($uploadType) . 
        ",INPUT_FILE=" . escapeshellarg($inputFile) . 
        ",OUTPUT_FILE=" . escapeshellarg($outputFile) . 
        ",SPECIES=" . escapeshellarg($species) . 
        ",EMAIL=" . escapeshellarg($email) . 
        ",OUTPUT_DIR=" . escapeshellarg($outputDir) . 
        ",jobID=" . escapeshellarg($jobID) . " " . 
        "--job-name=" . escapeshellarg($jobID) . " " . 
        escapeshellarg($slurmScript) . " 2>&1";

    } else if ($uploadType === 'fastq') { 
        $inputFile1 = $outputDir . '/' . $_POST['hyb_fileToUpload_fastq1']; // 更新输入文件1路径
        $inputFile2 = $outputDir . '/' . $_POST['hyb_fileToUpload_fastq2']; // 更新输入文件2路径
        $fivePrimeAdapter = isset($_POST['hyb_fivePrimeAdapter']) ? $_POST['hyb_fivePrimeAdapter'] : null; // 添加此行
        $threePrimeAdapter = isset($_POST['hyb_threePrimeAdapter']) ? $_POST['hyb_threePrimeAdapter'] : null; // 添加此行

        echo "php Input fastq1: " . $inputFile1 . "\n";
        echo "php Input fastq2: " . $inputFile2 . "\n";
        echo "php Five Prime Adapter: " . $fivePrimeAdapter . "\n"; // 打印5'适配器序列
        echo "php Three Prime Adapter: " . $threePrimeAdapter . "\n"; // 打印3'适配器序列
        if (!file_exists($inputFile1) || !file_exists($inputFile2)) {
            die("Error: One or both target files do not exist.\n");
        }
        $command = "/opt/slurm/bin/sbatch " . 
        "--export=UPLOAD_TYPE=" . escapeshellarg($uploadType) . 
        ",INPUT_FILE1=" . escapeshellarg($inputFile1) . 
        ",INPUT_FILE2=" . escapeshellarg($inputFile2) . 
        ",OUTPUT_FILE=" . escapeshellarg($outputFile) . 
        ",SPECIES=" . escapeshellarg($species) . 
        ",EMAIL=" . escapeshellarg($email) . 
        ",OUTPUT_DIR=" . escapeshellarg($outputDir) . 
        ",jobID=" . escapeshellarg($jobID) . 
        ",FIVE_PRIME_ADAPTER=" . escapeshellarg($fivePrimeAdapter) . // 传递5'适配器序列
        ",THREE_PRIME_ADAPTER=" . escapeshellarg($threePrimeAdapter) . // 传递3'适配器序列
        " --job-name=" . escapeshellarg($jobID) . " " . 
        escapeshellarg($slurmScript) . " 2>&1";
	# echo "Slurm: " . $command . "\n";
    } else {
        die("Error: Unsupported upload type.\n"); // 增加对未支持上传类型的处理
    }

    echo "Output file : " . $outputFile . "\n";
    echo "Species: " . $species . "\n"; // 显示选择的物种
    echo "email: " . $email . "\n"; // 显示选择的物种
 
    exec($command, $output, $returnVar);

    // 根据返回状态码判断作业是否成功提交
    if ($returnVar == 0) {
        echo "Your analysis has been submitted to the SLURM queue. You will receive an email notification upon completion.\n";
    } else {
        // 如果作业提交失败，通知用户并展示错误信息
        echo "There was an error submitting your analysis to the SLURM queue.\n";
        echo "Debug: Return var - $returnVar\n";  // 显示返回的状态码，用于调试
        echo "Debug: Output from command - \n";    // 显示命令的输出内容，用于调试
        foreach ($output as $line) {
            echo htmlspecialchars($line) . "\n";
        }
    }
} else {
    echo "No POST request received or execute parameter missing.\n";
}
?>
