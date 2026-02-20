<?php
// File: Index_php/analytics_final.php
// Combined Dashboard: 
// 1. Daily Overview (Date | Total | Cities)
// 2. Detailed Search Log (Time | Location | Smart Query)

require '../db.php'; 

$SECRET = 'choose_a_very_long_random_string_here'; 

// RULE: Enforce the key check regardless of whether $SECRET is defined.
if (!isset($_GET['key']) || $_GET['key'] !== $SECRET) {
    http_response_code(403); 
    echo "Access Denied: Invalid or missing security key."; 
    exit;
}

// -------- DB Connection --------
mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    http_response_code(500); echo "DB connection failed."; exit;
}
$conn->set_charset('utf8mb4');

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }

function formatPathSmart($rawPath) {
    $decoded = urldecode($rawPath);
    
    // Gene Search
    if (strpos($rawPath, 'TargetAbundance_GeneName') !== false) {
        preg_match('/TargetAbundance_GeneName=([^&]+)/', $decoded, $geneMatch);
        preg_match('/gene_species_hidden=([^&]+)/', $decoded, $speciesMatch);
        $gene = $geneMatch[1] ?? 'Unknown Gene';
        $species = $speciesMatch[1] ?? '?';
        // SECURITY FIX: Wrap both $gene and $species in h()
        return "<span class='tag tag-gene'>🧬 Gene Search:</span> <strong>" . h($gene) . "</strong> <span class='sub'>(" . h($species) . ")</span>";
    }

    // miRNA Search
    if (strpos($rawPath, 'mirnaAbundance_name') !== false) {
        preg_match('/mirnaAbundance_name=([^&]+)/', $decoded, $mirnaMatch);
        preg_match('/mirna_species_hidden=([^&]+)/', $decoded, $speciesMatch);
        $mirna = $mirnaMatch[1] ?? 'Unknown miRNA';
        $species = $speciesMatch[1] ?? '?';
        // SECURITY FIX: Wrap both $mirna and $species in h()
        return "<span class='tag tag-mirna'>🔬 miRNA Search:</span> <strong>" . h($mirna) . "</strong> <span class='sub'>(" . h($species) . ")</span>";
    }

    // CLASH Target Search
    if (strpos($rawPath, 'index_CLASH_name') !== false) {
        preg_match('/index_CLASH_name=([^&]+)/', $decoded, $nameMatch);
        preg_match('/CLASH_CellLine_text=([^&]+)/', $decoded, $cellMatch);
        if (empty($cellMatch[1])) preg_match('/CLASH_CellLine=([^&]+)/', $decoded, $cellMatch);
        $clashName = $nameMatch[1] ?? 'Unknown';
        $cellLine = $cellMatch[1] ?? '?';
        // SECURITY FIX: Wrap both $clashName and $cellLine in h()
        return "<span class='tag tag-clash'>🔗 CLASH Target:</span> <strong>" . h($clashName) . "</strong> <span class='sub'>(" . h($cellLine) . ")</span>";
    }

    // Standard Pages
    if ($rawPath === '/' || $rawPath === '/index.html') return "<span class='tag-home'>🏠 Homepage</span>";
    if (strpos($rawPath, 'time=') !== false) return "<span style='color:#9ca3af'>⏱️ Ping (Time Check)</span>";
    
    return h($decoded);
}

// --- 2. DATA PROCESSING: DAILY OVERVIEW (The New Feature) ---
// We fetch raw data grouped by Day + City, then process in PHP to merge them.
$qDaily = "
    SELECT DATE(ts) as day, city, country, COUNT(*) as hits
    FROM web_analytics_hit
    WHERE ts >= CURDATE() - INTERVAL 60 DAY
    GROUP BY day, country, city
    ORDER BY day DESC, hits DESC
";
$resDaily = $conn->query($qDaily);

$dailyStats = [];
if ($resDaily) {
    while ($row = $resDaily->fetch_assoc()) {
        $day = $row['day'];
        // Initialize day if not exists
        if (!isset($dailyStats[$day])) {
            $dailyStats[$day] = ['total' => 0, 'locations' => []];
        }
        
        // Add to total
        $dailyStats[$day]['total'] += $row['hits'];
        
        // Format location string: "City, CN (5)"
        $locName = $row['city'] ? h($row['city']) : 'Unknown';
        if ($row['country']) $locName .= ", " . h($row['country']);
        
        $dailyStats[$day]['locations'][] = [
            'name' => $locName,
            'count' => $row['hits']
        ];
    }
}

