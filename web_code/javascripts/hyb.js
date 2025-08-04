let jobID; // 在全局范围内定义 jobID

// hyb_progressBars 和 hyb_fileNames 在 DOMContentLoaded 后初始化
let hyb_progressBars;
let hyb_fileNames;

// 添加用于验证文件名的函数
function hyb_isValidFileName(fileName) {
    const regex = /^[a-zA-Z0-9_.-]+$/;
    return regex.test(fileName);
}

document.addEventListener('DOMContentLoaded', function() {
    hyb_toggleUploadType(); // 页面加载时调用，设置正确的表单可见性

    // 【修改】在 DOM 就绪后初始化进度条引用并清空文件名数组
    hyb_progressBars = [
        { container: document.getElementById('hyb_progressBar1'), text: document.getElementById('hyb_progressText1') },
        { container: document.getElementById('hyb_progressBar2'), text: document.getElementById('hyb_progressText2') }
    ];
    hyb_fileNames = [];

    // Create custom buttons with CSS class linkage for file inputs
    function createCustomFileInput(fileInputId, buttonId, displayId, buttonText) {
        const fileInput = document.getElementById(fileInputId);
        const fileInputContainer = document.createElement('div');
        fileInputContainer.classList.add('custom-file-input');

        const customButton = document.createElement('button');
        customButton.type = 'button';
        customButton.id = buttonId;
        customButton.textContent = buttonText;
        customButton.classList.add('custom-button'); // 使用CSS类

        const fileNameDisplay = document.createElement('span');
        fileNameDisplay.id = displayId;
        fileNameDisplay.textContent = 'No file selected';
        fileNameDisplay.classList.add('file-name-display'); // 使用CSS类

        customButton.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                // 验证文件名
                if (!hyb_isValidFileName(file.name)) {
                    alert('Invalid file name. Only letters, numbers, underscores, hyphens, and periods are allowed in file names.');
                    fileInput.value = ''; // 清空文件输入
                    fileNameDisplay.textContent = 'No file selected';
                } else {
                    fileNameDisplay.textContent = file.name;
                }
            } else {
                fileNameDisplay.textContent = 'No file selected';
            }
        });

        fileInputContainer.appendChild(customButton);
        fileInputContainer.appendChild(fileNameDisplay);
        fileInput.style.display = 'none';

        fileInput.parentNode.insertBefore(fileInputContainer, fileInput);
    }

    // Apply to file inputs
    createCustomFileInput('hyb_fileToUpload_fastq1', 'customButton_fastq1', 'fileNameDisplay_hyb_fastq1', 'Select FASTQ R1 (.fastq.gz)');
    createCustomFileInput('hyb_fileToUpload_fastq2', 'customButton_fastq2', 'fileNameDisplay_hyb_fastq2', 'Select FASTQ R2 (.fastq.gz)');
    createCustomFileInput('hyb_fileToUpload_fasta', 'customButton_fasta', 'fileNameDisplay_hyb_fasta', 'Select Cleaned FASTA (.fasta.gz)');

    document.getElementById('hyb_uploadForm').addEventListener('submit', function(event) { // 确保ID与HTML中的表单ID匹配
        event.preventDefault(); // 阻止表单的默认提交行为
        // 【修改】每次提交前重置文件名映射
        hyb_fileNames = [];

        var uploadType = document.querySelector('input[name="hyb_uploadType"]:checked').value; // 获取被选中的上传类型
        let files = []; // 存储要上传的文件数组

        const hyb_outputFileName = document.getElementById('hyb_outputFileName').value;

        // 验证输出文件名
        if (!hyb_isValidFileName(hyb_outputFileName)) {
            alert('Invalid output file name. Only letters, numbers, underscores, hyphens, and periods are allowed.');
            return;
        }

        jobID = hyb_generateJobID(hyb_outputFileName, uploadType); // 增加 uploadType 参数

        if (uploadType === 'fasta') {
            const fileInputFasta = document.getElementById('hyb_fileToUpload_fasta');
            if (fileInputFasta.files.length === 0) {
                alert('Please select a file first!');
                return;
            }
            const fastaFileName = fileInputFasta.files[0].name;
            // 验证文件名
            if (!hyb_isValidFileName(fastaFileName)) {
                alert('Invalid file name for FASTA file. Only letters, numbers, underscores, hyphens, and periods are allowed.');
                return;
            }
            if (!fastaFileName.endsWith('.fasta.gz')) {  // 检查文件扩展名
                alert('Please select a .fasta.gz file!');
                return;
            }
            files.push(fileInputFasta.files[0]);
            hyb_fileNames.push('FASTA');
        } else if (uploadType === 'fastq') {
            const fileInput1 = document.getElementById('hyb_fileToUpload_fastq1');
            const fileInput2 = document.getElementById('hyb_fileToUpload_fastq2');
            if (fileInput1.files.length === 0 || fileInput2.files.length === 0) {
                alert('Please select both fastq files first!');
                return;
            }
            const fastqFileName1 = fileInput1.files[0].name;
            const fastqFileName2 = fileInput2.files[0].name;
            // 验证文件名
            if (!hyb_isValidFileName(fastqFileName1) || !hyb_isValidFileName(fastqFileName2)) {
                alert('Invalid file name for FASTQ files. Only letters, numbers, underscores, hyphens, and periods are allowed.');
                return;
            }
            if (!fastqFileName1.endsWith('.fastq.gz') || !fastqFileName2.endsWith('.fastq.gz')) {
                alert('Please select .fastq.gz files for both FASTQ1 and FASTQ2!');
                return;
            }
            files.push(fileInput1.files[0]);
            files.push(fileInput2.files[0]);
            hyb_fileNames.push('FASTQ1');
            hyb_fileNames.push('FASTQ2');
        }

        const chunkSize = 2 * 1024 * 1024; // 设置块大小为2MB

        function hyb_uploadChunk(fileIndex = 0, offset = 0) {
            if (fileIndex >= files.length) {
                console.log('All files have been uploaded.');
                hyb_executeCode();
                document.getElementById('hyb_uploadButton').style.display = 'none';
                document.getElementById("hyb_progressText1").textContent = 'All files uploaded successfully!';
                return;
            }

            let file = files[fileIndex];
            const chunk = file.slice(offset, offset + chunkSize);
            const formData = new FormData();
            formData.append("fileChunk", chunk);
            formData.append("fileName", file.name);
            formData.append("offset", offset);
            formData.append("totalSize", file.size);
            formData.append("jobID", jobID);

        fetch('../Analyzer_php/upload_chunk.php', {
                method: 'POST',
                body: formData
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok.');
                }
                return response.json();
            }).then(data => {
                if (data.success) {
                    console.log('Chunk uploaded:', data.message);
                    offset += chunk.size;
                    const progress = Math.min(100, Math.round(offset / file.size * 100 * 100) / 100);
                    hyb_progressBars[fileIndex].text.textContent = `Uploading ${hyb_fileNames[fileIndex]}: ${progress}%`;
                    hyb_progressBars[fileIndex].container.style.width = progress + '%';
                    if (offset < file.size) {
                        hyb_uploadChunk(fileIndex, offset);
                    } else {
                        fileIndex++;
                        hyb_uploadChunk(fileIndex, 0);
                    }
                } else {
                    console.error('Upload failed:', data.message);
                    alert("Upload failed: " + data.message);
                }
            }).catch(error => {
                console.error('Error uploading chunk:', error);
            });
        }

        hyb_uploadChunk();
    });
});

