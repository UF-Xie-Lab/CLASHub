<?php
header('Content-Type: application/json');

// ================= Debugging Settings =================
// Keep this enabled for now to catch any other issues.
ini_set('display_errors', 0);
error_reporting(0);

// ================= 1. Environment Definition =================
$current_env = $_POST['env'] ?? ($_GET['env'] ?? 'prod');

$PROD_ROOT = '/pubapps/mingyi.xie/clashhub/prod';
$DEV_ROOT  = '/pubapps/mingyi.xie/clashhub/dev';

// ================= 2. Database Connection =================
// FIX: Updated path to match the actual location: /app/php/db.php
$base_root_path = ($current_env === 'dev') ? $DEV_ROOT : $PROD_ROOT;
$path_to_db = $base_root_path . '/app/php/db.php';

if (!file_exists($path_to_db)) {
    // Return a JSON error if the file is still missing, instead of crashing.
    die(json_encode(['error' => "Server Error: db.php not found at $path_to_db"]));
}

require $path_to_db;

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die(json_encode(['error' => "Database Connection failed: " . $conn->connect_error]));
}

// Table name
$TABLE_NAME = '20251215_CumulativeCurve_miRNA_Seeds_familyName';

// ================= 3. Handle Execute (Submit Job) =================
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['execute'])) {
    $rawJobID = $_POST['jobID'] ?? '';
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $rawJobID)) {
        die(json_encode(['error' => "Invalid Job ID format."]));
    }
    $CumulativeCurve_jobID = $rawJobID;
    $CumulativeCurve_species = $_POST['CumulativeCurve_species'] ?? 'not specified';
    $CumulativeCurve_mirnaName = $_POST['CumulativeCurve_mirnaName'] ?? '';
    $CumulativeCurve_BaseMean = floatval($_POST['CumulativeCurve_BaseMean'] ?? 0);
    $CumulativeCurve_email = $_POST['CumulativeCurve_email'] ?? '';
    $CumulativeCurve_performAdvanced = $_POST['CumulativeCurve_performAdvanced'] ?? 'no';

    // --- B. Critical Step: Retrieve Seed by Name (SECURE VERSION) ---
    $stmt = $conn->prepare("SELECT `miRNA_seed` FROM `$TABLE_NAME` WHERE `species` = ? AND `miRNA_family_members` = ? LIMIT 1");
    $stmt->bind_param("ss", $CumulativeCurve_species, $CumulativeCurve_mirnaName);
    $stmt->execute();
    $result_seed = $stmt->get_result();
    $stmt->close();

    $extracted_seed = "UNKNOWN"; 
    
    if ($result_seed && $row = $result_seed->fetch_assoc()) {
        $extracted_seed = $row['miRNA_seed']; 
    } else {
        die(json_encode(['error' => "Error: Database logic error. Could not retrieve Seed for: $CumulativeCurve_mirnaName"]));
    }

    // --- C. Path Configuration ---
    if ($current_env === 'dev') { $base_path = $DEV_ROOT; } else { $base_path = $PROD_ROOT; }

    $outputDir = $base_path . '/app/TemporaryStorage/' . $CumulativeCurve_jobID; 
    $CumulativeCurve_slurmScript = $base_path . '/app/php/Analyzer_php/CumulativeCurve_slurm.sbatch';

    if (!file_exists($outputDir)) { die(json_encode(['error' => "Error: Storage dir not found"])); }
    
    $CumulativeCurve_fileToUpload = $outputDir . '/' . basename($_POST['CumulativeCurve_fileToUpload'] ?? '');
    $CumulativeCurve_outputFileName = $outputDir . '/' . basename($_POST['CumulativeCurve_outputFileName'] ?? 'output');

    if (!file_exists($CumulativeCurve_fileToUpload)) { die(json_encode(['error' => "Input file missing"])); }
    if (!file_exists($CumulativeCurve_slurmScript)) { die(json_encode(['error' => "SLURM script missing"])); }

    // --- D. Construct Submit Command ---
    $CumulativeCurve_command = "/opt/slurm/bin/sbatch --export="
    . "CumulativeCurve_ENV=" . escapeshellarg($current_env) . "," 
    . "CumulativeCurve_INPUT_FILE=" . escapeshellarg($CumulativeCurve_fileToUpload) . ","
    . "CumulativeCurve_SPECIES=" . escapeshellarg($CumulativeCurve_species) . ","
    . "CumulativeCurve_mirnaName=" . escapeshellarg($CumulativeCurve_mirnaName) . ","
    . "CumulativeCurve_SEED=" . escapeshellarg($extracted_seed) . "," 
    . "CumulativeCurve_ADVANCED=" . escapeshellarg($CumulativeCurve_performAdvanced) . "," 
    . "CumulativeCurve_BaseMean=" . escapeshellarg($CumulativeCurve_BaseMean) . ","
    . "CumulativeCurve_outputFileName=" . escapeshellarg($CumulativeCurve_outputFileName) . ","
    . "CumulativeCurve_EMAIL=" . escapeshellarg($CumulativeCurve_email) . ","
    . "CumulativeCurve_JOBID=" . escapeshellarg($CumulativeCurve_jobID) . " "
    . "--job-name=" . escapeshellarg($CumulativeCurve_jobID) . " "
    . escapeshellarg($CumulativeCurve_slurmScript) . " 2>&1";

    exec($CumulativeCurve_command, $CumulativeCurve_output, $CumulativeCurve_returnVar);

    if ($CumulativeCurve_returnVar == 0) {
        echo json_encode(["message" => "Job submitted successfully.", "seed_used" => $extracted_seed]);
    } else {
        $error_message = "Error submitting SLURM job.\n" . implode("\n", $CumulativeCurve_output);
        echo json_encode(["error" => $error_message]);
    }

// ================= 4. Handle Autocomplete & Validation =================
} elseif ($_SERVER["REQUEST_METHOD"] == "GET") {
    
    if (ob_get_length()) ob_clean(); 

    $term = $_GET['term'] ?? '';
    $validateName = $_GET['validate_mirna_name'] ?? null; 
    $species = $_GET['species'] ?? 'Mouse'; 

    // --- Scenario A: Strict Validation (Using Prepared Statements) ---
    if ($validateName) {
        $stmt = $conn->prepare("SELECT 1 FROM `$TABLE_NAME` WHERE `species` = ? AND `miRNA_family_members` = ? LIMIT 1");
        $stmt->bind_param("ss", $species, $validateName);
        $stmt->execute();
        $stmt->store_result();
        
        if ($stmt->num_rows > 0) {
            echo json_encode(['valid' => true]);
        } else {
            echo json_encode(['valid' => false]);
        }
        $stmt->close();
        exit();
    }

    // --- Scenario B: Autocomplete (Using Prepared Statements) ---
    if (isset($_GET['autocomplete']) && isset($_GET['term'])) {
        $searchTerm = "%" . $term . "%";
        
        $stmt = $conn->prepare("SELECT DISTINCT `miRNA_family_members` FROM `$TABLE_NAME` WHERE `species` = ? AND `miRNA_family_members` LIKE ? LIMIT 10");
        $stmt->bind_param("ss", $species, $searchTerm);
        $stmt->execute();
        $result = $stmt->get_result();

        if (!$result) {
            http_response_code(500);
            echo json_encode(['error' => "SQL Error"]);
            exit();
        }

        $miRNANames = [];
        while ($row = $result->fetch_assoc()) {
            $miRNANames[] = $row['miRNA_family_members'];
        }
        echo json_encode($miRNANames);
        $stmt->close();
        exit();
    }
}
?>