<?php
require('../db.php'); // 
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
$species = isset($_GET['species']) ? $_GET['species'] : ''; // 默认物种为Human
$autocomplete = isset($_GET['autocomplete']) ? $_GET['autocomplete'] : false;

if ($autocomplete && !empty($term)) {
    $term = $conn->real_escape_string($term);

    // 构建SQL查询来过滤匹配的CLASH名字
    $sql = "SELECT clash_name FROM 20241021Clash_names WHERE species = '$species' AND clash_name LIKE '%$term%'";

    error_log("Executing SQL for autocomplete: $sql");
    $result = $conn->query($sql);

    if (!$result) {
        error_log("Query failed: " . $conn->error);
        die(json_encode(['error' => "Query failed: " . $conn->error]));
    }

    $clashNames = [];
    if ($result->num_rows > 0) {
        while ($row = $result->fetch_assoc()) {
            $clashNames[] = $row['clash_name'];
        }
    } else {
        error_log("No rows found for search term: $term");
    }

    echo json_encode($clashNames);
    $conn->close();
    exit();
}

error_log("Autocomplete parameter not set or term is empty");
die(json_encode(['error' => "Invalid request"]));
?>