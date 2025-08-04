const chunkSize = 2 * 1024 * 1024; // 定义块大小为2MB
const allowedAdapterChars = /^[XACGTURYSWKMBDHVN]+$/;
let RNAseq_jobID; // 在全局范围内定义 jobID
let RNAseq_progressBars = []; // 初始化进度条和文本元素数组
let RNAseq_fileNames = []; // 用于存储文件名映射
let sampleTPM = 1; // 用于跟踪样品数量
let controlSampleCount = 2; // 控制样品数量
let treatmentSampleCount = 2; // 处理样品数量
let RNAseq_files = []; // 存储要上传的文件数组

function RNAseq_TPMonly_executeCode() {
    const formData = new FormData();

    for (let i = 1; i <= sampleTPM; i++) { // Iterate through all samples
        const RNAseq_fileToUpload_fastq1 = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`).files[0].name;
        const RNAseq_fileToUpload_fastq2 = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`).files[0].name;
        const RNAseq_defaultFivePrimeAdapter = 'AGATCGGAAGAGCGTCGTGTA';
        const RNAseq_defaultThreePrimeAdapter = 'AGATCGGAAGAGCACACGTCT';
        const RNAseq_fivePrimeAdapter = document.getElementById(`RNAseq_fivePrimeAdapter_${i}`).value || RNAseq_defaultFivePrimeAdapter;
        const RNAseq_threePrimeAdapter = document.getElementById(`RNAseq_threePrimeAdapter_${i}`).value || RNAseq_defaultThreePrimeAdapter;

        formData.append(`RNAseq_fileToUpload_fastq1_${i}`, RNAseq_fileToUpload_fastq1);
        formData.append(`RNAseq_fileToUpload_fastq2_${i}`, RNAseq_fileToUpload_fastq2);
        formData.append(`RNAseq_fivePrimeAdapter_${i}`, RNAseq_fivePrimeAdapter);
        formData.append(`RNAseq_threePrimeAdapter_${i}`, RNAseq_threePrimeAdapter);
        const RNAseq_outputFileName = document.getElementById(`RNAseq_outputFileName_${i}`).value;
        formData.append(`RNAseq_outputFileName_${i}`, RNAseq_outputFileName);
    }

    const RNAseq_species = document.getElementById('RNAseq_species').value;
    const RNAseq_email = document.getElementById('RNAseq_email').value;

    formData.append('jobID', RNAseq_jobID);
    formData.append('analysisType', document.querySelector('input[name="RNAseq_analysisType"]:checked').value);
    formData.append('execute', 'true');
    formData.append('RNAseq_species', RNAseq_species);
    formData.append('RNAseq_email', RNAseq_email);
    formData.append('sampleCount', sampleTPM);

    fetch('./Analyzer_php/RNAseq_execute_slurm.php', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    }).then(text => {
        console.log('Execute response:', text);
        // 【修改】在 innerHTML 中加入排队状态的占位符
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your files for RNA-seq TPM analysis have been successfully uploaded.</p>' +
            '<p style="color: red;">Your Job ID is: <strong>' + RNAseq_jobID + '</strong></p>' +
            '<p>Data will be sent to your email after processing: ' + RNAseq_email + '</p>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + RNAseq_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + RNAseq_jobID + '</a></p>' +
            '<div id="rna_tpm_queueInfo">Fetching queue status...</div>'; // 【新增】

        // 【新增】向 slurm_status.php 请求队列信息
        fetch('./Analyzer_php/slurm_status.php?jobname=' + RNAseq_jobID)
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
                  const queuePosition = queuedJobs.findIndex(j => j.name === RNAseq_jobID) + 1;
                  const availableSlots = Math.max(0, maxSlots - runningCount);
                  const waitJobs = Math.max(0, queuePosition - availableSlots);
                  const estimated = waitJobs * 6;
                  msg = `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
                }
            } else if (data.your_status === 'running') {
                msg = `Job <strong>${RNAseq_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
                msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('rna_tpm_queueInfo').innerHTML = msg; // 【新增】
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('rna_tpm_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function RNAseq_DESeq2_executeCode() {
    const formData = new FormData();

    for (let i = 1; i <= controlSampleCount; i++) { // 遍历所有对照样品
        const controlFileToUpload_fastq1 = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`).files[0].name; // 获取对照组fastq1文件对象
        const controlFileToUpload_fastq2 = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`).files[0].name; // 获取对照组fastq2文件对象
        const controlOutputFileName = document.getElementById(`RNAseq_control_outputFileName_${i}`).value; // 获取对照组输出文件名
        const RNAseq_defaultFivePrimeAdapter = 'AGATCGGAAGAGCGTCGTGTA'; // 默认5'适配器序列
        const RNAseq_defaultThreePrimeAdapter = 'AGATCGGAAGAGCACACGTCT'; // 默认3'适配器序列
        const RNAseq_fivePrimeAdapter = document.getElementById(`RNAseq_control_fivePrimeAdapter_${i}`).value || RNAseq_defaultFivePrimeAdapter; // 获取5'适配器序列或使用默认值
        const RNAseq_threePrimeAdapter = document.getElementById(`RNAseq_control_threePrimeAdapter_${i}`).value || RNAseq_defaultThreePrimeAdapter; // 获取3'适配器序列或使用默认值

        formData.append(`controlFileToUpload_fastq1_${i}`, controlFileToUpload_fastq1); // 添加对照组fastq1文件名到表单数据中
        formData.append(`controlFileToUpload_fastq2_${i}`, controlFileToUpload_fastq2); // 添加对照组fastq2文件名到表单数据中
        formData.append(`controlOutputFileName_${i}`, controlOutputFileName); // 添加对照组输出文件名到表单数据中
        formData.append(`controlRNAseq_fivePrimeAdapter_${i}`, RNAseq_fivePrimeAdapter); // 添加5'适配器序列到表单数据中
        formData.append(`controlRNAseq_threePrimeAdapter_${i}`, RNAseq_threePrimeAdapter); // 添加3'适配器序列到表单数据中
        // 打印文件信息
        console.log(`controlFileToUpload_fastq1_${i} Name:`, controlFileToUpload_fastq1);
        console.log(`controlFileToUpload_fastq2_${i} Name:`, controlFileToUpload_fastq2);
    }

    for (let i = 1; i <= treatmentSampleCount; i++) { // 遍历所有处理样品
        const treatmentFileToUpload_fastq1 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`).files[0].name; // 获取处理组fastq1文件对象
        const treatmentFileToUpload_fastq2 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`).files[0].name; // 获取处理组fastq2文件对象
        const treatmentOutputFileName = document.getElementById(`RNAseq_treatment_outputFileName_${i}`).value; // 获取处理组输出文件名
        const RNAseq_defaultFivePrimeAdapter = 'AGATCGGAAGAGCGTCGTGTA'; // 默认5'适配器序列
        const RNAseq_defaultThreePrimeAdapter = 'AGATCGGAAGAGCACACGTCT'; // 默认3'适配器序列
        const RNAseq_fivePrimeAdapter = document.getElementById(`RNAseq_treatment_fivePrimeAdapter_${i}`).value || RNAseq_defaultFivePrimeAdapter; // 获取5'适配器序列或使用默认值
        const RNAseq_threePrimeAdapter = document.getElementById(`RNAseq_treatment_threePrimeAdapter_${i}`).value || RNAseq_defaultThreePrimeAdapter; // 获取3'适配器序列或使用默认值

        formData.append(`treatmentFileToUpload_fastq1_${i}`, treatmentFileToUpload_fastq1); // 添加处理组fastq1文件名到表单数据中
        formData.append(`treatmentFileToUpload_fastq2_${i}`, treatmentFileToUpload_fastq2); // 添加处理组fastq2文件名到表单数据中
        formData.append(`treatmentOutputFileName_${i}`, treatmentOutputFileName); // 添加处理组输出文件名到表单数据中
        formData.append(`treatmentRNAseq_fivePrimeAdapter_${i}`, RNAseq_fivePrimeAdapter); // 添加5'适配器序列到表单数据中
        formData.append(`treatmentRNAseq_threePrimeAdapter_${i}`, RNAseq_threePrimeAdapter); // 添加3'适配器序列到表单数据中
        // 打印文件信息
        console.log(`treatmentFileToUpload_fastq1_${i} Name:`, treatmentFileToUpload_fastq1);
        console.log(`treatmentFileToUpload_fastq2_${i} Name:`, treatmentFileToUpload_fastq2);
    }

    const RNAseq_species = document.getElementById('RNAseq_species').value;
    const RNAseq_email = document.getElementById('RNAseq_email').value;

    formData.append('jobID', RNAseq_jobID);
    formData.append('analysisType', 'TPM_DESeq2');
    formData.append('execute', 'true');
    formData.append('RNAseq_species', RNAseq_species);
    formData.append('RNAseq_email', RNAseq_email);
    formData.append('controlSampleCount', controlSampleCount);
    formData.append('treatmentSampleCount', treatmentSampleCount);


    fetch('./Analyzer_php/RNAseq_execute_slurm.php', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    }).then(text => {
        console.log('Execute response:', text);
        // 【修改】在 innerHTML 中加入排队状态的占位符
        document.getElementById('formSectionContainer').innerHTML =
            '<p>Your files for DESeq2 analysis have been successfully uploaded.</p>' +
            '<p style="color: red;">Your Job ID is: <strong>' + RNAseq_jobID + '</strong></p>' +
            '<p>Data will be sent to your email after processing: ' + RNAseq_email + '</p>' +
            '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + RNAseq_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + RNAseq_jobID + '</a></p>' +
            '<div id="rna_deseq2_queueInfo">Fetching queue status...</div>'; // 【新增】

        // 【新增】向 slurm_status.php 请求队列信息
        fetch('./Analyzer_php/slurm_status.php?jobname=' + RNAseq_jobID)
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
                  const queuePosition = queuedJobs.findIndex(j => j.name === RNAseq_jobID) + 1;
                  const availableSlots = Math.max(0, maxSlots - runningCount);
                  const waitJobs = Math.max(0, queuePosition - availableSlots);
                  const estimated = waitJobs * 6;
                  msg = `Your job is number <strong>${queuePosition}</strong> in the queue. Estimated wait time: <strong>${estimated}</strong> hours.`;
                }
            } else if (data.your_status === 'running') {
                msg = `Job <strong>${RNAseq_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
                msg = `Job status: ${data.your_status}.`;
            }
            document.getElementById('rna_deseq2_queueInfo').innerHTML = msg; // 【新增】
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            document.getElementById('rna_deseq2_queueInfo').innerHTML = 'Unable to fetch queue status right now.';
          });
    }).catch(error => {
        console.error('Error executing code:', error);
        alert('Failed to send data to PHP: ' + error.message);
    });
}

function printCurrentSamples(group) {
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        console.log(`Sample ${index + 1} for group ${group}:`);
        console.log(`ID: ${sample.id}`);

        const fastq1Input = sample.querySelector(`input[id^="RNAseq_${group}_fileToUpload_fastq1_${index + 1}"]`);
        if (fastq1Input && fastq1Input.files.length > 0) {
            console.log(`fastq1: ${fastq1Input.files[0].name}`);
        } else {
            console.log(`fastq1: No file selected`);
        }

        const fastq2Input = sample.querySelector(`input[id^="RNAseq_${group}_fileToUpload_fastq2_${index + 1}"]`);
        if (fastq2Input && fastq2Input.files.length > 0) {
            console.log(`fastq2: ${fastq2Input.files[0].name}`);
        } else {
            console.log(`fastq2: No file selected`);
        }

        const outputFileName = sample.querySelector(`input[id^="RNAseq_${group}_outputFileName_${index + 1}"]`);
        if (outputFileName) {
            console.log(`outputFileName: ${outputFileName.value}`);
        } else {
            console.log('outputFileName: No output file name found');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    RNAseq_toggleAnalysisType();
    var analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;

    if (analysisType === 'TPM') {
        updateSamples('TpmAnalysisOnly');
    } else if (analysisType === 'TPM_DESeq2') {
        updateSamples('control');
        updateSamples('treatment');
    }

    document.getElementById('RNAseq_uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();

        // 重新获取分析类型
        var analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;
        console.log('Submitting form with analysisType:', analysisType);
        
        if (analysisType === 'TPM') {
            console.log('Current samples for TPM:');
            printCurrentSamples('TpmAnalysisOnly');
        } else if (analysisType === 'TPM_DESeq2') {
            console.log('Current samples for control:');
            printCurrentSamples('control');
            console.log('Current samples for treatment:');
            printCurrentSamples('treatment');
        }
        
        if (analysisType === 'TPM' && !checkTPMsampleInputAndOutput()) {
            return;
        }

        if (analysisType === 'TPM_DESeq2' && !checkDeseq2Samples()) {
            return;
        }

        if (analysisType === 'TPM') {
            handleTPMAnalysis();
        } else if (analysisType === 'TPM_DESeq2') {
            handleDESeq2Analysis(); // 先生成 jobID 并上传，再在回调里调用 RNAseq_DESeq2_executeCode
        }
    });
});

function RNAseq_toggleAnalysisType() {
    // 获取选中的分析类型
    var analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;
    
    // 获取图片元素
    var RNAseq_image = document.getElementById('RNAseq_image');

    // 根据分析类型更改图片源和替代文本
    if (analysisType === 'TPM') {
        RNAseq_image.src = 'image/RNAseq_pipeline_TPM.png';
        RNAseq_image.alt = 'RNA-seq TPM Analysis Pipeline';
    } else if (analysisType === 'TPM_DESeq2') {
        RNAseq_image.src = 'image/RNAseq_pipeline_Deseq2.png';
        RNAseq_image.alt = 'RNA-seq DESeq2 Analysis Pipeline';
    }

    // 确保图片容器可见
    var RNAseq_imageContainer = document.getElementById('RNAseq_imageContainer');
    RNAseq_imageContainer.style.display = 'block';

    // 获取其他相关元素
    const DESeq2Groups = document.getElementById('DESeq2Groups');
    const addSampleButton = document.getElementById('addSampleButton');
    const sampleTPMonly = document.getElementById('RNAseq_TPM');
    const controlSamplesContainer = document.getElementById('controlSamples');
    const treatmentSamplesContainer = document.getElementById('treatmentSamples');

    // 清空之前的样本输入框
    sampleTPMonly.innerHTML = '';
    controlSamplesContainer.innerHTML = '';
    treatmentSamplesContainer.innerHTML = '';

    if (analysisType === 'TPM') {
        // 显示 TPM 分析所需的样本输入
        const initialSampleDiv = createSampleDiv(1);
        sampleTPMonly.appendChild(initialSampleDiv);
        DESeq2Groups.style.display = 'none';
        sampleTPMonly.style.display = 'block';
        addSampleButton.style.display = 'block';
    } else if (analysisType === 'TPM_DESeq2') {
        // 显示 DESeq2 分析所需的对照组和处理组样本输入
        DESeq2Groups.style.display = 'block';
        sampleTPMonly.style.display = 'none';
        addSampleButton.style.display = 'none';

        // 使用文档片段来优化 DOM 操作
        const controlFragment = document.createDocumentFragment();
        const treatmentFragment = document.createDocumentFragment();

        controlSampleCount = 2;
        treatmentSampleCount = 2;

        for (let i = 1; i <= controlSampleCount; i++) {
            const newControlSampleDiv = createControlSampleDiv(i);
            controlFragment.appendChild(newControlSampleDiv);
        }

        for (let i = 1; i <= treatmentSampleCount; i++) {
            const newTreatmentSampleDiv = createTreatmentSampleDiv(i);
            treatmentFragment.appendChild(newTreatmentSampleDiv);
        }

        controlSamplesContainer.appendChild(controlFragment);
        treatmentSamplesContainer.appendChild(treatmentFragment);
    }
}

function RNAseq_generateJobID(outputFileName, analysisType) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomPart = '';
    for (var i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    let prefix = '';
    if (analysisType === 'TPM') {
        prefix = 'rsTPM';
    } else if (analysisType === 'TPM_DESeq2') {
        prefix = 'rsDeq';
    }

    var date = new Date();
    var year = date.getFullYear().toString().slice(-2); // 取年份的后两位
    var month = ('0' + (date.getMonth() + 1)).slice(-2); // 补零取月
    var day = ('0' + date.getDate()).slice(-2); // 补零取日
    var datePrefix = year + month + day; // 日期前缀

    return prefix + datePrefix + randomPart + '_' + outputFileName;
}

function checkTPMsampleInputAndOutput() {
    const fileNames = new Set();
    const outputNames = new Set();
    
    for (let i = 1; i <= sampleTPM; i++) {
        const fileInput1 = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`);
        const outputFileName = document.getElementById(`RNAseq_outputFileName_${i}`).value;
        const fivePrimeAdapter = document.getElementById(`RNAseq_fivePrimeAdapter_${i}`).value;
        const threePrimeAdapter = document.getElementById(`RNAseq_threePrimeAdapter_${i}`).value;


        if (!fileInput1) {  // 检查 fileInput1 是否存在
            console.error(`Element RNAseq_fileToUpload_fastq1_${i} not found for sample ${i}`);
            return false;
        }
        if (!fileInput2) {  // 检查 fileInput2 是否存在
            console.error(`Element RNAseq_fileToUpload_fastq2_${i} not found for sample ${i}`);
            return false;
        }
        if (fileInput1.files.length > 0) {
            if (!fileInput1.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${fileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(fileInput1.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
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
            if (!isValidFileName(fileInput2.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`File name ${fileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput2.files[0].name)) {
                alert(`File name ${fileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput2.files[0].name);
        }

        if (!isValidFileName(outputFileName)) {  // 修改：调用 isValidFileName 函数进行检查
            alert(`Output file name ${outputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (outputNames.has(outputFileName)) {
            alert(`Output file name ${outputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        outputNames.add(outputFileName);

        if (fivePrimeAdapter && !isValidAdapterSequence(fivePrimeAdapter)) {
            alert(`5' Adapter sequence for sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
        if (threePrimeAdapter && !isValidAdapterSequence(threePrimeAdapter)) {
            alert(`3' Adapter sequence for sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
    }
    return true;
}

function checkDeseq2Samples() {
    const controlFileNames = new Set();
    const controlOutputNames = new Set();
    const treatmentFileNames = new Set();
    const treatmentOutputNames = new Set();

    for (let i = 1; i <= controlSampleCount; i++) {
        const controlFileInput1 = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`);
        const controlFileInput2 = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`);
        const controlOutputFileName = document.getElementById(`RNAseq_control_outputFileName_${i}`).value;
        const controlFivePrimeAdapter = document.getElementById(`RNAseq_control_fivePrimeAdapter_${i}`).value;
        const controlThreePrimeAdapter = document.getElementById(`RNAseq_control_threePrimeAdapter_${i}`).value;


        if (controlFileInput1.files.length > 0) {
            if (!controlFileInput1.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${controlFileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(controlFileInput1.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`Control file name ${controlFileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (controlFileNames.has(controlFileInput1.files[0].name)) {
                alert(`Control file name ${controlFileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            controlFileNames.add(controlFileInput1.files[0].name);
        }

        if (controlFileInput2.files.length > 0) {
            if (!controlFileInput2.files[0].name.endsWith('.fastq.gz')) {  // Ensure file has correct extension
                alert(`File ${controlFileInput2.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(controlFileInput2.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`Control file name ${controlFileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (controlFileNames.has(controlFileInput2.files[0].name)) {
                alert(`Control file name ${controlFileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            controlFileNames.add(controlFileInput2.files[0].name);
        }

        if (!isValidFileName(controlOutputFileName)) {  // 修改：调用 isValidFileName 函数进行检查
            alert(`Control output file name ${controlOutputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (controlOutputNames.has(controlOutputFileName)) {
            alert(`Control output file name ${controlOutputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        controlOutputNames.add(controlOutputFileName);

        if (controlFivePrimeAdapter && !isValidAdapterSequence(controlFivePrimeAdapter)) {
            alert(`5' Adapter sequence for control sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
        if (controlThreePrimeAdapter && !isValidAdapterSequence(controlThreePrimeAdapter)) {
            alert(`3' Adapter sequence for control sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
    }

    for (let i = 1; i <= treatmentSampleCount; i++) {
        const treatmentFileInput1 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`);
        const treatmentFileInput2 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`);
        const treatmentOutputFileName = document.getElementById(`RNAseq_treatment_outputFileName_${i}`).value;
        const treatmentFivePrimeAdapter = document.getElementById(`RNAseq_treatment_fivePrimeAdapter_${i}`).value;
        const treatmentThreePrimeAdapter = document.getElementById(`RNAseq_treatment_threePrimeAdapter_${i}`).value;


        if (treatmentFileInput1.files.length > 0) {
            if (!isValidFileName(treatmentFileInput1.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`Treatment file name ${treatmentFileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (treatmentFileNames.has(treatmentFileInput1.files[0].name)) {
                alert(`Treatment file name ${treatmentFileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            treatmentFileNames.add(treatmentFileInput1.files[0].name);
        }

        if (treatmentFileInput2.files.length > 0) {
            if (!isValidFileName(treatmentFileInput2.files[0].name)) {  // 修改：调用 isValidFileName 函数进行检查
                alert(`Treatment file name ${treatmentFileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (treatmentFileNames.has(treatmentFileInput2.files[0].name)) {
                alert(`Treatment file name ${treatmentFileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            treatmentFileNames.add(treatmentFileInput2.files[0].name);
        }

        if (!isValidFileName(treatmentOutputFileName)) {  // 修改：调用 isValidFileName 函数进行检查
            alert(`Treatment output file name ${treatmentOutputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (treatmentOutputNames.has(treatmentOutputFileName)) {
            alert(`Treatment output file name ${treatmentOutputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        treatmentOutputNames.add(treatmentOutputFileName);

        if (treatmentFivePrimeAdapter && !isValidAdapterSequence(treatmentFivePrimeAdapter)) {
            alert(`5' Adapter sequence for treatment sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
        if (treatmentThreePrimeAdapter && !isValidAdapterSequence(treatmentThreePrimeAdapter)) {
            alert(`3' Adapter sequence for treatment sample ${i} contains invalid characters. Please use only XACGTURYSWKMBDHVN.`);
            return false;
        }
    }

    return true;
}

function handleTPMAnalysis() {
    RNAseq_jobID = RNAseq_generateJobID(document.getElementById('RNAseq_outputFileName_1').value, 'TPM');
    RNAseq_progressBars = [];

    for (let i = 1; i <= sampleTPM; i++) {
        const fileInput1 = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`);

        if (!fileInput1 || !fileInput2) {
            console.error(`File input elements for sample ${i} not found.`);
            return;
        }

        RNAseq_files.push(fileInput1.files[0]);
        RNAseq_files.push(fileInput2.files[0]);
        RNAseq_fileNames.push(`FASTQ1_Sample${i}`);
        RNAseq_fileNames.push(`FASTQ2_Sample${i}`);

        // 动态添加进度条容器和文本元素
        addProgressBar(i, '1');
        addProgressBar(i, '2');
    }

    RNAseq_uploadChunk(); // 开始上传逻辑
}

function addProgressBar(sampleIndex, fileSuffix) {
    const progressBarContainer = document.createElement('div');
    progressBarContainer.id = `RNAseq_progressBarContainer${fileSuffix}_${sampleIndex}`;
    progressBarContainer.style = 'width: 50%; background-color: transparent; border-radius: 10px; margin-top: 5px;';

    const progressBar = document.createElement('div');
    progressBar.id = `RNAseq_progressBar${fileSuffix}_${sampleIndex}`;
    progressBar.style = 'width: 0%; height: 15px; background-color: #76c7c0; border-radius: 10px;';

    const progressText = document.createElement('p');
    progressText.id = `RNAseq_progressText${fileSuffix}_${sampleIndex}`;
    progressText.style = 'margin-left: 10px;';

    progressBarContainer.appendChild(progressBar);
    document.getElementById('progressBarsContainer').appendChild(progressBarContainer);
    document.getElementById('progressBarsContainer').appendChild(progressText);

    RNAseq_progressBars.push({ container: progressBar, text: progressText });
}

function handleDESeq2Analysis() {
    RNAseq_jobID = RNAseq_generateJobID(document.getElementById('RNAseq_control_outputFileName_1').value, 'TPM_DESeq2');
    RNAseq_progressBars = [];

    for (let i = 1; i <= controlSampleCount; i++) {
        const fileInput1 = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`);

        if (!fileInput1 || !fileInput2) {
            console.error(`File input elements for control sample ${i} not found.`);
            return;
        }

        RNAseq_files.push(fileInput1.files[0]);
        RNAseq_files.push(fileInput2.files[0]);
        RNAseq_fileNames.push(`Control_FASTQ1_Sample${i}`);
        RNAseq_fileNames.push(`Control_FASTQ2_Sample${i}`);

        addProgressBar(i, 'Control_1');
        addProgressBar(i, 'Control_2');
    }

    for (let i = 1; i <= treatmentSampleCount; i++) {
        const fileInput1 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`);

        if (!fileInput1 || !fileInput2) {
            console.error(`File input elements for treatment sample ${i} not found.`);
            return;
        }

        RNAseq_files.push(fileInput1.files[0]);
        RNAseq_files.push(fileInput2.files[0]);
        RNAseq_fileNames.push(`Treatment_FASTQ1_Sample${i}`);
        RNAseq_fileNames.push(`Treatment_FASTQ2_Sample${i}`);

        // 动态添加进度条容器和文本元素
        addProgressBar(i, 'Treatment_1');
        addProgressBar(i, 'Treatment_2');
    }

    RNAseq_uploadChunk(); // 开始上传逻辑
}

function RNAseq_uploadChunk(fileIndex = 0, offset = 0) {
    // 隐藏上传按钮
    document.getElementById('RNAseq_uploadButton').style.display = 'none';

    if (fileIndex >= RNAseq_files.length) {
        console.log('All files have been uploaded.');
        if (document.querySelector('input[name="RNAseq_analysisType"]:checked').value === 'TPM') {
            RNAseq_TPMonly_executeCode();
        } else if (document.querySelector('input[name="RNAseq_analysisType"]:checked').value === 'TPM_DESeq2') {
            RNAseq_DESeq2_executeCode();
        }
        const firstProgressBarText = document.getElementById("RNAseq_progressText1_1");
        if (firstProgressBarText) {
            firstProgressBarText.textContent = 'All files uploaded successfully!';
        }
        return;
    }

    let file = RNAseq_files[fileIndex];
    const chunk = file.slice(offset, offset + chunkSize);
    const formData = new FormData();
    formData.append("fileChunk", chunk);
    formData.append("fileName", file.name);
    formData.append("offset", offset);
    formData.append("totalSize", file.size);
    formData.append("jobID", RNAseq_jobID);

    fetch('./Analyzer_php/upload_chunk.php', {
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
            if (RNAseq_progressBars[fileIndex] && RNAseq_progressBars[fileIndex].text) {
                RNAseq_progressBars[fileIndex].text.textContent = `Uploading ${RNAseq_fileNames[fileIndex]}: ${progress}%`;
                RNAseq_progressBars[fileIndex].container.style.width = progress + '%';
            } else {
                console.error(`Progress bar for file index ${fileIndex} not found.`);
            }

            if (offset < file.size) {
                RNAseq_uploadChunk(fileIndex, offset);
            } else {
                RNAseq_uploadChunk(fileIndex + 1, 0); // 上传下一个文件
            }
        } else {
            console.error('Upload failed:', data.message);
        }
    }).catch(error => {
        console.error('Error uploading chunk:', error);
    });
}

function addControlSample() {
    if (controlSampleCount >= 6) {
        alert('Control group cannot have more than 6 samples.');
        return;
    }
    controlSampleCount++;
    const controlSamplesContainer = document.getElementById('controlSamples');
    const newControlSampleDiv = createControlSampleDiv(controlSampleCount);
    controlSamplesContainer.appendChild(newControlSampleDiv);
}

function removeSample(group, sampleIndex) {
    if ((group === 'control' && controlSampleCount <= 2) || 
        (group === 'treatment' && treatmentSampleCount <= 2) || 
        (group === 'TpmAnalysisOnly' && sampleTPM <= 1)) {
        alert(`Each group must have at least ${group === 'TpmAnalysisOnly' ? 'one sample' : 'two samples'}.`);
        return;
    }

    const sampleDiv = document.getElementById(`${group}_sample_${sampleIndex}`);
    if (sampleDiv && sampleDiv.parentNode) {
        sampleDiv.parentNode.removeChild(sampleDiv);

        if (group === 'control') {
            controlSampleCount--;
        } else if (group === 'treatment') {
            treatmentSampleCount--;
        } else if (group === 'TpmAnalysisOnly') {
            sampleTPM--;
        }

        updateSamples(group); // 更新样本编号和按钮状态
    } else {
        console.error(`Sample div with id ${group}_sample_${sampleIndex} not found.`);
    }
}

function updateSamples(group) {
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        const sampleIndex = index + 1;  // 更新样品的索引
        sample.id = `${group}_sample_${sampleIndex}`;  // 更新样品的 ID

        // 更新样品标题
        if (group === 'TpmAnalysisOnly') {
            sample.querySelector('h4').textContent = `Sample ${sampleIndex}`;
        } else if (group === 'control') {
            sample.querySelector('h4').textContent = `Control Sample ${sampleIndex}`;
        } else if (group === 'treatment') {
            sample.querySelector('h4').textContent = `Treatment Sample ${sampleIndex}`;
        }

        // 更新删除按钮的 onclick 属性
        const removeButton = sample.querySelector('.removeSampleButton');
        if (removeButton) {
            removeButton.setAttribute('onclick', `removeSample('${group}', ${sampleIndex})`);
        }

        // 确保更新所有相关元素的 ID 和名称
        const elements = sample.querySelectorAll('input, label, p');
        elements.forEach(element => {
            const name = element.getAttribute('name');
            const id = element.getAttribute('id');
            const forAttr = element.getAttribute('for');
            const placeholder = element.getAttribute('placeholder');

            if (name) element.setAttribute('name', name.replace(/\d+$/, sampleIndex));
            if (id) element.setAttribute('id', id.replace(/\d+$/, sampleIndex));
            if (forAttr) element.setAttribute('for', forAttr.replace(/\d+$/, sampleIndex));
            if (placeholder) {
                if (placeholder.startsWith('Sample')) {
                    element.setAttribute('placeholder', `Sample ${sampleIndex}`);
                } else if (placeholder.startsWith('ControlSample')) {
                    element.setAttribute('placeholder', `ControlSample ${sampleIndex}`);
                } else if (placeholder.startsWith('TreatmentSample')) {
                    element.setAttribute('placeholder', `TreatmentSample ${sampleIndex}`);
                }
            }
        });


        // 更新 fastq1 和 fastq2 的 id 和 for 属性
        const fastq1Label = sample.querySelector('label[for^="RNAseq_fileToUpload_fastq1"]');
        const fastq1Input = sample.querySelector('input[id^="RNAseq_fileToUpload_fastq1"]');
        const fastq2Label = sample.querySelector('label[for^="RNAseq_fileToUpload_fastq2"]');
        const fastq2Input = sample.querySelector('input[id^="RNAseq_fileToUpload_fastq2"]');

        if (fastq1Label && fastq1Input) {
            fastq1Label.setAttribute('for', `RNAseq_fileToUpload_fastq1_${sampleIndex}`);
            fastq1Input.setAttribute('id', `RNAseq_fileToUpload_fastq1_${sampleIndex}`);
        }

        if (fastq2Label && fastq2Input) {
            fastq2Label.setAttribute('for', `RNAseq_fileToUpload_fastq2_${sampleIndex}`);
            fastq2Input.setAttribute('id', `RNAseq_fileToUpload_fastq2_${sampleIndex}`);
        }

        // 输出调试信息，确保所有输入框都正确生成
        console.log(`Updated sample ${sampleIndex} for group ${group}:`, sample);
    });

    // 更新添加和删除按钮的文本和可见性
    const addSampleButton = document.getElementById('addSampleButton');
    const removeSampleButtons = document.querySelectorAll('.removeSampleButton');

    addSampleButton.textContent = 'Add one sample';

    if (sampleTPM <= 1 && group === 'TpmAnalysisOnly') {
        removeSampleButtons.forEach(button => button.style.display = 'none');
    } else {
        removeSampleButtons.forEach(button => button.style.display = 'inline-block');
    }

    if (group === 'control') {
        if (controlSampleCount <= 2) {
            removeSampleButtons.forEach(button => button.style.display = 'none');
        } else {
            removeSampleButtons.forEach(button => button.style.display = 'inline-block');
        }
    }

    if (group === 'treatment') {
        if (treatmentSampleCount <= 2) {
            removeSampleButtons.forEach(button => button.style.display = 'none');
        } else {
            removeSampleButtons.forEach(button => button.style.display = 'inline-block');
        }
    }
}


function addTreatmentSample() {
    if (treatmentSampleCount >= 6) {
        alert('Treatment group cannot have more than 6 samples.');
        return;
    }
    treatmentSampleCount++;
    const treatmentSamplesContainer = document.getElementById('treatmentSamples');
    const newTreatmentSampleDiv = createTreatmentSampleDiv(treatmentSampleCount);
    treatmentSamplesContainer.appendChild(newTreatmentSampleDiv);
}

function createControlSampleDiv(index) {
    const newControlSampleDiv = document.createElement('div');
    newControlSampleDiv.classList.add('RNAseq_sample', 'control_sample');
    newControlSampleDiv.id = `control_sample_${index}`;
    newControlSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the template download links here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download these control sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Control_R1.fastq.gz" download>Sample1 Control FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Control_R2.fastq.gz" download>Sample1 Control FASTQ R2</a><br>
            <a href="Samples/Sample2_RNAseq_Control_R1.fastq.gz" download>Sample2 Control FASTQ R1</a> |
            <a href="Samples/Sample2_RNAseq_Control_R2.fastq.gz" download>Sample2 Control FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Control Sample ${index}</h4>
        <section>
            <label>Choose <strong>Read 1 (R1)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_control_fastq1_${index}">Select File</button>
                <span id="fileNameDisplay_control_fastq1_${index}">No file selected</span>
                <input type="file" id="RNAseq_control_fileToUpload_fastq1_${index}" name="RNAseq_control_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section>
        <section>
            <label>Choose <strong>Read 2 (R2)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_control_fastq2_${index}">Select File</button>
                <span id="fileNameDisplay_control_fastq2_${index}">No file selected</span>
                <input type="file" id="RNAseq_control_fileToUpload_fastq2_${index}" name="RNAseq_control_fileToUpload_fastq2_${index}" required accept=".gz" style="display: none;">
            </div>
        </section>
        <section>
            <label for="RNAseq_control_fivePrimeAdapter_${index}">5' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCGTCGTGTA)</span>:</label>
            <input type="text" id="RNAseq_control_fivePrimeAdapter_${index}" name="RNAseq_control_fivePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCGTCGTGTA">
        </section>
        <section>
            <label for="RNAseq_control_threePrimeAdapter_${index}">3' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCACACGTCT)</span>:</label>
            <input type="text" id="RNAseq_control_threePrimeAdapter_${index}" name="RNAseq_control_threePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCACACGTCT">
        </section>
        <section>
            <label for="RNAseq_control_outputFileName_${index}">Output file name (without extension):</label>
            <input type="text" id="RNAseq_control_outputFileName_${index}" name="RNAseq_control_outputFileName_${index}" class="uniform-width" required placeholder="ControlSample${index}">
        </section>
        ${index > 2 ? `<button type="button" class="removeSampleButton" onclick="removeSample('control', ${index})">-</button>` : ''}
    `;

    // Event listeners for custom file input
    const fileInput1 = newControlSampleDiv.querySelector(`#RNAseq_control_fileToUpload_fastq1_${index}`);
    const customButton1 = newControlSampleDiv.querySelector(`#customButton_control_fastq1_${index}`);
    const fileNameDisplay1 = newControlSampleDiv.querySelector(`#fileNameDisplay_control_fastq1_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay1.textContent = file ? file.name : 'No file selected';
    });

    const fileInput2 = newControlSampleDiv.querySelector(`#RNAseq_control_fileToUpload_fastq2_${index}`);
    const customButton2 = newControlSampleDiv.querySelector(`#customButton_control_fastq2_${index}`);
    const fileNameDisplay2 = newControlSampleDiv.querySelector(`#fileNameDisplay_control_fastq2_${index}`);

    customButton2.addEventListener('click', function() {
        fileInput2.click();
    });

    fileInput2.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay2.textContent = file ? file.name : 'No file selected';
    });

    return newControlSampleDiv;
}

function createTreatmentSampleDiv(index) {
    const newTreatmentSampleDiv = document.createElement('div');
    newTreatmentSampleDiv.classList.add('RNAseq_sample', 'treatment_sample');
    newTreatmentSampleDiv.id = `treatment_sample_${index}`;
    newTreatmentSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the template download links here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download these treatment sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Treatment_R1.fastq.gz" download>Sample1 Treatment FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Treatment_R2.fastq.gz" download>Sample1 Treatment FASTQ R2</a><br>
            <a href="Samples/Sample2_RNAseq_Treatment_R1.fastq.gz" download>Sample2 Treatment FASTQ R1</a> |
            <a href="Samples/Sample2_RNAseq_Treatment_R2.fastq.gz" download>Sample2 Treatment FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Treatment Sample ${index}</h4>
        <section>
            <label>Choose <strong>Read 1 (R1)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_treatment_fastq1_${index}">Select File</button>
                <span id="fileNameDisplay_treatment_fastq1_${index}">No file selected</span>
                <input type="file" id="RNAseq_treatment_fileToUpload_fastq1_${index}" name="RNAseq_treatment_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section>
        <section>
            <label>Choose <strong>Read 2 (R2)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="customButton_treatment_fastq2_${index}">Select File</button>
                <span id="fileNameDisplay_treatment_fastq2_${index}">No file selected</span>
                <input type="file" id="RNAseq_treatment_fileToUpload_fastq2_${index}" name="RNAseq_treatment_fileToUpload_fastq2_${index}" required accept=".gz" style="display: none;">
            </div>
        </section>
        <section>
            <label for="RNAseq_treatment_fivePrimeAdapter_${index}">5' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCGTCGTGTA)</span>:</label>
            <input type="text" id="RNAseq_treatment_fivePrimeAdapter_${index}" name="RNAseq_treatment_fivePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCGTCGTGTA">
        </section>
        <section>
            <label for="RNAseq_treatment_threePrimeAdapter_${index}">3' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCACACGTCT)</span>:</label>
            <input type="text" id="RNAseq_treatment_threePrimeAdapter_${index}" name="RNAseq_treatment_threePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCACACGTCT">
        </section>
        <section>
            <label for="RNAseq_treatment_outputFileName_${index}">Output file name (without extension):</label>
            <input type="text" id="RNAseq_treatment_outputFileName_${index}" name="RNAseq_treatment_outputFileName_${index}" class="uniform-width" required placeholder="TreatmentSample${index}">
        </section>
        ${index > 2 ? `<button type="button" class="removeSampleButton" onclick="removeSample('treatment', ${index})">-</button>` : ''}
    `;

    // Event listeners for custom file input
    const fileInput1 = newTreatmentSampleDiv.querySelector(`#RNAseq_treatment_fileToUpload_fastq1_${index}`);
    const customButton1 = newTreatmentSampleDiv.querySelector(`#customButton_treatment_fastq1_${index}`);
    const fileNameDisplay1 = newTreatmentSampleDiv.querySelector(`#fileNameDisplay_treatment_fastq1_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay1.textContent = file ? file.name : 'No file selected';
    });

    const fileInput2 = newTreatmentSampleDiv.querySelector(`#RNAseq_treatment_fileToUpload_fastq2_${index}`);
    const customButton2 = newTreatmentSampleDiv.querySelector(`#customButton_treatment_fastq2_${index}`);
    const fileNameDisplay2 = newTreatmentSampleDiv.querySelector(`#fileNameDisplay_treatment_fastq2_${index}`);

    customButton2.addEventListener('click', function() {
        fileInput2.click();
    });

    fileInput2.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay2.textContent = file ? file.name : 'No file selected';
    });

    return newTreatmentSampleDiv;
}

function addSample() {
    if (sampleTPM >= 6) {  // 检查样品数量是否超过6
        alert('Samples number cannot have more than 6.');  // 如果超过6，显示警告信息
        return;  // 退出函数，不继续执行
    }
    sampleTPM++;  // 样品数量增加1
    const sampleTPMonly = document.getElementById('RNAseq_TPM');  // 获取包含样品的容器
    const newSampleDiv = createSampleDiv(sampleTPM);  // 创建新的样品div，传入样品数量
    sampleTPMonly.appendChild(newSampleDiv);  // 将新的样品div添加到容器中
    document.getElementById('addSampleButton').textContent = 'Add one sample';  // 修改加号按钮的文本
}

function createSampleDiv(index) {
    const newSampleDiv = document.createElement('div');
    newSampleDiv.classList.add('RNAseq_sample', 'TpmAnalysisOnly_sample');
    newSampleDiv.id = `TpmAnalysisOnly_sample_${index}`;
    newSampleDiv.innerHTML = `
        ${index === 1 ? `
        <!-- Add the sample download links here -->
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
            <p>You may download these sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Control_R1.fastq.gz" download>Sample1 RNA-seq FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Control_R2.fastq.gz" download>Sample1 RNA-seq FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        </div>
        ` : ''}
        <h4>Paired-End Sample ${index}</h4> 
        <section> 
            <label>Choose <strong>Read 1 (R1)</strong> file (.fastq.gz):</label> 
            <div class="custom-file-input">
                <button type="button" id="customButton_fastq1_${index}">Select File</button>
                <span id="fileNameDisplay_fastq1_${index}">No file selected</span>
                <input type="file" id="RNAseq_fileToUpload_fastq1_${index}" name="RNAseq_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label>Choose <strong>Read 2 (R2)</strong> file (.fastq.gz):</label> 
            <div class="custom-file-input">
                <button type="button" id="customButton_fastq2_${index}">Select File</button>
                <span id="fileNameDisplay_fastq2_${index}">No file selected</span>
                <input type="file" id="RNAseq_fileToUpload_fastq2_${index}" name="RNAseq_fileToUpload_fastq2_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label for="RNAseq_fivePrimeAdapter_${index}">5' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCGTCGTGTA)</span>:</label> 
            <input type="text" id="RNAseq_fivePrimeAdapter_${index}" name="RNAseq_fivePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCGTCGTGTA"> 
        </section> 
        <section> 
            <label for="RNAseq_threePrimeAdapter_${index}">3' Adapter Sequence <span style="font-size: smaller;">(default: AGATCGGAAGAGCACACGTCT)</span>:</label> 
            <input type="text" id="RNAseq_threePrimeAdapter_${index}" name="RNAseq_threePrimeAdapter_${index}" class="uniform-width" placeholder="AGATCGGAAGAGCACACGTCT"> 
        </section> 
        <section> 
            <label for="RNAseq_outputFileName_${index}">Output file name (without extension):</label> 
            <input type="text" id="RNAseq_outputFileName_${index}" name="RNAseq_outputFileName_${index}" class="uniform-width" required placeholder="Sample${index}"> 
        </section> 
        ${index > 1 ? `<button type="button" class="removeSampleButton" onclick="removeSample('TpmAnalysisOnly', ${index})">-</button>` : ''}
    `;

    // Event listeners for custom file input
    const fileInput1 = newSampleDiv.querySelector(`#RNAseq_fileToUpload_fastq1_${index}`);
    const customButton1 = newSampleDiv.querySelector(`#customButton_fastq1_${index}`);
    const fileNameDisplay1 = newSampleDiv.querySelector(`#fileNameDisplay_fastq1_${index}`);

    customButton1.addEventListener('click', function() {
        fileInput1.click();
    });

    fileInput1.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay1.textContent = file ? file.name : 'No file selected';
    });

    const fileInput2 = newSampleDiv.querySelector(`#RNAseq_fileToUpload_fastq2_${index}`);
    const customButton2 = newSampleDiv.querySelector(`#customButton_fastq2_${index}`);
    const fileNameDisplay2 = newSampleDiv.querySelector(`#fileNameDisplay_fastq2_${index}`);

    customButton2.addEventListener('click', function() {
        fileInput2.click();
    });

    fileInput2.addEventListener('change', function() {
        const file = this.files[0];
        fileNameDisplay2.textContent = file ? file.name : 'No file selected';
    });

    return newSampleDiv;
}

function isValidFileName(fileName) {
    // 正则表达式：不允许包含特殊字符或空格
    const regex = /^[a-zA-Z0-9_.-]+$/;
    return regex.test(fileName);
}


// 添加验证适配器序列的函数
function isValidAdapterSequence(sequence) {
    const allowedAdapterChars = /^[XACGTURYSWKMBDHVN]+$/;
    const containsOnlyN = /^N+$/;
    return allowedAdapterChars.test(sequence) && !containsOnlyN.test(sequence);
}
