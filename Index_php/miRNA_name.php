<?php
require '../db.php';

// 1. SECURITY FIX: Turn OFF error display (Log errors instead)
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

// 2. FIX: Set correct JSON header
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli($servername, $username, $password, $dbname);

// 3. SECURITY FIX: Do not reveal specific DB errors to user
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Connection failed."]));
}

$term = $_GET['term'] ?? '';
$species = $_GET['species'] ?? 'Mouse';
$autocomplete = $_GET['autocomplete'] ?? false;

if ($autocomplete && !empty($term)) {

    // 4. SECURITY FIX: Use Whitelisting for Tables (No direct SQL construction)
    $table = '';
    switch ($species) {
        case 'Mouse':          $table = 'miRNA_abundance_Mouse_CPM'; break;
        case 'Human':          $table = 'miRNA_abundance_Human_CPM'; break;
        case 'D.melanogaster': $table = 'miRNA_abundance_Drosophila_CPM'; break;
        case 'C.elegans':      $table = 'miRNA_abundance_Celegans_CPM'; break;
        default:               
            error_log("Unknown species: $species");
            die(json_encode(['error' => "Invalid species"]));
    }

    if ($table) {
        // 5. SECURITY FIX: Use Prepared Statements (The Gold Standard)
        // Added LIMIT 10 to improve performance
        $stmt = $conn->prepare("SELECT `miRNA_name` FROM `$table` WHERE `miRNA_name` LIKE ? LIMIT 10");
        
        if ($stmt) {
            $searchTerm = "%" . $term . "%";
            $stmt->bind_param("s", $searchTerm);
            $stmt->execute();
            $result = $stmt->get_result();

            $miRNANames = [];
            while ($row = $result->fetch_assoc()) {
                $miRNANames[] = $row['miRNA_name'];
            }
            
            echo json_encode($miRNANames);
            $stmt->close();
            exit;
        } else {
            error_log("Prepare failed: " . $conn->error);
            echo json_encode([]);
        }
    }
} else {
    echo json_encode([]);
}
?>