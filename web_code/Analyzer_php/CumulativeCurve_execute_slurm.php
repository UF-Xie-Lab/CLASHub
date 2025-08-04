<?php
header('Content-Type: application/json');
require '/pubapps/mingyi.xie/clashhub/prod/db.php';
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Create database connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Connection failed: " . $conn->connect_error]));
}

// Determine request type
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {

    // Receive uploaded file path and output file name
    $CumulativeCurve_species = isset($_POST['CumulativeCurve_species']) ? $_POST['CumulativeCurve_species'] : 'not specified';
    $CumulativeCurve_mirnaName = $_POST['CumulativeCurve_mirnaName'];
    $CumulativeCurve_BaseMean = $_POST['CumulativeCurve_BaseMean'];
    $CumulativeCurve_email = $_POST['CumulativeCurve_email']; // Receive email address
    $CumulativeCurve_jobID = $_POST['jobID']; // Receive jobID
    $outputDir = '/pubapps/mingyi.xie/clashhub/prod/app/TemporaryStorage/' . $CumulativeCurve_jobID; // New directory path

    // Ensure output directory exists
    if (!file_exists($outputDir)) {
        mkdir($outputDir, 0777, true);
    }

    $CumulativeCurve_fileToUpload = $outputDir . '/' . $_POST['CumulativeCurve_fileToUpload']; // Updated input file path
    $CumulativeCurve_outputFileName = $outputDir . '/' . basename($_POST['CumulativeCurve_outputFileName']); // Updated output file path

    // Check if file exists
    if (!file_exists($CumulativeCurve_fileToUpload)) {
        die(json_encode(['error' => "Error: Deseq2 input file does not exist."]));
    }

    // Define the SLURM script path
    $CumulativeCurve_slurmScript = "/pubapps/mingyi.xie/clashhub/prod/app/php/Analyzer_php/CumulativeCurve_slurm.sbatch";
    if (!file_exists($CumulativeCurve_slurmScript)) {
        die(json_encode(['error' => "Error: SLURM script file does not exist at: $CumulativeCurve_slurmScript"]));
    }

    // Build and execute the SLURM sbatch command
    $CumulativeCurve_command = "/opt/slurm/bin/sbatch --export="
    . "CumulativeCurve_INPUT_FILE=" . escapeshellarg($CumulativeCurve_fileToUpload) . ","
    . "CumulativeCurve_SPECIES=" . escapeshellarg($CumulativeCurve_species) . ","
    . "CumulativeCurve_mirnaName=" . escapeshellarg($CumulativeCurve_mirnaName) . ","
    . "CumulativeCurve_BaseMean=" . escapeshellarg($CumulativeCurve_BaseMean) . ","
    . "CumulativeCurve_outputFileName=" . escapeshellarg($CumulativeCurve_outputFileName) . ","
    . "CumulativeCurve_EMAIL=" . escapeshellarg($CumulativeCurve_email) . ","
    . "CumulativeCurve_JOBID=" . escapeshellarg($CumulativeCurve_jobID) . " "
    . "--job-name=" . escapeshellarg($CumulativeCurve_jobID) . " "
    . escapeshellarg($CumulativeCurve_slurmScript)
    . " 2>&1";

    exec($CumulativeCurve_command, $CumulativeCurve_output, $CumulativeCurve_returnVar);

    // Determine if the job was successfully submitted
    if ($CumulativeCurve_returnVar == 0) {
        echo json_encode(["message" => "Your analysis has been submitted to the SLURM queue. You will receive an email notification upon completion."]);
    } else {
        $error_message = "There was an error submitting your analysis to the SLURM queue.\n";
        $error_message .= "Debug: Return var - $CumulativeCurve_returnVar\n";
        $error_message .= "Debug: Output from command - \n";
        foreach ($CumulativeCurve_output as $line) {
            $error_message .= htmlspecialchars($line) . "\n";
        }
        echo json_encode(["error" => $error_message]);
    }
} elseif ($_SERVER["REQUEST_METHOD"] == "GET" && isset($_GET['autocomplete'])) {
    // **Handle autocomplete functionality**

    // Get query parameters
    $term = isset($_GET['term']) ? $_GET['term'] : '';
    $species = isset($_GET['species']) ? $_GET['species'] : 'Mouse'; // Default species

    if (!empty($term) && !empty($species)) {
        $term = $conn->real_escape_string($term);
        $species = $conn->real_escape_string($species);

        // Use the new combined table
        $table = '20241115_mirnaname_cumulativecurve';

        // Prepare the SQL query
        $sql = "SELECT DISTINCT `miRNA_family` FROM `$table` WHERE `Species` = '$species' AND `miRNA_family` LIKE '%$term%' LIMIT 10";
        error_log("Executing SQL for autocomplete: $sql");
        $result = $conn->query($sql);

        if (!$result) {
            error_log("Query failed: " . $conn->error);
            die(json_encode(['error' => "Query failed: " . $conn->error]));
        }

        $miRNANames = [];
        while ($row = $result->fetch_assoc()) {
            $miRNANames[] = $row['miRNA_family'];
        }

        echo json_encode($miRNANames);
        $conn->close();
        exit();
    } else {
        error_log("Term is empty");
        die(json_encode(['error' => "Invalid request: term is empty"]));
    }
} else {
    error_log("Invalid request method or parameters");
    die(json_encode(['error' => "Invalid request"]));
}
?>