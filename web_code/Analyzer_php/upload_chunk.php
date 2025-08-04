<?php
/**
 * upload_chunk.php
 * 以相对路径处理文件，不再硬编码 /pubapps/...，确保在容器和宿主机都能用。
 * 自动清理 7 天前生成的旧文件与符号链接。
 */

ini_set('display_errors', 0);          // 生产环境关闭直接错误输出
error_reporting(E_ALL);
error_log('upload_chunk.php called');

session_start();

/*-------------------------------------------------
 * 路径设置
 *------------------------------------------------*/
$APP_ROOT   = realpath(__DIR__ . '/..');              // /var/www/html
$TMP_DIR    = '/var/www/data/TemporaryStorage';        // 临时上传
// $SBATCH_DIR = '/var/www/data/Sbatch_documents';        // sbatch 结果
$SLURMLOG_DIR = '/pubapps/mingyi.xie/clashhub/prod/slurmlogs';

$jobID = $_POST['jobID'] ?? die('Error: jobID not received.');
$jobID  = basename($jobID);                           // 防止目录遍历
$targetDir = "$TMP_DIR/$jobID/";
error_log("Target directory to create: $targetDir");

// 检查上级目录是否可写
if (!is_writable(dirname($targetDir))) {
    error_log("Parent dir is not writable: " . dirname($targetDir));
}                   // /.../TemporaryStorage/<jobID>
$linkDir   = "$APP_ROOT/$jobID";  // 可保留用于兼容老路径

/*-------------------------------------------------
 * 清理 1 天前文件（1440 分钟）
 *------------------------------------------------*/
foreach ([
    "find $TMP_DIR     -mindepth 1 -mmin +4320 -exec rm -rf {} \\;",
    // "find $SBATCH_DIR  -mindepth 1 -mmin +4320 -exec rm -rf {} \\;",
    "find $SLURMLOG_DIR  -mindepth 1 -mmin +4320 -exec rm -rf {} \\;",
    "find $APP_ROOT    -type l   -mmin +4320 -exec rm {} +"
] as $cmd) {
    shell_exec($cmd);
}

/*-------------------------------------------------
 * 准备目标目录和符号链接
 *------------------------------------------------*/
if (!is_dir($targetDir) && !mkdir($targetDir, 0777, true)) {
    $error = error_get_last();
    error_log("mkdir failed: " . ($error['message'] ?? 'unknown error'));
    die(json_encode(['success' => false, 'message' => 'Cannot create target directory']));
}
// 日志记录实际写入路径
error_log("Uploading to: $targetDir");
/*-------------------------------------------------
 * 建立到 /var/www/html 的符号链接，便于浏览器访问
 *------------------------------------------------*/
$symlinkSuccess = true;
$symlinkMessage = "";

if (!file_exists($linkDir)) {
    if (symlink($targetDir, $linkDir)) {
        error_log("✅ Symlink created: $linkDir -> $targetDir");
        $symlinkMessage = "Symlink created successfully.";
    } else {
        $symlinkSuccess = false;
        $symlinkMessage = "Failed to create symlink: $linkDir";
        error_log("❌ Failed to create symlink from $linkDir to $targetDir");
    }
} else {
    $symlinkMessage = "Symlink already exists.";
}

/*-------------------------------------------------
 * 处理上传块
 *------------------------------------------------*/
$fileName   = basename($_POST['fileName'] ?? '');
$totalSize  = intval($_POST['totalSize'] ?? 0);
$offset     = intval($_POST['offset']   ?? 0);
$tmpUpload  = $_FILES['fileChunk']['tmp_name'] ?? '';

if (empty($fileName) || $totalSize <= 0 || !is_uploaded_file($tmpUpload)) {
    echo json_encode(['success' => false, 'message' => 'Invalid upload parameters']);
    exit;
}

$tempPath = $targetDir . $fileName . '.part';
if (file_put_contents($tempPath, file_get_contents($tmpUpload), FILE_APPEND) === false) {
    echo json_encode(['success' => false, 'message' => 'Failed to write chunk']);
    exit;
}

if ($offset + $_FILES['fileChunk']['size'] >= $totalSize) {
    // 最后一个块：改名为最终文件
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