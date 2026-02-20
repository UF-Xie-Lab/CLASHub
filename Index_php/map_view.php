<?php
ini_set('display_errors', 0);
error_reporting(0);

require '../db.php'; 
$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    error_log("Map Connection failed: " . $conn->connect_error); // Log for you 
    die("Map temporarily unavailable."); // Generic message for public 
}

$result = $conn->query("
    SELECT city, country, lat, lng 
    FROM web_analytics_hit 
    WHERE lat IS NOT NULL 
      AND lng IS NOT NULL 
      AND ts >= NOW() - INTERVAL 60 DAY
    GROUP BY lat, lng 
");

$markers = [];

if ($result) {
    while($row = $result->fetch_assoc()) {
        $row['city'] = htmlspecialchars($row['city'] ?? 'Unknown', ENT_QUOTES, 'UTF-8');
        $row['country'] = htmlspecialchars($row['country'] ?? 'Unknown', ENT_QUOTES, 'UTF-8');
        $markers[] = $row;
    }
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CLASHub Live Map</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; background: #111; }
        #map { height: 100vh; width: 100%; }
        .info-panel {
            position: absolute; top: 20px; right: 20px; z-index: 999;
            background: rgba(255,255,255,0.9); padding: 15px; border-radius: 8px;
            font-family: sans-serif; box-shadow: 0 0 15px rgba(0,0,0,0.5);
        }
    </style>
</head>
<body>

    <div class="info-panel">
        <h3>🌍 Active Visitors (Last 60 Days)</h3>
        <p>Showing <b><?php echo count($markers); ?></b> active locations.</p>
        <small style="color:#666">Updates when visitors browse.</small>
    </div>

    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // Initialize Map (Dark mode style)
        var map = L.map('map').setView([20, 0], 2);

        // Dark Matter Base Layer
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 19
        }).addTo(map);

        // Add Markers
        var data = <?php echo json_encode($markers); ?>;
        
        data.forEach(function(d) {
            L.circleMarker([d.lat, d.lng], {
                color: '#3b82f6',      // Blue border
                fillColor: '#60a5fa',  // Light blue fill
                fillOpacity: 0.7,
                radius: 6
            })
            .bindPopup("<b>" + d.city + ", " + d.country + "</b>")
            .addTo(map);
        });
    </script>
</body>
</html>