function hyb_executeCode() {
    var uploadType = document.querySelector('input[name="hyb_uploadType"]:checked').value; // 获取被选中的上传类型
    const formData = new FormData();
    if (uploadType === 'fasta') {
        const hyb_fileToUpload_fasta = document.getElementById('hyb_fileToUpload_fasta').files[0].name; // 获取上传文件的名字
        formData.append('hyb_fileToUpload_fasta', hyb_fileToUpload_fasta); // 输入文件名
    } else if (uploadType === 'fastq') {
        const hyb_fileToUpload_fastq1 = document.getElementById('hyb_fileToUpload_fastq1').files[0].name; // 获取fastq1文件的名字
        const hyb_fileToUpload_fastq2 = document.getElementById('hyb_fileToUpload_fastq2').files[0].name; // 获取fastq2文件的名字

        const hyb_defaultFivePrimeAdapter = 'GATCGTCGGACTGTAGAACT'; // 默认5'适配器序列
        const hyb_defaultThreePrimeAdapter = 'TGGAATTCTCGGGTGCCAAG'; // 默认3'适配器序列

        const hyb_fivePrimeAdapter = document.getElementById('hyb_fivePrimeAdapter').value || hyb_defaultFivePrimeAdapter; // 获取5'适配器序列或使用默认值
        const hyb_threePrimeAdapter = document.getElementById('hyb_threePrimeAdapter').value || hyb_defaultThreePrimeAdapter; // 获取3'适配器序列或使用默认值

        console.log('js hyb_fivePrimeAdapter:', hyb_fivePrimeAdapter); // 打印选中的物种
        console.log('js hyb_threePrimeAdapter:', hyb_threePrimeAdapter); // 打印选中的物种
        formData.append('hyb_fileToUpload_fastq1', hyb_fileToUpload_fastq1); // 添加fastq1文件名到表单数据中
        formData.append('hyb_fileToUpload_fastq2', hyb_fileToUpload_fastq2); // 添加fastq2文件名到表单数据中
        formData.append('hyb_fivePrimeAdapter', hyb_fivePrimeAdapter); // 添加5'适配器序列到表单数据中
        formData.append('hyb_threePrimeAdapter', hyb_threePrimeAdapter); // 添加3'适配器序列到表单数据中
    }

    const hyb_outputFileName = document.getElementById('hyb_outputFileName').value;
    const hyb_species = document.getElementById('hyb_species').value; // 获取选中的物种
    const hyb_email = document.getElementById('hyb_email').value; // 获取电子邮件地址
    console.log('Selected species:', hyb_species); // 打印选中的物种
    formData.append('jobID', jobID); // 将 jobID 添加到表单数据中
    formData.append('uploadType', uploadType);
    formData.append('execute', 'true');
    formData.append('hyb_outputFileName', hyb_outputFileName); // 输出文件名
    formData.append('hyb_species', hyb_species); // 添加物种到表单数据中
    formData.append('hyb_email', hyb_email); // 添加电子邮件到表单数据中

    fetch('./Analyzer_php/hyb_execute_slurm.php', { // 发起一个fetch请求，目标是服务器上的'hyb_execute_slurm.php'脚本
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        return response.text();
    }).then(text => {
        console.log('Execute response:', text);
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your file has been successfully uploaded.</p>' +
            '<p>Your Job ID is: <span style="color: red;">' + jobID + '</span></p>' +
            '<p>Your Email is: <span style="color: red;">' + hyb_email + '</span></p>' +
            '<div id="hyb_queueInfo">Fetching queue status...</div>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + jobID + '">' +
            'https://clashhub.rc.ufl.edu/' + jobID + '</a></p>' +
            '<p><em>As a general reference:</em> analyzing a pair of fastq.gz files totaling 1GB typically takes about 3 hours. You can estimate your own runtime accordingly.</p>';
        // Fetch SLURM queue status for this job
        // corrected relative path: from the CLASH page the Analyzer_php folder is one level up
        fetch('../Analyzer_php/slurm_status.php?jobname=' + jobID)
          .then(res => res.json())
          .then(data => {
            let msg = '';
            if (data.your_status === 'queued') {
                const maxSlots = 2;
                const runningCount = data.running;
                if (runningCount < maxSlots) {
                  msg = 'Your job can start immediately.';
                } else {
                  const queuedJobs = data.all_jobs.filter(j => j.status === 'queued');
                  const queuePosition = queuedJobs.findIndex(j => j.name === jobID) + 1;
                  const availableSlots = Math.max(0, maxSlots - runningCount);
                  const waitJobs = Math.max(0, queuePosition - availableSlots);
                  const estimated = waitJobs * 6;
                  msg = `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
                }
              } else if (data.your_status === 'running') {
              msg = `Job <strong>${jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
              msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('hyb_queueInfo').innerHTML = msg;
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('hyb_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function hyb_toggleUploadType() {
    var uploadType = document.querySelector('input[name="hyb_uploadType"]:checked').value;
    var hyb_fastaUpload = document.getElementById('hyb_fastaUpload');
    var hyb_fastqUpload = document.getElementById('hyb_fastqUpload');

    if (uploadType === 'fasta') {
        hyb_fastaUpload.style.display = 'block';
        hyb_fastqUpload.style.display = 'none';
        document.getElementById('hyb_fileToUpload_fasta').required = true;
        document.getElementById('hyb_fileToUpload_fastq1').required = false;
        document.getElementById('hyb_fileToUpload_fastq2').required = false;

        if (!document.getElementById('hyb_fastaSampleDownload')) {
            var sampleDownloadDiv = document.createElement('div');
            sampleDownloadDiv.id = 'hyb_fastaSampleDownload';
            sampleDownloadDiv.classList.add('template-download');
            sampleDownloadDiv.innerHTML = `
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
                <p>You may download this FASTA file to test the analysis, but it's optional:</p>
                <a href="Samples/Sample_CLASH.fasta.gz" download>Sample CLASH FASTA</a>
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            `;
            hyb_fastaUpload.insertBefore(sampleDownloadDiv, hyb_fastaUpload.firstChild);
        }

        var fastqSampleDownloadDiv = document.getElementById('hyb_sampleDownloadLinks');
        if (fastqSampleDownloadDiv) {
            fastqSampleDownloadDiv.parentNode.removeChild(fastqSampleDownloadDiv);
        }

    } else if (uploadType === 'fastq') {
        hyb_fastaUpload.style.display = 'none';
        hyb_fastqUpload.style.display = 'block';
        document.getElementById('hyb_fileToUpload_fasta').required = false;
        document.getElementById('hyb_fileToUpload_fastq1').required = true;
        document.getElementById('hyb_fileToUpload_fastq2').required = true;

        if (!document.getElementById('hyb_sampleDownloadLinks')) {
            var sampleDownloadDiv = document.createElement('div');
            sampleDownloadDiv.id = 'hyb_sampleDownloadLinks';
            sampleDownloadDiv.classList.add('template-download');
            sampleDownloadDiv.innerHTML = `
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
                <p>You may download these two FASTQ files to test the analysis, but it's optional:</p>
                <a href="Samples/Sample_CLASH_R1.fastq.gz" download>Sample CLASH FASTQ 1</a> |
                <a href="Samples/Sample_CLASH_R2.fastq.gz" download>Sample CLASH FASTQ 2</a>
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            `;
            hyb_fastqUpload.insertBefore(sampleDownloadDiv, hyb_fastqUpload.firstChild);
        }

        var fastaSampleDownloadDiv = document.getElementById('hyb_fastaSampleDownload');
        if (fastaSampleDownloadDiv) {
            fastaSampleDownloadDiv.parentNode.removeChild(fastaSampleDownloadDiv);
        }
    }

    // Update the image based on upload type
    var hybImage = document.getElementById('hyb_image');
    if (uploadType === 'fastq') {
        hybImage.src = 'image/CLASH_pipeline_fastq.png';
        hybImage.alt = 'CLASH FASTQ Analysis Pipeline';
    } else if (uploadType === 'fasta') {
        hybImage.src = 'image/CLASH_pipeline_fasta.png';
        hybImage.alt = 'CLASH FASTA Analysis Pipeline';
    }
}

function hyb_generateJobID(outputFileName, uploadType) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomPart = '';
    for (var i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let prefix = '';
    if (uploadType === 'fasta') {
        prefix = 'CLA';
    } else if (uploadType === 'fastq') {
        prefix = 'CLQ';
    }

    var date = new Date();
    var year = date.getFullYear().toString().slice(-2); // 取年份的后两位
    var month = ('0' + (date.getMonth() + 1)).slice(-2); // 补零取月
    var day = ('0' + date.getDate()).slice(-2); // 补零取日
    var datePrefix = year + month + day; // 日期前缀

    return prefix + datePrefix + randomPart + '_' + outputFileName;
}