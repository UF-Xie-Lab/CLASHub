<?php
putenv('PATH=/opt/slurm/bin:/usr/local/bin:/usr/bin:/bin');
header('Content-Type: application/json');

// 获取传入的 jobname 参数，兼容 PHP 8.1+，防止 trim(null) 警告
$jobname_raw = $_GET['jobname'] ?? '';
$jobname = is_string($jobname_raw) ? trim($jobname_raw) : '';

$user = 'mingyi.xie';
$squeue = '/opt/slurm/bin/squeue';
// Path to processed output folders (symlinks) 
// Directory containing symlinks named by completed jobs
$phpDir = dirname(__DIR__);
$storageDir = $phpDir;

// 获取 pending jobs 名称列表
$pd_raw = shell_exec("$squeue -u $user -h -t PD -o %j");
$pending = $pd_raw ? array_filter(explode("\n", trim($pd_raw))) : [];

// 获取 running jobs 名称列表
$rt_raw = shell_exec("$squeue -u $user -h -t R -o %j");
$running = $rt_raw ? array_filter(explode("\n", trim($rt_raw))) : [];

$queuedCount  = count($pending);
$runningCount = count($running);

// Collect finished jobs by finding symlinks in the php directory
$finished = [];
$entries = scandir($storageDir);
foreach ($entries as $entry) {
    $path = $storageDir . DIRECTORY_SEPARATOR . $entry;
    if ($entry === '.' || $entry === '..') continue;
    // Only include symbolic links (processed outputs)
    if (is_link($path)) {
        // Exclude those already running or pending
        if (!in_array($entry, $running, true) && !in_array($entry, $pending, true)) {
            $finished[] = $entry;
        }
    }
}

// 合并队列顺序（先 running 后 pending 后 finished）
$allJobs = array_merge(
    array_reverse($running),
    array_reverse($pending),
    array_reverse($finished)
);

// 构建带 rank 的 job 列表
$rankedJobs = [];
foreach ($allJobs as $i => $jid) {
    $rankedJobs[] = [
        'name' => $jid,
        'rank' => $i + 1,
        'status' => in_array($jid, $running) ? 'running' 
                  : (in_array($jid, $pending) ? 'queued' : 'finished')
    ];
}

// 默认响应结构
$out = [
    'your_status' => 'not_found',
    'position'    => null,
    'queued'      => $queuedCount,
    'running'     => $runningCount,
    'all_jobs'    => $rankedJobs   // ✅ 包含全表
];

// 若指定 jobname，计算其状态与 rank
if ($jobname !== '') {
    if (in_array($jobname, $running, true)) {
        $pos = array_search($jobname, $running, true) + 1;
        $out['your_status'] = 'running';
        $out['position'] = $pos;
    } elseif (in_array($jobname, $pending, true)) {
        $pos = $runningCount + array_search($jobname, $pending, true) + 1;
        $out['your_status'] = 'queued';
        $out['position'] = $pos;
    }
}

$df_output = shell_exec("df -h /home/mingyi.xie/");
$df_lines  = explode("\n", trim($df_output));
if (isset($df_lines[1])) {
    $df_cols = preg_split('/\s+/', $df_lines[1]);

    // 原来取用量百分比（例如 "13%"）
    $used_percent_str = rtrim($df_cols[4], '%');      // "13"
    $used_percent     = intval($used_percent_str);    // 13
    $avail_percent    = 100 - $used_percent;          // 87

    $out['disk_usage'] = [
        'filesystem'      => $df_cols[0],
        'size'            => $df_cols[1],
        'used'            => $df_cols[2],
        'avail'           => $df_cols[3],
        'use_percent'     => $df_cols[4],          // 如需保留
        'avail_percent'   => $avail_percent        // 新增字段
    ];
}

$mem_output = shell_exec("free -m");
$mem_lines = explode("\n", trim($mem_output));
if (isset($mem_lines[1])) {
    $mem_cols = preg_split('/\s+/', $mem_lines[1]);
    $total = round($mem_cols[1] / 1024, 1);
    $used  = round($mem_cols[2] / 1024, 1);
    $avail = round($mem_cols[6] / 1024, 1);  // available memory
    $avail_percent = $total > 0 ? round(($avail / $total) * 100) : 0;

    $out['memory_usage'] = [
        'total' => $total,
        'used'  => $used,
        'avail' => $avail,
        'avail_percent' => $avail_percent
    ];
}

echo json_encode($out);
