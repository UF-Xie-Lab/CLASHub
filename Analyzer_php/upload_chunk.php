<?php
/**
 * upload_chunk.php
 * Final Optimized Version
 * * Features:
 * 1. Relative paths for container/host compatibility.
 * 2. Session lock removed for parallel uploads (high speed).
 * 3. Logic optimization: Only checks directory/symlink on the first chunk.
 * 4. Cleanup logic removed (handled by system Cron job).
 */

ini_set('display_errors', 0);          // Disable direct error output in production
error_reporting(E_ALL);
// error_log('upload_chunk.php called'); // Optional: Comment out to reduce log noise

// 1. Handle Session
session_start();
session_write_close(); // CRITICAL: Release lock immediately to allow parallel uploads

/*-------------------------------------------------
 * 2. Retrieve Parameters (Must be done FIRST)
 *------------------------------------------------*/
$jobID      = $_POST['jobID'] ?? die('Error: jobID not received.');
$jobID      = basename($jobID); // Prevent directory traversal
$fileName   = basename($_POST['fileName'] ?? '');
$totalSize  = intval($_POST['totalSize'] ?? 0);
$offset     = intval($_POST['offset']   ?? 0); // Get current chunk offset
$tmpUpload  = $_FILES['fileChunk']['tmp_name'] ?? '';

// Basic validation
if (empty($fileName) || $totalSize <= 0 || !is_uploaded_file($tmpUpload)) {
    echo json_encode(['success' => false, 'message' => 'Invalid upload parameters']);
    exit;
}

/*-------------------------------------------------
 * 3. Path Settings
 *------------------------------------------------*/
$APP_ROOT   = realpath(__DIR__ . '/..');              // e.g., /var/www/html
$TMP_DIR    = '/var/www/data/TemporaryStorage';       // Actual storage location
$targetDir  = "$TMP_DIR/$jobID/";
$linkDir    = "$APP_ROOT/$jobID";                     // Symlink location

/*-------------------------------------------------
 * 4. Cleanup Logic (REMOVED)
 *-------------------------------------------------
 * Optimization: Cleanup is now handled by a system Cron job 
 * (running daily at 2:30 AM) to save I/O during uploads.
 *------------------------------------------------*/

/*-------------------------------------------------
 * 5. One-time Setup (Only for the first chunk)
 *------------------------------------------------*/
$symlinkMessage = "";
$symlinkSuccess = true;

// Only check/create directories if this is the VERY FIRST chunk (Offset 0)
// This saves checking the disk thousands of times for large files.
if ($offset == 0) {
    // A. Create Target Directory
    if (!is_dir($targetDir)) {
        if (!mkdir($targetDir, 0777, true)) {
            $error = error_get_last();
            error_log("mkdir failed: " . ($error['message'] ?? 'unknown'));
            die(json_encode(['success' => false, 'message' => 'Cannot create target directory']));
        }
        // Explicitly ensure permissions (sometimes mkdir inherits restrictive umask)
        chmod($targetDir, 0777);
    }

    // B. Create Symlink (if it doesn't exist)
    if (!file_exists($linkDir)) {
        if (symlink($targetDir, $linkDir)) {
            // error_log("✅ Symlink created: $linkDir -> $targetDir");
            $symlinkMessage = "Symlink created successfully.";
        } else {
            $symlinkSuccess = false;
            $symlinkMessage = "Failed to create symlink";
            error_log("❌ Failed to create symlink from $linkDir to $targetDir");
        }
    }
}

/*-------------------------------------------------
 * 6. Write File Chunk
 *------------------------------------------------*/
$tempPath = $targetDir . $fileName . '.part';

// Append content to the file
if (file_put_contents($tempPath, file_get_contents($tmpUpload), FILE_APPEND) === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to write chunk']);
    exit;
}

/*-------------------------------------------------
 * 7. Completion Check
 *------------------------------------------------*/
// Clear cache to ensure we get the real file size
clearstatcache(); 

// Check if the file on disk matches the total expected size
if (filesize($tempPath) >= $totalSize) {
    // Rename .part to final filename
    rename($tempPath, $targetDir . $fileName);
    
    echo json_encode([
        'success' => true,
        'message' => 'File upload complete',
        'symlink' => $symlinkSuccess,
        'symlinkMessage' => $symlinkMessage
    ]);
} else {
    echo json_encode(['success' => true, 'message' => "Chunk $offset uploaded"]);
}
?>