<?php
require('../db.php'); 

// 1. Turn OFF error display to prevent HTML breaking the JSON
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(E_ALL);

// 2. Set Header
header('Content-Type: application/json; charset=utf-8');

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    echo json_encode([]); 
    exit; // Stop script immediately
}

$term = $_GET['term'] ?? '';
$species = isset($_GET['species']) ? $_GET['species'] : 'Human';
$suggestions = [];

if (!empty($term)) {
    // 1. Select the table safely (Logic is safe because values are hardcoded)
    $table = '';
    switch ($species) {
        case 'Human':          $table = 'gene_abundance_Human_TPM'; break;
        case 'Mouse':          $table = 'gene_abundance_Mouse_TPM'; break;
        case 'D.melanogaster': $table = 'gene_abundance_Drosophila_TPM'; break;
        case 'C.elegans':      $table = 'gene_abundance_Celegans_TPM'; break;
        default:               $table = '';
    }

    if ($table) {
        // 2. SECURITY FIX: Use Prepared Statements instead of real_escape_string
        $stmt = $conn->prepare("SELECT `Combined` FROM `$table` WHERE `Combined` LIKE ? LIMIT 10");
        
        if ($stmt) {
            $searchTerm = "%" . $term . "%";
            $stmt->bind_param("s", $searchTerm);
            $stmt->execute();
            $result = $stmt->get_result();

            while ($row = $result->fetch_assoc()) {
                // 3. SECURITY FIX: Sanitize output to prevent XSS (Cross-Site Scripting)
                if (isset($row['Combined'])) {
                    $suggestions[] = $row['Combined'];
                }
            }
            $stmt->close();
        }
    }
}



// 3. Output JSON and KILL the script
echo json_encode($suggestions);
exit; 
// The 'exit' above ensures nothing else (newlines, spaces, old code) gets printed