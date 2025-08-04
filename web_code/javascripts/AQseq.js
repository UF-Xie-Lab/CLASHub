const aqseq_chunkSize = 2 * 1024 * 1024; // 定义块大小为2MB
const aqseq_allowedAdapterChars = /^[XACGTURYSWKMBDHVN]+$/;
let aqseq_jobID; // 在全局范围内定义 jobID
let aqseq_progressBars = []; // 初始化进度条和文本元素数组
let aqseq_fileNames = []; // 用于存储文件名映射
let aqseq_PairedEnd_sampleCount = 1; // 用于跟踪样品数量
let aqseq_SingleEnd_sampleCount = 1; // 用于跟踪样品数量
let aqseq_CleanedFasta_sampleCount = 1; // Initialize sample count for Cleaned Fasta
let aqseq_files = []; // 存储要上传的文件数组
let addAqseq_PairedEndSampleButton;
let addAqseq_SingleEndSampleButton;
let addAqseq_CleanedFastaSampleButton; // Initialize button for adding samples

function aqseq_printCurrentSamples(group) {
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        console.log(`Sample ${index + 1} for group ${group}:`);
        console.log(`ID: ${sample.id}`);

        if (group === 'Paired_Analysis' || group === 'Single_Analysis') {
            const fastq1Input = sample.querySelector(`input[id^="aqseq_${group === 'Paired_Analysis' ? 'PairedEnd' : 'SingleEnd'}_fileToUpload_fastq1_${index + 1}"]`);
            if (fastq1Input && fastq1Input.files.length > 0) {
                console.log(`fastq1: ${fastq1Input.files[0].name}`);
            } else {
                console.log(`fastq1: No file selected`);
            }

            if (group === 'Paired_Analysis') {
                const fastq2Input = sample.querySelector(`input[id^="aqseq_PairedEnd_fileToUpload_fastq2_${index + 1}"]`);
                if (fastq2Input && fastq2Input.files.length > 0) {
                    console.log(`fastq2: ${fastq2Input.files[0].name}`);
                } else {
                    console.log(`fastq2: No file selected`);
                }
            }
        } else if (group === 'Clean_Analysis') { // Added Clean_Analysis logic
            const fastaInput = sample.querySelector(`input[id^="aqseq_CleanedFasta_fileToUpload_fasta_${index + 1}"]`);
            if (fastaInput && fastaInput.files.length > 0) {
                console.log(`fasta: ${fastaInput.files[0].name}`);
            } else {
                console.log(`fasta: No file selected`);
            }
        }

        const outputFileName = sample.querySelector(`input[id^="aqseq_${group === 'Paired_Analysis' ? 'PairedEnd' : group === 'Single_Analysis' ? 'SingleEnd' : 'CleanedFasta'}_outputFileName_${index + 1}"]`);
        if (outputFileName) {
            console.log(`outputFileName: ${outputFileName.value}`);
        } else {
            console.log('outputFileName: No output file name found');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    addAqseq_PairedEndSampleButton = document.getElementById('addAqseq_PairedEndSampleButton');
    addAqseq_SingleEndSampleButton = document.getElementById('addAqseq_SingleEndSampleButton');
    addAqseq_CleanedFastaSampleButton = document.getElementById('addAqseq_CleanedFastaSampleButton'); // Get Cleaned Fasta button

    // Select the miRNA-seq menu item
    const menuItemAqSeq = document.getElementById('menu-aqseq');

    if (menuItemAqSeq) {
        menuItemAqSeq.addEventListener('click', function () {
            document.querySelectorAll('.form-section').forEach(function (section) {
                section.style.display = 'none';
            });
            aqseq_toggleAnalysisType();
        });
    }

    document.getElementById('aqseq_uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();

        // 重新获取分析类型
        var analysisType = document.querySelector('input[name="aqseq_analysisType"]:checked').value;
        console.log('Submitting form with analysisType:', analysisType);
        
        if (analysisType === 'aqPairedEndRead') {
            console.log('Current samples for aqPairedEndReads:');
            aqseq_printCurrentSamples('Paired_Analysis');
        } else if (analysisType === 'aqSingleEndRead') {
            console.log('Current samples for aqSingleEndReads:');
            aqseq_printCurrentSamples('Single_Analysis');
        } else if (analysisType === 'CleanRead') {
            console.log('Current samples for CleanReads:');
            aqseq_printCurrentSamples('Clean_Analysis');
        }
        
        if (analysisType === 'aqPairedEndRead' && !aqseq_checkPairedEndSamples()) {
            return;
        }

        if (analysisType === 'aqSingleEndRead' && !aqseq_checkSingleEndSamples()) {
            return;
        }

        if (analysisType === 'CleanRead' && !aqseq_checkCleanedFastaSamples()) {
            return;
        }

        if (analysisType === 'aqPairedEndRead') {
            aqseq_handlePairedEndAnalysis();
        } else if (analysisType === 'aqSingleEndRead') {
            aqseq_handleSingleEndAnalysis();
        } else if (analysisType === 'CleanRead') {
            aqseq_handleCleanedFastaAnalysis();
        }
    });
});

