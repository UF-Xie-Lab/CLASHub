<?php
// Detect environment based on hostname
$host = $_SERVER['HTTP_HOST'] ?? '';
$isDev = (strpos($host, 'dev') !== false);

// Choose absolute path for DB.ini
$ini_path = $isDev
    ? "/pubapps/mingyi.xie/clashhub/dev/DB.ini"
    : "/pubapps/mingyi.xie/clashhub/prod/DB.ini";

// Load configuration
$dbConfig = parse_ini_file($ini_path, true);

// Select the matching section inside DB.ini
$env = $isDev ? 'dev' : 'prod';
$cfg = $dbConfig[$env];

// Assign connection variables
$servername = $cfg['host'];
$username   = $cfg['user'];
$password   = $cfg['pass'];
$dbname     = $cfg['db'];
?>
