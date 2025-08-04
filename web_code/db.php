<?php
$dbConfig = parse_ini_file(__DIR__ . "/DB.ini", true);
$prodConfig = $dbConfig['prod'];
$servername = $prodConfig['host'];
$username   = $prodConfig['user'];
$password   = $prodConfig['pass'];
$dbname     = $prodConfig['db'];
?>