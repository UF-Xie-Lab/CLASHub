<?php
header('Content-Type: text/plain');

echo "PHP CWD: " . getcwd() . "\n";
echo "All POST data received:\n";
echo "PHP FILE PATH: " . __FILE__ . "\n";
print_r($_POST);

// --------------------------
// 检测环境：优先使用 JS 传递的 env，否则回退到自动检测
// --------------------------
$js_env = $_POST['env'] ?? null;

if ($js_env === "dev") {
    $ENV = "dev";
} elseif ($js_env === "prod") {
    $ENV = "prod";
} else {
    // fallback to old auto-detection if JS did not send env
    $fullpath = __FILE__;
    if (strpos($fullpath, "/clashhub/dev/") !== false) {
        $ENV = "dev";
    } else {
        $ENV = "prod";
    }
}

echo "[ENV FROM JS] $js_env\n";
echo "[ENV USING] $ENV\n";

$ROOT = "/pubapps/mingyi.xie/clashhub/" . $ENV;

// 路径统一生成
$baseStorageDir = "$ROOT/app/TemporaryStorage";
$slurmScript    = "$ROOT/app/php/Analyzer_php/hyb_slurm.sbatch";

echo "[ROOT] $ROOT\n";
echo "[Storage] $baseStorageDir\n";
echo "[SLURM Script] $slurmScript\n";

if (!file_exists($slurmScript)) {
    die("Error: SLURM script missing: $slurmScript\n");
}


if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {
    $rawJobID = $_POST['jobID'] ?? '';
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $rawJobID)) {
        die("Error: Invalid Job ID format. Security violation detected.\n");
    }
    $jobID = $rawJobID;
    $hyb_outputFileName = basename($_POST['hyb_outputFileName'] ?? 'output');

    $species = $_POST['hyb_species'] ?? 'not exist';
    $email = $_POST['hyb_email'] ?? 'not exist';
    $uploadType = $_POST['uploadType'] ?? null;

    $outputDir = $baseStorageDir . '/' . $jobID;
    $outputFile = $outputDir . '/' . $hyb_outputFileName;

    if ($uploadType === 'fasta') {
        $cleanFastaName = basename($_POST['hyb_fileToUpload_fasta'] ?? '');
        $inputFile = $outputDir . '/' . $cleanFastaName;

        echo "php fasta Input fasta: $inputFile\n";
        if (!file_exists($inputFile)) die("Error: Target file does not exist.\n");

        $export_list = [
            "UPLOAD_TYPE=" . escapeshellarg($uploadType),
            "INPUT_FILE=" . escapeshellarg($inputFile),
            "OUTPUT_FILE=" . escapeshellarg($outputFile),
            "SPECIES=" . escapeshellarg($species),
            "EMAIL=" . escapeshellarg($email),
            "OUTPUT_DIR=" . escapeshellarg($outputDir),
            "jobID=" . escapeshellarg($jobID),
            "FIVE_PRIME_ADAPTER='none'",
            "THREE_PRIME_ADAPTER='none'",
            "ENVIRONMENT=" . escapeshellarg($ENV)
        ];

        $export_string = implode(",", $export_list);

        $command = "/opt/slurm/bin/sbatch " .
                   "--export=$export_string " .
                   "--job-name=" . escapeshellarg($jobID) . " " .
                   escapeshellarg($slurmScript) . " 2>&1";
    } else if ($uploadType === 'fastq') {
        $cleanFastq1 = basename($_POST['hyb_fileToUpload_fastq1'] ?? '');
        $cleanFastq2 = basename($_POST['hyb_fileToUpload_fastq2'] ?? '');
        
        $inputFile1 = $outputDir . '/' . $cleanFastq1;
        $inputFile2 = $outputDir . '/' . $cleanFastq2;

        $fivePrimeAdapter = preg_replace('/[^a-zA-Z]/', '', $_POST['hyb_fivePrimeAdapter']);
        $threePrimeAdapter = preg_replace('/[^a-zA-Z]/', '', $_POST['hyb_threePrimeAdapter']);

        $hyb_umi5 = intval($_POST['hyb_umi5'] ?? 0);
        $hyb_umi3 = intval($_POST['hyb_umi3'] ?? 0);

        echo "php Input fastq1: $inputFile1\n";
        echo "php Input fastq2: $inputFile2\n";
        echo "php Five Prime Adapter: $fivePrimeAdapter\n";
        echo "php Three Prime Adapter: $threePrimeAdapter\n";
        echo "php UMI 5': $hyb_umi5\n";
        echo "php UMI 3': $hyb_umi3\n";

        if (!file_exists($inputFile1) || !file_exists($inputFile2)) {
            die("Error: One or both target files do not exist.\n");
        }

        $export_list = [
            "UPLOAD_TYPE=" . escapeshellarg($uploadType),
            "INPUT_FILE1=" . escapeshellarg($inputFile1),
            "INPUT_FILE2=" . escapeshellarg($inputFile2),
            "OUTPUT_FILE=" . escapeshellarg($outputFile),
            "SPECIES=" . escapeshellarg($species),
            "EMAIL=" . escapeshellarg($email),
            "OUTPUT_DIR=" . escapeshellarg($outputDir),
            "jobID=" . escapeshellarg($jobID),
            "FIVE_PRIME_ADAPTER=" . escapeshellarg($fivePrimeAdapter),
            "THREE_PRIME_ADAPTER=" . escapeshellarg($threePrimeAdapter),
            "UMI5=" . escapeshellarg($hyb_umi5),
            "UMI3=" . escapeshellarg($hyb_umi3),
            "ENVIRONMENT=" . escapeshellarg($ENV)
        ];

        $export_string = implode(",", $export_list);

        $command = "/opt/slurm/bin/sbatch " .
                "--export=$export_string " .
                "--job-name=" . escapeshellarg($jobID) . " " .
                escapeshellarg($slurmScript) . " 2>&1";
    } else {
        die("Error: Unsupported upload type.\n");
    }

    echo "Output file php : $outputFile\n";
    echo "Species php: $species\n";
    echo "email php: $email\n";

    exec($command, $output, $returnVar);

    if ($returnVar == 0) {
        echo "Your analysis has been submitted to the SLURM queue.\n";
    } else {
        echo "SLURM submission failed.\n";
        echo "Return var: $returnVar\n";
        echo "Command output:\n";
        foreach ($output as $line) echo htmlspecialchars($line) . "\n";
    }

} else {
    echo "No POST request received or execute parameter missing.\n";
}
?>