// --- 3. DATA PROCESSING: DETAILED LOGS (Existing Feature) ---
$qLogs = "
    SELECT ts, city, region, country, path, ua
    FROM web_analytics_hit
    WHERE ts >= CURDATE() - INTERVAL 60 DAY
    ORDER BY ts DESC
    LIMIT 5000
";
$resLogs = $conn->query($qLogs);

?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CLASHub Analytics</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
    :root { --fg: #1f2937; --bg: #f3f4f6; --card: #ffffff; --border: #e5e7eb; --primary: #3b82f6; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--fg); padding: 20px; margin: 0; }
    
    h1 { font-size: 1.5rem; margin-bottom: 20px; color: #111827; }
    h2 { font-size: 1.1rem; margin: 0 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid var(--border); color: #374151; }
    
    .card { background: var(--card); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 30px; padding: 20px; overflow-x: auto; }
    
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; padding: 10px; background: #f9fafb; color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 0.75rem; border-bottom: 1px solid var(--border); }
    td { padding: 12px 10px; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:last-child td { border-bottom: none; }
    
    /* Stats Badges */
    .badge { display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 12px; font-size: 0.8em; margin-right: 5px; margin-bottom: 4px; border: 1px solid #bae6fd; }
    .badge b { font-weight: 700; }
    .total-num { font-size: 1.1em; font-weight: bold; color: var(--primary); }
    
    /* Smart Path Styles */
    .tag { font-weight: bold; }
    .tag-gene { color: #d97706; }
    .tag-mirna { color: #2563eb; }
    .tag-clash { color: #7c3aed; }
    .tag-home { color: #059669; font-weight: 600; }
    .sub { font-size: 0.85em; color: #6b7280; }
    
    .device { font-size: 0.75em; color: #9ca3af; display: block; margin-top: 2px; }
    .loc-main { font-weight: 500; }
</style>
</head>
<body>

<h1>📊 CLASHub Analytics Dashboard</h1>

<div class="card">
    <h2>📅 Daily Traffic Overview (Last 60 Days)</h2>
    <table>
        <thead>
            <tr>
                <th style="width: 150px;">Date</th>
                <th style="width: 100px;">Total Visits</th>
                <th>Location Breakdown</th>
            </tr>
        </thead>
        <tbody>
            <?php if (!empty($dailyStats)): ?>
                <?php foreach ($dailyStats as $date => $data): ?>
                <tr>
                    <td><strong><?php echo $date; ?></strong></td>
                    
                    <td><span class="total-num"><?php echo $data['total']; ?></span></td>
                    
                    <td>
                        <?php foreach ($data['locations'] as $loc): ?>
                            <span class="badge">
                                <?php echo $loc['name']; ?> 
                                <b>(<?php echo $loc['count']; ?>)</b>
                            </span>
                        <?php endforeach; ?>
                    </td>
                </tr>
                <?php endforeach; ?>
            <?php else: ?>
                <tr><td colspan="3">No traffic data in the last 60 days.</td></tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<div class="card">
    <h2>🔍 User Search Activity (Detailed)</h2>
    <table>
        <thead>
            <tr>
                <th style="width: 160px;">Time</th>
                <th style="width: 200px;">Location</th>
                <th>Activity / Search Query</th>
            </tr>
        </thead>
        <tbody>
            <?php if ($resLogs && $resLogs->num_rows): ?>
                <?php while ($row = $resLogs->fetch_assoc()): ?>
                <tr>
                    <td style="color:#666; font-family:monospace;">
                        <?php echo h(substr($row['ts'], 5, 11)); ?>
                    </td>
                    
                    <td>
                        <div class="loc-main"><?php echo $row['city'] ? h($row['city']) : 'Unknown'; ?></div>
                        <div style="font-size:0.8em; color:#999;">
                            <?php echo h($row['region']); ?>, <?php echo h($row['country']); ?>
                        </div>
                        <span class="device">
                            <?php 
                                $ua = $row['ua'];
                                if (strpos($ua, 'iPhone')!==false) echo '📱 iPhone';
                                elseif (strpos($ua, 'Mac')!==false) echo '💻 Mac';
                                elseif (strpos($ua, 'Windows')!==false) echo '🖥️ PC';
                                elseif (strpos($ua, 'bot')!==false) echo '🤖 Bot';
                                else echo '📄 ' . substr($ua, 0, 15) . '...';
                            ?>
                        </span>
                    </td>
                    
                    <td>
                        <?php echo formatPathSmart($row['path']); ?>
                    </td>
                </tr>
                <?php endwhile; ?>
            <?php endif; ?>
        </tbody>
    </table>
</div>

</body>
</html>
<?php $conn->close(); ?>