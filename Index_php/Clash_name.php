<?php
require('../db.php'); 
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

header('Content-Type: application/json'); // Tell browser this is JSON

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Connection failed."]));
}

// Get parameters
$term = isset($_GET['term']) ? $_GET['term'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : ''; 
$autocomplete = isset($_GET['autocomplete']) ? $_GET['autocomplete'] : false;

if ($autocomplete && !empty($term)) {
    
    // Use Prepared Statement for Security (Prevents SQL Injection)
    // Added LIMIT 10 to prevent browser crashing on common letters like "a"
    $stmt = $conn->prepare("SELECT clash_name FROM Name_CLASH_List WHERE species = ? AND clash_name LIKE ? LIMIT 10");
    
    if(!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        die(json_encode(['error' => "Database error"]));
    }

    $searchTerm = "%" . $term . "%";
    
    // Bind parameters: "ss" means string, string
    $stmt->bind_param("ss", $species, $searchTerm);
    
    $stmt->execute();
    $result = $stmt->get_result();

    $clashNames = [];
    while ($row = $result->fetch_assoc()) {
        $clashNames[] = $row['clash_name'];
    }

    echo json_encode($clashNames);
    
    $stmt->close();
    $conn->close();
    exit();
}

// If we reach here, request was invalid
echo json_encode([]); 
$conn->close();
?>