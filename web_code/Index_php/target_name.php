<?php
require('../db.php'); 
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// 创建数据库连接
$conn = new mysqli($servername, $username, $password, $dbname);

// 检查连接
if ($conn->connect_error) {
    error_log("Connection failed: " . $conn->connect_error);
    die(json_encode(['error' => "Connection failed: " . $conn->connect_error]));
}

// 获取查询参数
$term = isset($_GET['term']) ? $_GET['term'] : '';
$species = isset($_GET['species']) ? $_GET['species'] : ''; 
$autocomplete = isset($_GET['autocomplete']) ? $_GET['autocomplete'] : false;

if ($autocomplete && !empty($term)) {
    $term = $conn->real_escape_string($term);
    // 根据物种选择不同的SQL查询
    switch ($species) {
        case 'Mouse':
            $sql = "SELECT `Combined` FROM `20240822_mousegenetpm` WHERE `Combined` LIKE '%$term%'";
            break;
        case 'Human':
            $sql = "SELECT `Combined` FROM `20240903_humangenetpm` WHERE `Combined` LIKE '%$term%'";
            break;
        case 'D.melanogaster':
            $sql = "SELECT `Combined` FROM `20240904_drosophilagenetpm` WHERE `Combined` LIKE '%$term%'";
            break;
        case 'C.elegans':
            $sql = "SELECT `Combined` FROM `celegansgenetpm20250801` WHERE `Combined` LIKE '%$term%'";
            break;
        default:
            error_log("Unknown species: $species");
            die(json_encode(['error' => "Unknown species: $species"]));
    }

    error_log("Executing SQL for autocomplete: $sql");
    $result = $conn->query($sql);

    if (!$result) {
        error_log("Query failed: " . $conn->error);
        die(json_encode(['error' => "Query failed: " . $conn->error]));
    }

    $geneNames = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $geneNames[] = $row['Combined'];
        }
    } else {
        error_log("No rows found for search term: $term");
    }

    echo json_encode($geneNames);
    $conn->close();
    exit();
}

error_log("Autocomplete parameter not set or term is empty");
die(json_encode(['error' => "Invalid request"]));

?>
