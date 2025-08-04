function switchForm(formId) {
    var allSections = document.querySelectorAll('.form-section');
    var formAndImageContainer = document.getElementById('formAndImageContainer');

    if (formId) {
        // Reset CLASH upload vs. results view
        if (formId === 'hyb') {
            const uploadForm = document.getElementById('hyb_uploadForm');
            const resultDiv = document.getElementById('hyb_resultContainer');
            if (uploadForm) uploadForm.style.display = 'block';
            if (resultDiv) resultDiv.style.display = 'none';
        }

        // 显示所选的表单和对应的图片
        allSections.forEach(function(section) {
            if (section.id === formId) {
                section.classList.add('active');
                section.style.display = 'block';
                console.log(formId + " is now active.");
            } else {
                section.classList.remove('active');
                section.style.display = 'none';
            }
        });

        // 隐藏所有图片容器
        var allImageContainers = document.querySelectorAll('.image-section');
        allImageContainers.forEach(function(container) {
            container.style.display = 'none';
        });

        // 显示对应的图片容器
        if (formId === 'hyb') {
            document.getElementById('hyb_imageContainer').style.display = 'block';
        } else if (formId === 'aqseq') {
            document.getElementById('aqseq_imageContainer').style.display = 'block';
        } else if (formId === 'CumulativeCurve') {
            document.getElementById('CumulativeCurve_imageContainer').style.display = 'block';
        } else if (formId === 'RNAseq') {
            document.getElementById('RNAseq_imageContainer').style.display = 'block';
        } else if (formId === 'jobStatus') {
            document.getElementById('jobStatus').style.display = 'block';
        }

        // 移除默认布局类
        formAndImageContainer.classList.remove('default-layout');

        // 高亮当前菜单项
        document.querySelectorAll('#leftMenu li').forEach(function(menuItem) {
            if (menuItem.getAttribute('data-form') === formId) {
                menuItem.classList.add('selected-menu-item');
            } else {
                menuItem.classList.remove('selected-menu-item');
            }
        });
    } else {
        // 隐藏所有表单
        allSections.forEach(function(section) {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // 隐藏所有图片容器
        var allImageContainers = document.querySelectorAll('.image-section');
        allImageContainers.forEach(function(container) {
            container.style.display = 'none';
        });

        // 显示默认图片
        document.getElementById('default_imageContainer').style.display = 'block';

        // 移除所有菜单项的高亮状态
        document.querySelectorAll('#leftMenu li').forEach(function(menuItem) {
            menuItem.classList.remove('selected-menu-item');
        });

        // 添加默认布局类
        formAndImageContainer.classList.add('default-layout');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // 绑定左侧菜单的点击事件
    document.querySelectorAll('#leftMenu li').forEach(function(menuItem) {
        menuItem.addEventListener('click', function() {
            var formId = this.getAttribute('data-form');
            switchForm(formId);
        });
    });

    // 初始显示默认图片
    switchForm(); // 不传递参数，显示默认图片
});

// Job queue status updater
function updateQueueStatus() {
    fetch('./Analyzer_php/slurm_status.php')
      .then(res => res.json())
      .then(data => {
        document.getElementById('queuedCount').innerText = data.queued;
        document.getElementById('runningCount').innerText = data.running;
            // Update disk usage display
          if (data.disk_usage) {
            document.getElementById('diskSize').innerText        = data.disk_usage.size;
            document.getElementById('diskUsed').innerText        = data.disk_usage.used;
            document.getElementById('diskAvail').innerText       = data.disk_usage.avail;
            document.getElementById('diskAvailPercent').innerText = data.disk_usage.avail_percent;
          }
          if (data.memory_usage) {
            document.getElementById('memTotal').innerText = data.memory_usage.total;
            document.getElementById('memUsed').innerText = data.memory_usage.used;
            document.getElementById('memAvail').innerText = data.memory_usage.avail;
            document.getElementById('memAvailPercent').innerText = data.memory_usage.avail_percent;
          }
      })
      .catch(console.error);
}
  
  document.addEventListener('DOMContentLoaded', function() {
    var jobMenu = document.getElementById('menu-jobStatus');
    if (jobMenu) {
      jobMenu.addEventListener('click', function() {
        updateQueueStatus();
        setInterval(updateQueueStatus, 5000);
      });
    }
    var checkBtn = document.getElementById('jobIdCheck');
    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        var jobId = document.getElementById('jobIdInput').value;
        fetch('./Analyzer_php/slurm_status.php?jobname=' + encodeURIComponent(jobId))
          .then(res => res.json())
          .then(data => {
            const jobResult = document.getElementById('jobResult');
            // 在 all_jobs 里找对应 name
            const job = data.all_jobs.find(j => j.name === jobId);
            const url = `https://clashub.rc.ufl.edu/${jobId}`;
            // 用 job.status 优先，否则用 data.your_status
            const status = job ? job.status : data.your_status;
            let message = '';
      
            if (status === 'queued') {
              const maxSlots = 2;
              const runningCount = data.running;
              if (runningCount < maxSlots) {
                message = 'Your job can start immediately.';
              } else {
                const queuedJobs = data.all_jobs.filter(j => j.status === 'queued');
                const queuePosition = queuedJobs.findIndex(j => j.name === jobId) + 1;
                const availableSlots = Math.max(0, maxSlots - runningCount);
                const waitJobs = Math.max(0, queuePosition - availableSlots);
                const estimated = waitJobs * 6;
                message = `Your job is number ${queuePosition} in the queue. Estimated wait time: ${estimated} hours.`;
              }
            } else if (status === 'running') {
              message = `Job <strong>${jobId}</strong> is currently <span style="color:green;">running</span>.`;
            } else if (status === 'finished') {
              message = `Job <strong>${jobId}</strong> has <span style="color:blue;">finished</span>.`;
            } else {
              message = `Job <strong>${jobId}</strong> status: ${status}.`;
            }
      
            jobResult.innerHTML = `${message}<br>You can view it here: <a href="${url}" target="_blank">${url}</a>`;
          })
          .catch(err => {
            document.getElementById('jobResult').innerText = 'Error fetching job status';
          });
      });
    }
  });