function aqPairedEndRead_executeCode() {
    const formData = new FormData();
    for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) { // 遍历所有样品
        const aqseq_PairedEnd_fileToUpload_fastq1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`).files[0].name; // 获取fastq1文件的名字
        const aqseq_PairedEnd_fileToUpload_fastq2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`).files[0].name; // 获取fastq2文件的名字
        const aqseq_PairedEnd_defaultFivePrimeAdapter = 'GATCGTCGGACTGTAGAACT'; // 默认5'适配器序列
        const aqseq_PairedEnd_defaultThreePrimeAdapter = 'TGGAATTCTCGGGTGCCAAG'; // 默认3'适配器序列
        const aqseq_PairedEnd_fivePrimeAdapter = document.getElementById(`aqseq_PairedEnd_fivePrimeAdapter_${i}`).value || aqseq_PairedEnd_defaultFivePrimeAdapter; // 获取5'适配器序列或使用默认值
        const aqseq_PairedEnd_threePrimeAdapter = document.getElementById(`aqseq_PairedEnd_threePrimeAdapter_${i}`).value || aqseq_PairedEnd_defaultThreePrimeAdapter; // 获取3'适配器序列或使用默认值

        formData.append(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`, aqseq_PairedEnd_fileToUpload_fastq1); // 添加fastq1文件名到表单数据中
        formData.append(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`, aqseq_PairedEnd_fileToUpload_fastq2); // 添加fastq2文件名到表单数据中
        formData.append(`aqseq_PairedEnd_fivePrimeAdapter_${i}`, aqseq_PairedEnd_fivePrimeAdapter); // 添加5'适配器序列到表单数据中
        formData.append(`aqseq_PairedEnd_threePrimeAdapter_${i}`, aqseq_PairedEnd_threePrimeAdapter); // 添加3'适配器序列到表单数据中
        const aqseq_PairedEnd_outputFileName_ = document.getElementById(`aqseq_PairedEnd_outputFileName_${i}`).value;
        formData.append(`aqseq_PairedEnd_outputFileName_${i}`, aqseq_PairedEnd_outputFileName_); // 输出文件名
    }

    const aqseq_species = document.getElementById('aqseq_species').value; // 获取选中的物种
    const aqseq_email = document.getElementById('aqseq_email').value; // 获取电子邮件地址

    formData.append('jobID', aqseq_jobID); // 将 jobID 添加到表单数据中
    formData.append('analysisType', document.querySelector('input[name="aqseq_analysisType"]:checked').value); // 添加分析类型到表单数据中
    formData.append('execute', 'true');
    formData.append('aqseq_species', aqseq_species); // 添加物种到表单数据中
    formData.append('aqseq_email', aqseq_email); // 添加电子邮件到表单数据中

    fetch('./Analyzer_php/aqseq_execute_slurm.php', { // 发起一个fetch请求，目标是服务器上的'aqseq_execute_slurm.php'脚本
        method: 'POST', // 使用POST方法来发送请求
        body: formData // 请求的主体内容为formData，其中包含了需要传递给服务器的数据
    }).then(response => { // 当fetch请求完成后，返回一个Promise对象，进入第一个then块
        if (!response.ok) { // 检查响应的状态码是否在200-299之间，表示请求是否成功
            throw new Error('Network response was not ok.'); // 如果响应状态码不是ok，抛出一个错误
        }
        return response.text(); // 如果响应是ok的，将响应体解析为文本并返回
    }).then(text => { // 处理上一个then块返回的文本
        console.log('Execute response:', text); // 将解析出的文本输出到控制台，用于调试或查看结果
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your files for AQ-seq analysis have been successfully uploaded.</p>' +
            '<p style="color: red;">Your Job ID is: <strong>' + aqseq_jobID + '</strong></p>' +
            '<p>Data will be sent to your email after processing: <span style="color: red;">' + aqseq_email + '</span></p>' +
            '<div id="aqseq_queueInfo">Fetching queue status...</div>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + aqseq_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + aqseq_jobID + '</a></p>' +
            '<p><em>As a general reference:</em> analyzing a pair of fastq.gz files totaling 1GB typically takes about 3 hours. You can estimate your own runtime accordingly.</p>';
        // Fetch SLURM queue status for this job
        fetch('../Analyzer_php/slurm_status.php?jobname=' + aqseq_jobID)
          .then(res => res.json())
          .then(data => {
            let msg = '';
            const maxSlots = 2;
            const runningCount = data.running;
            if (data.your_status === 'queued') {
              if (runningCount < maxSlots) {
                msg = 'Your job can start immediately.';
              } else {
                const queuedJobs = data.all_jobs.filter(j => j.status === 'queued');
                const queuePosition = queuedJobs.findIndex(j => j.name === aqseq_jobID) + 1;
                const availableSlots = Math.max(0, maxSlots - runningCount);
                const waitJobs = Math.max(0, queuePosition - availableSlots);
                const estimated = waitJobs * 6;
                msg = `There are currently <strong>${runningCount}</strong> jobs running.<br>` +
                      `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
              }
            } else if (data.your_status === 'running') {
              msg = `Job <strong>${aqseq_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
              msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('aqseq_queueInfo').innerHTML = msg;
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('aqseq_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function aqSingleEndRead_executeCode() {
    const formData = new FormData();
    for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) { // 遍历所有 SingleEnd 样品
        const aqseq_SingleEnd_fileToUpload_fastq1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`).files[0].name; // 获取fastq1文件的名字
        const aqseq_SingleEnd_defaultThreePrimeAdapter = 'TGGAATTCTCGGGTGCCAAG'; // 默认3'适配器序列
        const aqseq_SingleEnd_threePrimeAdapter = document.getElementById(`aqseq_SingleEnd_threePrimeAdapter_${i}`).value || aqseq_SingleEnd_defaultThreePrimeAdapter; // 获取3'适配器序列或使用默认值

        formData.append(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`, aqseq_SingleEnd_fileToUpload_fastq1); // 添加fastq1文件名到表单数据中
        formData.append(`aqseq_SingleEnd_threePrimeAdapter_${i}`, aqseq_SingleEnd_threePrimeAdapter); // 添加3'适配器序列到表单数据中
        const aqseq_SingleEnd_outputFileName_ = document.getElementById(`aqseq_SingleEnd_outputFileName_${i}`).value;
        formData.append(`aqseq_SingleEnd_outputFileName_${i}`, aqseq_SingleEnd_outputFileName_); // 输出文件名
    }

    const aqseq_species = document.getElementById('aqseq_species').value; // 获取选中的物种
    const aqseq_email = document.getElementById('aqseq_email').value; // 获取电子邮件地址

    formData.append('jobID', aqseq_jobID); // 将 jobID 添加到表单数据中
    formData.append('analysisType', 'aqSingleEndRead'); // 添加分析类型到表单数据中
    formData.append('execute', 'true');
    formData.append('aqseq_species', aqseq_species); // 添加物种到表单数据中
    formData.append('aqseq_email', aqseq_email); // 添加电子邮件到表单数据中

    fetch('./Analyzer_php/aqseq_execute_slurm.php', { // 发起一个fetch请求，目标是服务器上的'aqseq_execute_slurm.php'脚本
        method: 'POST', // 使用POST方法来发送请求
        body: formData // 请求的主体内容为formData，其中包含了需要传递给服务器的数据
    }).then(response => { // 当fetch请求完成后，返回一个Promise对象，进入第一个then块
        if (!response.ok) { // 检查响应的状态码是否在200-299之间，表示请求是否成功
            throw new Error('Network response was not ok.'); // 如果响应状态码不是ok，抛出一个错误
        }
        return response.text(); // 如果响应是ok的，将响应体解析为文本并返回
    }).then(text => { // 处理上一个then块返回的文本
        console.log('Execute response:', text); // 将解析出的文本输出到控制台，用于调试或查看结果
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your files for AQ-seq analysis have been successfully uploaded.</p>' +
            '<p style="color: red;">Your Job ID is: <strong>' + aqseq_jobID + '</strong></p>' +
            '<p>Data will be sent to your email after processing: <span style="color: red;">' + aqseq_email + '</span></p>' +
            '<div id="aqseq_queueInfo">Fetching queue status...</div>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + aqseq_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + aqseq_jobID + '</a></p>' +
            '<p><em>As a general reference:</em> analyzing a pair of fastq.gz files totaling 1GB typically takes about 3 hours. You can estimate your own runtime accordingly.</p>';
        // Fetch SLURM queue status for this job
        fetch('../Analyzer_php/slurm_status.php?jobname=' + aqseq_jobID)
          .then(res => res.json())
          .then(data => {
            let msg = '';
            const maxSlots = 2;
            const runningCount = data.running;
            if (data.your_status === 'queued') {
              if (runningCount < maxSlots) {
                msg = 'Your job can start immediately.';
              } else {
                const queuedJobs = data.all_jobs.filter(j => j.status === 'queued');
                const queuePosition = queuedJobs.findIndex(j => j.name === aqseq_jobID) + 1;
                const availableSlots = Math.max(0, maxSlots - runningCount);
                const waitJobs = Math.max(0, queuePosition - availableSlots);
                const estimated = waitJobs * 6;
                msg = `There are currently <strong>${runningCount}</strong> jobs running.<br>` +
                      `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
              }
            } else if (data.your_status === 'running') {
              msg = `Job <strong>${aqseq_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
              msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('aqseq_queueInfo').innerHTML = msg;
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('aqseq_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function aqCleanedFastaRead_executeCode() {
    const formData = new FormData();
    for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) { // 遍历所有 CleanedFasta 样品
        const aqseq_CleanedFasta_fileToUpload_fasta = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`).files[0].name; // 获取fasta文件的名字

        formData.append(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`, aqseq_CleanedFasta_fileToUpload_fasta); // 添加fasta文件名到表单数据中
        const aqseq_CleanedFasta_outputFileName_ = document.getElementById(`aqseq_CleanedFasta_outputFileName_${i}`).value;
        formData.append(`aqseq_CleanedFasta_outputFileName_${i}`, aqseq_CleanedFasta_outputFileName_); // 输出文件名
    }

    const aqseq_species = document.getElementById('aqseq_species').value; // 获取选中的物种
    const aqseq_email = document.getElementById('aqseq_email').value; // 获取电子邮件地址

    formData.append('jobID', aqseq_jobID); // 将 jobID 添加到表单数据中
    formData.append('analysisType', 'CleanRead'); // 添加分析类型到表单数据中
    formData.append('execute', 'true');
    formData.append('aqseq_species', aqseq_species); // 添加物种到表单数据中
    formData.append('aqseq_email', aqseq_email); // 添加电子邮件到表单数据中

    fetch('./Analyzer_php/aqseq_execute_slurm.php', { // 发起一个fetch请求，目标是服务器上的'aqseq_execute_slurm.php'脚本
        method: 'POST', // 使用POST方法来发送请求
        body: formData // 请求的主体内容为formData，其中包含了需要传递给服务器的数据
    }).then(response => { // 当fetch请求完成后，返回一个Promise对象，进入第一个then块
        if (!response.ok) { // 检查响应的状态码是否在200-299之间，表示请求是否成功
            throw new Error('Network response was not ok.'); // 如果响应状态码不是ok，抛出一个错误
        }
        return response.text(); // 如果响应是ok的，将响应体解析为文本并返回
    }).then(text => { // 处理上一个then块返回的文本
        console.log('Execute response:', text); // 将解析出的文本输出到控制台，用于调试或查看结果
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your files for AQ-seq analysis have been successfully uploaded.</p>' +
            '<p style="color: red;">Your Job ID is: <strong>' + aqseq_jobID + '</strong></p>' +
            '<p>Data will be sent to your email after processing: <span style="color: red;">' + aqseq_email + '</span></p>' +
            '<div id="aqseq_queueInfo">Fetching queue status...</div>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + aqseq_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + aqseq_jobID + '</a></p>' +
            '<p><em>As a general reference:</em> analyzing a pair of fastq.gz files totaling 1GB typically takes about 3 hours. You can estimate your own runtime accordingly.</p>';
        // Fetch SLURM queue status for this job
        fetch('../Analyzer_php/slurm_status.php?jobname=' + aqseq_jobID)
          .then(res => res.json())
          .then(data => {
            let msg = '';
            const maxSlots = 2;
            const runningCount = data.running;
            if (data.your_status === 'queued') {
              if (runningCount < maxSlots) {
                msg = 'Your job can start immediately.';
              } else {
                const queuedJobs = data.all_jobs.filter(j => j.status === 'queued');
                const queuePosition = queuedJobs.findIndex(j => j.name === aqseq_jobID) + 1;
                const availableSlots = Math.max(0, maxSlots - runningCount);
                const waitJobs = Math.max(0, queuePosition - availableSlots);
                const estimated = waitJobs * 6;
                msg = `There are currently <strong>${runningCount}</strong> jobs running.<br>` +
                      `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
              }
            } else if (data.your_status === 'running') {
              msg = `Job <strong>${aqseq_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
              msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('aqseq_queueInfo').innerHTML = msg;
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('aqseq_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function aqseq_toggleAnalysisType() {
    var analysisType = document.querySelector('input[name="aqseq_analysisType"]:checked').value;
    console.log('aqseq_toggleAnalysisType function analysisType:', analysisType);
    const pairedEndSection = document.getElementById('aqseq_PairedEnd');
    const singleEndSection = document.getElementById('aqseq_SingleEnd');
    const cleanedFastaSection = document.getElementById('aqseq_CleanedFasta'); // Get the Cleaned Fasta section
    const aqseqImage = document.getElementById('aqseq_image'); // Get the miRNA-seq image element

    pairedEndSection.innerHTML = '';
    singleEndSection.innerHTML = '';
    cleanedFastaSection.innerHTML = ''; // Clear Cleaned Fasta content

    if (analysisType === 'aqPairedEndRead') {
        aqseq_PairedEnd_sampleCount = 1;
        const initial_PairedEndSampleDiv = aqseq_createPairedEnd_SampleDiv(1);
        pairedEndSection.appendChild(initial_PairedEndSampleDiv);
        singleEndSection.style.display = 'none';
        pairedEndSection.style.display = 'block';
        cleanedFastaSection.style.display = 'none';
        addAqseq_PairedEndSampleButton.style.display = 'block';
        addAqseq_SingleEndSampleButton.style.display = 'none';
        addAqseq_CleanedFastaSampleButton.style.display = 'none';
        console.log("aqseq_toggleAnalysisType Paired-End samples initialized.");

        // Update the image for Paired-End FastQ
        aqseqImage.src = 'image/miRNA_pipeline_pairedfastq.png';
        aqseqImage.alt = 'miRNA-seq Paired-End FastQ Analysis Pipeline';
    } else if (analysisType === 'aqSingleEndRead') {
        aqseq_SingleEnd_sampleCount = 1;
        const initial_SingleEndSampleDiv = aqseq_createSingleEnd_SampleDiv(1);
        singleEndSection.appendChild(initial_SingleEndSampleDiv);
        singleEndSection.style.display = 'block';
        pairedEndSection.style.display = 'none';
        cleanedFastaSection.style.display = 'none';
        addAqseq_PairedEndSampleButton.style.display = 'none';
        addAqseq_SingleEndSampleButton.style.display = 'block';
        addAqseq_CleanedFastaSampleButton.style.display = 'none';
        console.log("aqseq_toggleAnalysisType Single-End samples initialized.");

        // Update the image for Single-End FastQ
        aqseqImage.src = 'image/miRNA_pipeline_singlefastq.png';
        aqseqImage.alt = 'miRNA-seq Single-End FastQ Analysis Pipeline';
    } else if (analysisType === 'CleanRead') {
        aqseq_CleanedFasta_sampleCount = 1;
        const initial_CleanedFastaSampleDiv = aqseq_createCleanedFasta_SampleDiv(1);
        cleanedFastaSection.appendChild(initial_CleanedFastaSampleDiv);
        singleEndSection.style.display = 'none';
        pairedEndSection.style.display = 'none';
        cleanedFastaSection.style.display = 'block';
        addAqseq_PairedEndSampleButton.style.display = 'none';
        addAqseq_SingleEndSampleButton.style.display = 'none';
        addAqseq_CleanedFastaSampleButton.style.display = 'block';
        console.log("aqseq_toggleAnalysisType CleanRead samples initialized.");

        // Update the image for Cleaned Fasta
        aqseqImage.src = 'image/miRNA_pipeline_cleanfasta.png';
        aqseqImage.alt = 'miRNA-seq Cleaned Fasta Analysis Pipeline';
    }

    // Ensure the miRNA-seq image container is displayed
    const aqseqImageContainer = document.getElementById('aqseq_imageContainer');
    if (aqseqImageContainer) {
        aqseqImageContainer.style.display = 'block';
    }

    // Hide other image containers if necessary
    document.querySelectorAll('#imageContainer .image-section').forEach(section => {
        if (section.id !== 'aqseq_imageContainer') {
            section.style.display = 'none';
        }
    });
}


function aqseq_generateJobID(outputFileName, analysisType) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomPart = '';
    for (var i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let prefix = '';
    if (analysisType === 'aqPairedEndRead') {
        prefix = 'aqPE'; // Prefix for Paired-End Read analysis
    } else if (analysisType === 'aqSingleEndRead') {
        prefix = 'aqSE'; // Prefix for Single-End Read analysis
    } else if (analysisType === 'CleanRead') {
        prefix = 'aqCR'; // Prefix for CleanRead (Cleaned Fasta) analysis
    }

    var date = new Date();
    var year = date.getFullYear().toString().slice(-2); // 取年份的后两位
    var month = ('0' + (date.getMonth() + 1)).slice(-2); // 补零取月
    var day = ('0' + date.getDate()).slice(-2); // 补零取日
    var datePrefix = year + month + day; // 日期前缀

    return prefix + datePrefix + randomPart + '_' + outputFileName;
}

function aqseq_checkPairedEndSamples() {
    const fileNames = new Set();
    const outputNames = new Set();
    
    for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`);
        const outputFileName = document.getElementById(`aqseq_PairedEnd_outputFileName_${i}`).value;
        const fivePrimeAdapter = document.getElementById(`aqseq_PairedEnd_fivePrimeAdapter_${i}`).value;
        const threePrimeAdapter = document.getElementById(`aqseq_PairedEnd_threePrimeAdapter_${i}`).value;


        if (!fileInput1) {  // 检查 fileInput1 是否存在
            console.error(`Element aqseq_PairedEnd_fileToUpload_fastq1_${i} not found for sample ${i}`);
            return false;
        }
        if (!fileInput2) {  // 检查 fileInput2 是否存在
            console.error(`Element aqseq_PairedEnd_fileToUpload_fastq2_${i} not found for sample ${i}`);
            return false;
        }
        if (fileInput1.files.length > 0) {
            if (!fileInput1.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${fileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!aqseq_isValidFileName(fileInput1.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`File name ${fileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput1.files[0].name)) {
                alert(`File name ${fileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput1.files[0].name);
        }

        if (fileInput2.files.length > 0) {
            if (!fileInput2.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${fileInput2.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!aqseq_isValidFileName(fileInput2.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`File name ${fileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput2.files[0].name)) {
                alert(`File name ${fileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput2.files[0].name);
        }

        if (!aqseq_isValidFileName(outputFileName)) {  // 修改：调用 isValidFileName 函数进行检查
            alert(`Output file name ${outputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (outputNames.has(outputFileName)) {
            alert(`Output file name ${outputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        outputNames.add(outputFileName);

        if (fivePrimeAdapter && !aqseq_isValidAdapterSequence(fivePrimeAdapter)) {
            alert(`5' Adapter sequence for sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
        if (threePrimeAdapter && !aqseq_isValidAdapterSequence(threePrimeAdapter)) {
            alert(`3' Adapter sequence for sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
    }
    return true;
}

function aqseq_checkSingleEndSamples() {
    const fileNames = new Set();
    const outputNames = new Set();

    for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`);
        const outputFileName = document.getElementById(`aqseq_SingleEnd_outputFileName_${i}`).value;
        const threePrimeAdapter = document.getElementById(`aqseq_SingleEnd_threePrimeAdapter_${i}`).value;

        if (!fileInput1) {  // 检查 fileInput1 是否存在
            console.error(`Element aqseq_SingleEnd_fileToUpload_fastq1_${i} not found for sample ${i}`);
            return false;
        }
        if (fileInput1.files.length > 0) {
            if (!fileInput1.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${fileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!aqseq_isValidFileName(fileInput1.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`File name ${fileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput1.files[0].name)) {
                alert(`File name ${fileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput1.files[0].name);
        }

        if (!aqseq_isValidFileName(outputFileName)) {  // 修改：调用 isValidFileName 函数进行检查
            alert(`Output file name ${outputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (outputNames.has(outputFileName)) {
            alert(`Output file name ${outputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        outputNames.add(outputFileName);

        if (threePrimeAdapter && !aqseq_isValidAdapterSequence(threePrimeAdapter)) {
            alert(`3' Adapter sequence for sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
    }
    return true;
}

function aqseq_checkCleanedFastaSamples() {
    const fileNames = new Set();
    const outputNames = new Set();

    for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`);
        const outputFileName = document.getElementById(`aqseq_CleanedFasta_outputFileName_${i}`).value;

        if (!fileInput1) {
            console.error(`Element aqseq_CleanedFasta_fileToUpload_fasta_${i} not found for sample ${i}`);
            return false;
        }
        if (fileInput1.files.length > 0) {
            if (!fileInput1.files[0].name.endsWith('.fasta.gz')) {  // Ensure file has correct extension
                alert(`File ${fileInput1.files[0].name} must be a .fasta.gz file.`);
                return false;
            }
            if (!aqseq_isValidFileName(fileInput1.files[0].name)) {
                alert(`File name ${fileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput1.files[0].name)) {
                alert(`File name ${fileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput1.files[0].name);
        }

        if (!aqseq_isValidFileName(outputFileName)) {
            alert(`Output file name ${outputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (outputNames.has(outputFileName)) {
            alert(`Output file name ${outputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        outputNames.add(outputFileName);
    }
    return true;
}

function aqseq_handlePairedEndAnalysis() {
    aqseq_jobID = aqseq_generateJobID(document.getElementById('aqseq_PairedEnd_outputFileName_1').value, 'aqPairedEndRead');
    aqseq_progressBars = [];

    for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`);

        aqseq_files.push(fileInput1.files[0]);
        aqseq_files.push(fileInput2.files[0]);
        aqseq_fileNames.push(`FASTQ1_Sample${i}`);
        aqseq_fileNames.push(`FASTQ2_Sample${i}`);

        // 动态添加进度条容器和文本元素
        aqseq_addProgressBar(i, '1');
        aqseq_addProgressBar(i, '2');
    }

    aqseq_uploadChunk(); // 开始上传逻辑
}

function aqseq_handleSingleEndAnalysis() {
    aqseq_jobID = aqseq_generateJobID(document.getElementById('aqseq_SingleEnd_outputFileName_1').value, 'aqSingleEndRead');
    aqseq_progressBars = [];

    for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`);

        aqseq_files.push(fileInput1.files[0]);
        aqseq_fileNames.push(`FASTQ1_Sample${i}`);

        // 动态添加进度条容器和文本元素
        aqseq_addProgressBar(i, '1');
    }

    aqseq_uploadChunk(); // 开始上传逻辑
}

function aqseq_handleCleanedFastaAnalysis() {
    aqseq_jobID = aqseq_generateJobID(document.getElementById('aqseq_CleanedFasta_outputFileName_1').value, 'CleanRead');
    aqseq_progressBars = [];

    for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) {
        const fileInput1 = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`);

        aqseq_files.push(fileInput1.files[0]);
        aqseq_fileNames.push(`FASTA_Sample${i}`);

        aqseq_addProgressBar(i, '1');
    }

    aqseq_uploadChunk();
}

function aqseq_addProgressBar(sampleIndex, fileSuffix) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = `aqseq_progressBarContainer${fileSuffix}_${sampleIndex}`;
    progressBarContainer.style = 'width: 50%; background-color: transparent; border-radius: 10px; margin-top: 5px;';

    const progressBar = document.createElement('div');
    progressBar.id = `aqseq_progressBar${fileSuffix}_${sampleIndex}`;
    progressBar.style = 'width: 0%; height: 15px; background-color: #76c7c0; border-radius: 10px;';

    const progressText = document.createElement('p');
    progressText.id = `aqseq_progressText${fileSuffix}_${sampleIndex}`;
    progressText.style = 'margin-left: 10px;';

    progressBarContainer.appendChild(progressBar);
    document.getElementById('aqseqProgressBarsContainer').appendChild(progressBarContainer);
    document.getElementById('aqseqProgressBarsContainer').appendChild(progressText);

    aqseq_progressBars.push({ container: progressBar, text: progressText });
}

function aqseq_uploadChunk(fileIndex = 0, offset = 0) {
    // 隐藏上传按钮
    document.getElementById('aqseq_uploadButton').style.display = 'none';

    if (fileIndex >= aqseq_files.length) {
        console.log('All files have been uploaded.');
        const analysisType = document.querySelector('input[name="aqseq_analysisType"]:checked').value;
        if (analysisType === 'aqPairedEndRead') {
            aqPairedEndRead_executeCode();
        } else if (analysisType === 'aqSingleEndRead') {
            aqSingleEndRead_executeCode();
        } else if (analysisType === 'CleanRead') {
            aqCleanedFastaRead_executeCode();
        }
        const firstProgressBarText = document.getElementById("aqseq_progressText1_1");
        if (firstProgressBarText) {
            firstProgressBarText.textContent = 'All files uploaded successfully!';
        }
        return;
    }

    let file = aqseq_files[fileIndex];
    const chunk = file.slice(offset, offset + aqseq_chunkSize);
    const formData = new FormData();
    formData.append("fileChunk", chunk);
    formData.append("fileName", file.name);
    formData.append("offset", offset);
    formData.append("totalSize", file.size);
    formData.append("jobID", aqseq_jobID);

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
            if (aqseq_progressBars[fileIndex] && aqseq_progressBars[fileIndex].text) {
                aqseq_progressBars[fileIndex].text.textContent = `Uploading ${aqseq_fileNames[fileIndex]}: ${progress}%`;
                aqseq_progressBars[fileIndex].container.style.width = progress + '%';
            } else {
                console.error(`Progress bar for file index ${fileIndex} not found.`);
            }

            if (offset < file.size) {
                aqseq_uploadChunk(fileIndex, offset);
            } else {
                aqseq_uploadChunk(fileIndex + 1, 0); // 上传下一个文件
            }
        } else {
            console.error('Upload failed:', data.message);
        }
    }).catch(error => {
        console.error('Error uploading chunk:', error);
    });
}

function aqseq_removeSample(group, sampleIndex) {
    if ((group === 'Paired_Analysis' && aqseq_PairedEnd_sampleCount <= 1) ||
        (group === 'Single_Analysis' && aqseq_SingleEnd_sampleCount <= 1) ||
        (group === 'Clean_Analysis' && aqseq_CleanedFasta_sampleCount <= 1)) { // Added Clean_Analysis logic
        alert(`Each group must have at least one sample.`);
        return;
    }

    const sampleDiv = document.getElementById(`${group}_sample_${sampleIndex}`);
    if (sampleDiv && sampleDiv.parentNode) {
        sampleDiv.parentNode.removeChild(sampleDiv);

        if (group === 'Single_Analysis') {
            aqseq_SingleEnd_sampleCount--;
        } else if (group === 'Paired_Analysis') {
            aqseq_PairedEnd_sampleCount--;
        } else if (group === 'Clean_Analysis') {
            aqseq_CleanedFasta_sampleCount--; // Decrement CleanedFasta count
        }

        aqseq_updateSamples(group); // Update sample numbers and button states
    } else {
        console.error(`Sample div with id ${group}_sample_${sampleIndex} not found.`);
    }
}

function aqseq_updateSamples(group) {
    console.log('aqseq_updateSamples called with group:', group);

    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        const sampleIndex = index + 1;
        sample.id = `${group}_sample_${sampleIndex}`;

        const sampleTitle = sample.querySelector('h4');
        if (sampleTitle) {
            if (group === 'Paired_Analysis') {
                sampleTitle.textContent = `PairedEnd_Sample ${sampleIndex}`;
            } else if (group === 'Single_Analysis') {
                sampleTitle.textContent = `SingleEnd_Sample ${sampleIndex}`;
            } else if (group === 'Clean_Analysis') { // Updated Clean_Analysis
                sampleTitle.textContent = `CleanedFasta_Sample ${sampleIndex}`;
            }
        } else {
            console.error(`Sample title element not found for ${group} sample ${sampleIndex}`);
        }

        let removeButtonClass;
        if (group === 'Paired_Analysis') {
            removeButtonClass = '.removePairedEndSampleButton';
        } else if (group === 'Single_Analysis') {
            removeButtonClass = '.removeSingleEndSampleButton';
        } else if (group === 'Clean_Analysis') {
            removeButtonClass = '.removeCleanedFastaSampleButton';
        }

        const removeButton = sample.querySelector(removeButtonClass);
        if (removeButton) {
            removeButton.setAttribute('onclick', `aqseq_removeSample('${group}', ${sampleIndex})`);
        } else if (sampleIndex > 1) {
            console.error(`Remove button element not found for ${group} sample ${sampleIndex}`);
        }

        const elements = sample.querySelectorAll('input, label, p');
        elements.forEach(element => {
            const name = element.getAttribute('name');
            const id = element.getAttribute('id');
            const forAttr = element.getAttribute('for');
            const placeholder = element.getAttribute('placeholder');

            if (name) element.setAttribute('name', name.replace(/\d+$/, sampleIndex));
            if (id) element.setAttribute('id', id.replace(/\d+$/, sampleIndex));
            if (forAttr) element.setAttribute('for', forAttr.replace(/\d+$/, sampleIndex));

            if (placeholder && (placeholder.startsWith('Paired_Sample') || placeholder.startsWith('Single_Sample') || placeholder.startsWith('CleanedFasta_Sample'))) {
                element.setAttribute('placeholder', `${group === 'Paired_Analysis' ? 'Paired_Sample' : group === 'Single_Analysis' ? 'Single_Sample' : 'CleanedFasta_Sample'}${sampleIndex}`);
            }

            if (id && id.includes('outputFileName')) {
                element.value = '';
            }
        });

        if (group === 'Paired_Analysis') {
            const fastq1Label = sample.querySelector('label[for^="aqseq_PairedEnd_fileToUpload_fastq1"]');
            const fastq1Input = sample.querySelector('input[id^="aqseq_PairedEnd_fileToUpload_fastq1"]');
            const fastq2Label = sample.querySelector('label[for^="aqseq_PairedEnd_fileToUpload_fastq2"]');
            const fastq2Input = sample.querySelector('input[id^="aqseq_PairedEnd_fileToUpload_fastq2"]');

            if (fastq1Label && fastq1Input) {
                fastq1Label.setAttribute('for', `aqseq_PairedEnd_fileToUpload_fastq1_${sampleIndex}`);
                fastq1Input.setAttribute('id', `aqseq_PairedEnd_fileToUpload_fastq1_${sampleIndex}`);
            }
            if (fastq2Label && fastq2Input) {
                fastq2Label.setAttribute('for', `aqseq_PairedEnd_fileToUpload_fastq2_${sampleIndex}`);
                fastq2Input.setAttribute('id', `aqseq_PairedEnd_fileToUpload_fastq2_${sampleIndex}`);
            }
        } else if (group === 'Single_Analysis') {
            const fastq1Label = sample.querySelector('label[for^="aqseq_SingleEnd_fileToUpload_fastq1"]');
            const fastq1Input = sample.querySelector('input[id^="aqseq_SingleEnd_fileToUpload_fastq1"]');

            if (fastq1Label && fastq1Input) {
                fastq1Label.setAttribute('for', `aqseq_SingleEnd_fileToUpload_fastq1_${sampleIndex}`);
                fastq1Input.setAttribute('id', `aqseq_SingleEnd_fileToUpload_fastq1_${sampleIndex}`);
            }
        } else if (group === 'Clean_Analysis') {
            const fastaLabel = sample.querySelector('label[for^="aqseq_CleanedFasta_fileToUpload_fasta"]');
            const fastaInput = sample.querySelector('input[id^="aqseq_CleanedFasta_fileToUpload_fasta"]');

            if (fastaLabel && fastaInput) {
                fastaLabel.setAttribute('for', `aqseq_CleanedFasta_fileToUpload_fasta_${sampleIndex}`);
                fastaInput.setAttribute('id', `aqseq_CleanedFasta_fileToUpload_fasta_${sampleIndex}`);
            }
        }

        console.log(`Updated sample ${sampleIndex} for group ${group}:`, sample);
    });

    const removePairedSampleButtons = document.querySelectorAll('.removePairedEndSampleButton');
    const removeSingleSampleButtons = document.querySelectorAll('.removeSingleEndSampleButton');
    const removeCleanedFastaSampleButtons = document.querySelectorAll('.removeCleanedFastaSampleButton');

    if (group === 'Paired_Analysis') {
        if (aqseq_PairedEnd_sampleCount <= 1) {
            removePairedSampleButtons.forEach(button => button.style.display = 'none');
        } else {
            removePairedSampleButtons.forEach(button => button.style.display = 'inline-block');
        }
    }

    if (group === 'Single_Analysis') {
        if (aqseq_SingleEnd_sampleCount <= 1) {
            removeSingleSampleButtons.forEach(button => button.style.display = 'none');
        } else {
            removeSingleSampleButtons.forEach(button => button.style.display = 'inline-block');
        }
    }

    if (group === 'Clean_Analysis') {
        if (aqseq_CleanedFasta_sampleCount <= 1) {
            removeCleanedFastaSampleButtons.forEach(button => button.style.display = 'none');
        } else {
            removeCleanedFastaSampleButtons.forEach(button => button.style.display = 'inline-block');
        }
    }
}

function addAqseq_PairedEndSample() {
    console.log('addAqseq_PairedEndSample called'); // Check if the function is called

    if (aqseq_PairedEnd_sampleCount >= 12) {  // Check if the sample count exceeds 12
        alert('Sample count cannot exceed 12 for PairedEnd.');  // Alert if the sample count is too high
        return;  // Exit the function
    }
    aqseq_PairedEnd_sampleCount++;  // Increment the sample count
    const pairedEndSampleContainer = document.getElementById('aqseq_PairedEnd');  // Get the container for PairedEnd samples
    const newPairedEndSampleDiv = aqseq_createPairedEnd_SampleDiv(aqseq_PairedEnd_sampleCount);  // Create a new sample div
    pairedEndSampleContainer.appendChild(newPairedEndSampleDiv);  // Append the new sample div to the container
    console.log('addAqseq_PairedEndSampleButton1:', addAqseq_PairedEndSampleButton); // Check if the function is called
    if (addAqseq_PairedEndSampleButton) {
        addAqseq_PairedEndSampleButton.textContent = 'Add one sample';
    } else {
        console.error("addAqseq_PairedEndSample function addAqseq_PairedEndSampleButton element not found.");
    }
}

function addAqseq_SingleEndSample() {
    console.log('addAqseq_SingleEndSample called'); // Check if the function is called
    if (aqseq_SingleEnd_sampleCount >= 12) {  // Check if the sample count exceeds 12
        alert('Sample count cannot exceed 12 for SingleEnd.');  // Alert if the sample count is too high
        return;  // Exit the function
    }
    aqseq_SingleEnd_sampleCount++;  // Increment the sample count
    const singleEndSampleContainer = document.getElementById('aqseq_SingleEnd');  // Get the container for SingleEnd samples
    const newSingleEndSampleDiv = aqseq_createSingleEnd_SampleDiv(aqseq_SingleEnd_sampleCount);  // Create a new sample div
    singleEndSampleContainer.appendChild(newSingleEndSampleDiv);  // Append the new sample div to the container
    const addAqseq_SingleEndSampleButton = document.getElementById('addAqseq_SingleEndSampleButton');
    console.log('addAqseq_SingleEndSampleButton:', addAqseq_SingleEndSampleButton); // Check if the function is called
    if (addAqseq_SingleEndSampleButton) {
        addAqseq_SingleEndSampleButton.textContent = 'Add one sample';
    } else {
        console.error("addAqseq_SingleEndSample function addAqseq_SingleEndSampleButton element not found.");
    }
}

function addAqseq_CleanedFastaSample() {
    console.log('addAqseq_CleanedFastaSample called');
    if (aqseq_CleanedFasta_sampleCount >= 12) {
        alert('Sample count cannot exceed 12 for Cleaned Fasta.');
        return;
    }
    aqseq_CleanedFasta_sampleCount++;
    const cleanedFastaSampleContainer = document.getElementById('aqseq_CleanedFasta'); // Ensure this matches the HTML
    if (!cleanedFastaSampleContainer) {
        console.error("Element with ID 'aqseq_CleanedFasta' not found.");
        return;
    }
    const newCleanedFastaSampleDiv = aqseq_createCleanedFasta_SampleDiv(aqseq_CleanedFasta_sampleCount);
    cleanedFastaSampleContainer.appendChild(newCleanedFastaSampleDiv);

    if (addAqseq_CleanedFastaSampleButton) {
        addAqseq_CleanedFastaSampleButton.textContent = 'Add one sample';
    } else {
        console.error("addAqseq_CleanedFastaSample function addAqseq_CleanedFastaSampleButton element not found.");
    }
}

function aqseq_createPairedEnd_SampleDiv(index) {
    const newPairedEndSampleDiv = document.createElement('div');
    newPairedEndSampleDiv.classList.add('aqseq_sample', 'Paired_Analysis_sample');
    newPairedEndSampleDiv.id = `Paired_Analysis_sample_${index}`;
    newPairedEndSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the template download links here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download these two FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample_miRNAseq_R1.fastq.gz" download>Sample miRNAseq FASTQ 1</a> |
            <a href="Samples/Sample_miRNAseq_R2.fastq.gz" download>Sample miRNAseq FASTQ 2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Paired-End Sample ${index}</h4>
        <section> 
            <label>Choose <strong>Read 1 (R1)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_fastq1_${index}">Select File</button>
                <span id="fileNameDisplay_fastq1_${index}">No file selected</span>
                <input type="file" id="aqseq_PairedEnd_fileToUpload_fastq1_${index}" name="aqseq_PairedEnd_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label>Choose <strong>Read 2 (R2)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_fastq2_${index}">Select File</button>
                <span id="fileNameDisplay_fastq2_${index}">No file selected</span>
                <input type="file" id="aqseq_PairedEnd_fileToUpload_fastq2_${index}" name="aqseq_PairedEnd_fileToUpload_fastq2_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <!-- Rest of your form fields -->
        <section> 
            <label for="aqseq_PairedEnd_fivePrimeAdapter_${index}">5' Adapter Sequence <span style="font-size: smaller;">(default: GATCGTCGGACTGTAGAACT)</span>:</label> 
            <input type="text" id="aqseq_PairedEnd_fivePrimeAdapter_${index}" name="aqseq_PairedEnd_fivePrimeAdapter_${index}" class="uniform-width" placeholder="GATCGTCGGACTGTAGAACT"> 
        </section> 
        <section> 
            <label for="aqseq_PairedEnd_threePrimeAdapter_${index}">3' Adapter Sequence <span style="font-size: smaller;">(default: TGGAATTCTCGGGTGCCAAG)</span>:</label> 
            <input type="text" id="aqseq_PairedEnd_threePrimeAdapter_${index}" name="aqseq_PairedEnd_threePrimeAdapter_${index}" class="uniform-width" placeholder="TGGAATTCTCGGGTGCCAAG"> 
        </section> 
        <section> 
            <label for="aqseq_PairedEnd_outputFileName_${index}">Output file name (without extension):</label> 
            <input type="text" id="aqseq_PairedEnd_outputFileName_${index}" name="aqseq_PairedEnd_outputFileName_${index}" class="uniform-width" required placeholder="Paired_Sample${index}"> 
        </section> 
        ${index > 1 ? `<button type="button" class="removePairedEndSampleButton" onclick="aqseq_removeSample('Paired_Analysis', ${index})">-</button>` : ''}
    `;

    // **Add event listeners to handle custom file input**
    // For the first file input
    const fileInput1 = newPairedEndSampleDiv.querySelector(`#aqseq_PairedEnd_fileToUpload_fastq1_${index}`);
    const customButton1 = newPairedEndSampleDiv.querySelector(`#customButton_fastq1_${index}`);
    const fileNameDisplay1 = newPairedEndSampleDiv.querySelector(`#fileNameDisplay_fastq1_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            fileNameDisplay1.textContent = file.name;
        } else {
            fileNameDisplay1.textContent = 'No file selected';
        }
    });

    // For the second file input
    const fileInput2 = newPairedEndSampleDiv.querySelector(`#aqseq_PairedEnd_fileToUpload_fastq2_${index}`);
    const customButton2 = newPairedEndSampleDiv.querySelector(`#customButton_fastq2_${index}`);
    const fileNameDisplay2 = newPairedEndSampleDiv.querySelector(`#fileNameDisplay_fastq2_${index}`);

    customButton2.addEventListener('click', function() {
        fileInput2.click();
    });

    fileInput2.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            fileNameDisplay2.textContent = file.name;
        } else {
            fileNameDisplay2.textContent = 'No file selected';
        }
    });

    return newPairedEndSampleDiv;
}

function aqseq_createSingleEnd_SampleDiv(index) {
    console.log('aqseq_createSingleEnd_SampleDiv function: ', index); 
    const newSingleEndSampleDiv = document.createElement('div'); // Use consistent naming
    newSingleEndSampleDiv.classList.add('aqseq_sample', 'Single_Analysis_sample');
    newSingleEndSampleDiv.id = `Single_Analysis_sample_${index}`;
    newSingleEndSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the template download link here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download this FASTQ file to test the analysis, but it's optional:</p>
            <a href="Samples/Sample_miRNAseq_R1.fastq.gz" download>Sample miRNAseq FASTQ</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Single-End Sample ${index}</h4> 
        <section> 
            <label>Choose <strong>Single-End FASTQ</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_SingleEnd_fastq1_${index}">Select File</button>
                <span id="fileNameDisplay_SingleEnd_fastq1_${index}">No file selected</span>
                <input type="file" id="aqseq_SingleEnd_fileToUpload_fastq1_${index}" name="aqseq_SingleEnd_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label for="aqseq_SingleEnd_threePrimeAdapter_${index}">3' Adapter Sequence <span style="font-size: smaller;">(default: TGGAATTCTCGGGTGCCAAG)</span>:</label> 
            <input type="text" id="aqseq_SingleEnd_threePrimeAdapter_${index}" name="aqseq_SingleEnd_threePrimeAdapter_${index}" class="uniform-width" placeholder="TGGAATTCTCGGGTGCCAAG"> 
        </section> 
        <section> 
            <label for="aqseq_SingleEnd_outputFileName_${index}">Output file name (without extension):</label> 
            <input type="text" id="aqseq_SingleEnd_outputFileName_${index}" name="aqseq_SingleEnd_outputFileName_${index}" class="uniform-width" required placeholder="Single_Sample${index}"> 
        </section> 
        ${index > 1 ? `<button type="button" class="removeSingleEndSampleButton" onclick="aqseq_removeSample('Single_Analysis', ${index})">-</button>` : ''}
    `;

    // Add event listeners for custom file input
    const fileInput1 = newSingleEndSampleDiv.querySelector(`#aqseq_SingleEnd_fileToUpload_fastq1_${index}`);
    const customButton1 = newSingleEndSampleDiv.querySelector(`#customButton_SingleEnd_fastq1_${index}`);
    const fileNameDisplay1 = newSingleEndSampleDiv.querySelector(`#fileNameDisplay_SingleEnd_fastq1_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay1.textContent = file ? file.name : 'No file selected';
    });

    return newSingleEndSampleDiv;
}

function aqseq_createCleanedFasta_SampleDiv(index) {
    console.log('aqseq_createCleanedFasta_SampleDiv function: ', index);
    const newCleanedFastaSampleDiv = document.createElement('div');
    newCleanedFastaSampleDiv.classList.add('aqseq_sample', 'Clean_Analysis_sample');
    newCleanedFastaSampleDiv.id = `Clean_Analysis_sample_${index}`;
    newCleanedFastaSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the template download link here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download this FASTA file to test the analysis, but it's optional:</p>
            <a href="Samples/Sample_miRNAseq.fasta.gz" download>Sample miRNAseq FASTA</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Cleaned FASTA Sample ${index}</h4>
        <section> 
            <label>Choose .fasta.gz file:</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_CleanedFasta_fasta_${index}">Select File</button>
                <span id="fileNameDisplay_CleanedFasta_fasta_${index}">No file selected</span>
                <input type="file" id="aqseq_CleanedFasta_fileToUpload_fasta_${index}" name="aqseq_CleanedFasta_fileToUpload_fasta_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label for="aqseq_CleanedFasta_outputFileName_${index}">Output file name (without extension):</label> 
            <input type="text" id="aqseq_CleanedFasta_outputFileName_${index}" name="aqseq_CleanedFasta_outputFileName_${index}" class="uniform-width" required placeholder="CleanedFasta_Sample${index}"> 
        </section> 
        ${index > 1 ? `<button type="button" class="removeCleanedFastaSampleButton" onclick="aqseq_removeSample('Clean_Analysis', ${index})">-</button>` : ''}
    `;

    // Add event listeners for custom file input
    const fileInput1 = newCleanedFastaSampleDiv.querySelector(`#aqseq_CleanedFasta_fileToUpload_fasta_${index}`);
    const customButton1 = newCleanedFastaSampleDiv.querySelector(`#customButton_CleanedFasta_fasta_${index}`);
    const fileNameDisplay1 = newCleanedFastaSampleDiv.querySelector(`#fileNameDisplay_CleanedFasta_fasta_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay1.textContent = file ? file.name : 'No file selected';
    });

    return newCleanedFastaSampleDiv;
}

function aqseq_isValidFileName(fileName) {
    const regex = /^[a-zA-Z0-9_.-]+$/;
    return regex.test(fileName);
}

function aqseq_isValidAdapterSequence(sequence) {
    const allowedAdapterChars = /^[XACGTURYSWKMBDHVN]+$/;
    const containsOnlyN = /^N+$/;
    return allowedAdapterChars.test(sequence) && !containsOnlyN.test(sequence);
}
