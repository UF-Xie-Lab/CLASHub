<?php
// File: Index_php/track.php (Production / Secure Mode)

// -------------------------------------------------------------------------
// 1. Security Configuration
// -------------------------------------------------------------------------

// Disable error display to the user. 
// This prevents hackers from seeing file paths or database errors.
ini_set('display_errors', 0);

// Enable error logging (errors will be saved to the server's error log file)
ini_set('log_errors', 1);
error_reporting(E_ALL);

// -------------------------------------------------------------------------
// 2. Load Database Connection
// -------------------------------------------------------------------------

// Use an absolute path to find db.php reliably.
// __DIR__ is the current folder (Index_php), dirname(__DIR__) is the parent (php).
$db_file = dirname(__DIR__) . '/db.php';

if (!file_exists($db_file)) {
    // If db.php is missing, return 500 Internal Server Error silently.
    http_response_code(500);
    exit;
}

require_once $db_file;

// -------------------------------------------------------------------------
// 3. Helper Functions
// -------------------------------------------------------------------------

// Function to get the real client IP address
function client_ip() {
    // Check various headers for the IP (Cloudflare, Proxy, or Direct)
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','REMOTE_ADDR'] as $h) {
        if (!empty($_SERVER[$h])) {
            // If multiple IPs are present, take the first one
            return trim(explode(',', $_SERVER[$h])[0]);
        }
    }
    return null;
}

// -------------------------------------------------------------------------
// 4. Data Processing
// -------------------------------------------------------------------------

// Receive JSON payload from the browser (track.js)
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

// If JSON is invalid, use an empty array
if (!is_array($body)) {
    $body = [];
}

// Get User Info
$ip = client_ip();
// Hash the IP for privacy compliance (GDPR)
$ip_hash = $ip ? hash('sha256', $ip) : null;

// Sanitize String Inputs: Limit length to match Database schema
$path    = substr(strip_tags($body['path'] ?? ($_SERVER['REQUEST_URI'] ?? '/')), 0, 2048);
$referer = substr(strip_tags($body['ref']  ?? ($_SERVER['HTTP_REFERER'] ?? '')), 0, 1024);

// User Agent / Browser Info (max 512 chars)
$ua      = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 512);

// Detect if the visitor is a Bot/Crawler
$is_bot  = preg_match('/bot|crawl|spider/i', $ua) ? 1 : 0;

// SECURITY FIX: Sanitize strings and force numeric types for coordinates
$country = substr(strip_tags($body['country_code'] ?? ''), 0, 10);
$region  = substr(strip_tags($body['region'] ?? ''), 0, 64);
$city    = substr(strip_tags($body['city'] ?? ''), 0, 64);

// Use floatval to ensure coordinates are always numeric or NULL
$lat     = isset($body['lat']) ? floatval($body['lat']) : null;
$lng     = isset($body['lng']) ? floatval($body['lng']) : null;

// -------------------------------------------------------------------------
// 5. Database Insertion
// -------------------------------------------------------------------------

// Turn off mysqli error reporting to PHP output (Security)
mysqli_report(MYSQLI_REPORT_OFF);

// Connect to Database
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection silently
if ($conn->connect_error) {
    http_response_code(500);
    exit;
}

$conn->set_charset('utf8mb4');

// Prepare SQL Statement (Prevents SQL Injection attacks)
$sql = "INSERT INTO web_analytics_hit 
        (ts, ip, ip_hash, country, region, city, lat, lng, path, referer, ua, is_bot) 
        VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if ($stmt) {
    // Bind parameters:
    // s = string, d = double (for lat/lng), i = integer
    $stmt->bind_param("sssssddsssi", 
        $ip, 
        $ip_hash, 
        $country, 
        $region, 
        $city, 
        $lat, 
        $lng, 
        $path, 
        $referer, 
        $ua, 
        $is_bot
    );

    // Execute the query
    $stmt->execute();
    $stmt->close();
}

// Close connection
$conn->close();

// -------------------------------------------------------------------------
// 6. Response
// -------------------------------------------------------------------------

// Return 204 No Content (Successful, but no body to return)
http_response_code(204);
?>