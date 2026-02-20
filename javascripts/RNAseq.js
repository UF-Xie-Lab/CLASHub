/* ============================================================
   CLASHub — RNA-seq Analysis Module
   (Refactored to use common_analyzer.js utilities)
============================================================ */

// State Management
let RNAseq_jobID = "";
let RNAseq_files = [];
let RNAseq_fileNames = [];
let RNAseq_progressBars = [];

// Sample Counters
let sampleTPM = 1;
let controlSampleCount = 2;
let treatmentSampleCount = 2;

console.log("[RNAseq] Environment detected via Common:", CLASH_ENV);

/* ============================================================
   1. Execution Logic (Communicates with slurm PHP)
============================================================ */

function RNAseq_TPMonly_executeCode() {
    const formData = new FormData();

    for (let i = 1; i <= sampleTPM; i++) {
        const fileInput1 = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`);
        
        // Safety check to prevent errors if elements are missing
        const RNAseq_fileToUpload_fastq1 = fileInput1 && fileInput1.files.length > 0 ? fileInput1.files[0].name : "";
        const RNAseq_fileToUpload_fastq2 = fileInput2 && fileInput2.files.length > 0 ? fileInput2.files[0].name : "";

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
    const libraryType = document.getElementById('RNAseq_libraryType').value;

    const umi5 = document.getElementById('RNAseq_umi5').value || 0;
    const umi3 = document.getElementById('RNAseq_umi3').value || 0;
    
    const eisaCheckbox = document.getElementById('RNAseq_performEISA');
    let performEISA = (eisaCheckbox && eisaCheckbox.checked) ? 'yes' : 'no';

    formData.append('RNAseq_umi5', umi5);
    formData.append('RNAseq_umi3', umi3);

    formData.append('RNAseq_libraryType', libraryType);
    formData.append('RNAseq_performEISA', performEISA);

    formData.append('jobID', RNAseq_jobID);
    formData.append('analysisType', document.querySelector('input[name="RNAseq_analysisType"]:checked').value);
    formData.append('execute', 'true');
    formData.append('RNAseq_species', RNAseq_species);
    formData.append('RNAseq_email', RNAseq_email);
    formData.append('sampleTPM', sampleTPM);
    // Use the global environment variable from common_analyzer.js
    formData.append('RNA_ENV', CLASH_ENV);

    fetch('./Analyzer_php/RNAseq_execute_slurm.php', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    }).then(text => {
        console.log('Execute response:', text);
    }).catch(error => {
        console.error('Error executing code:', error);
    });
}

function RNAseq_DESeq2_executeCode() {
    const formData = new FormData();

    // Process Control Group
    for (let i = 1; i <= controlSampleCount; i++) {
        const fileInput1 = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`);
        
        const controlFileToUpload_fastq1 = fileInput1 && fileInput1.files.length > 0 ? fileInput1.files[0].name : "";
        const controlFileToUpload_fastq2 = fileInput2 && fileInput2.files.length > 0 ? fileInput2.files[0].name : "";
        
        const controlOutputFileName = document.getElementById(`RNAseq_control_outputFileName_${i}`).value;
        const RNAseq_defaultFivePrimeAdapter = 'AGATCGGAAGAGCGTCGTGTA';
        const RNAseq_defaultThreePrimeAdapter = 'AGATCGGAAGAGCACACGTCT';
        const RNAseq_fivePrimeAdapter = document.getElementById(`RNAseq_control_fivePrimeAdapter_${i}`).value || RNAseq_defaultFivePrimeAdapter;
        const RNAseq_threePrimeAdapter = document.getElementById(`RNAseq_control_threePrimeAdapter_${i}`).value || RNAseq_defaultThreePrimeAdapter;

        formData.append(`controlFileToUpload_fastq1_${i}`, controlFileToUpload_fastq1);
        formData.append(`controlFileToUpload_fastq2_${i}`, controlFileToUpload_fastq2);
        formData.append(`controlOutputFileName_${i}`, controlOutputFileName);
        formData.append(`controlRNAseq_fivePrimeAdapter_${i}`, RNAseq_fivePrimeAdapter);
        formData.append(`controlRNAseq_threePrimeAdapter_${i}`, RNAseq_threePrimeAdapter);
    }

    // Process Treatment Group
    for (let i = 1; i <= treatmentSampleCount; i++) {
        const fileInput1 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`);

        const treatmentFileToUpload_fastq1 = fileInput1 && fileInput1.files.length > 0 ? fileInput1.files[0].name : "";
        const treatmentFileToUpload_fastq2 = fileInput2 && fileInput2.files.length > 0 ? fileInput2.files[0].name : "";

        const treatmentOutputFileName = document.getElementById(`RNAseq_treatment_outputFileName_${i}`).value;
        const RNAseq_defaultFivePrimeAdapter = 'AGATCGGAAGAGCGTCGTGTA';
        const RNAseq_defaultThreePrimeAdapter = 'AGATCGGAAGAGCACACGTCT';
        const RNAseq_fivePrimeAdapter = document.getElementById(`RNAseq_treatment_fivePrimeAdapter_${i}`).value || RNAseq_defaultFivePrimeAdapter;
        const RNAseq_threePrimeAdapter = document.getElementById(`RNAseq_treatment_threePrimeAdapter_${i}`).value || RNAseq_defaultThreePrimeAdapter;

        formData.append(`treatmentFileToUpload_fastq1_${i}`, treatmentFileToUpload_fastq1);
        formData.append(`treatmentFileToUpload_fastq2_${i}`, treatmentFileToUpload_fastq2);
        formData.append(`treatmentOutputFileName_${i}`, treatmentOutputFileName);
        formData.append(`treatmentRNAseq_fivePrimeAdapter_${i}`, RNAseq_fivePrimeAdapter);
        formData.append(`treatmentRNAseq_threePrimeAdapter_${i}`, RNAseq_threePrimeAdapter);
    }

    const RNAseq_species = document.getElementById('RNAseq_species').value;
    const RNAseq_email = document.getElementById('RNAseq_email').value;
    const libraryType = document.getElementById('RNAseq_libraryType').value;

    const umi5 = document.getElementById('RNAseq_umi5').value || 0;
    const umi3 = document.getElementById('RNAseq_umi3').value || 0;
    
    const eisaCheckbox = document.getElementById('RNAseq_performEISA');
    let performEISA = (eisaCheckbox && eisaCheckbox.checked) ? 'yes' : 'no';

    formData.append('RNAseq_libraryType', libraryType);
    formData.append('RNAseq_performEISA', performEISA);

    formData.append('RNAseq_umi5', umi5);
    formData.append('RNAseq_umi3', umi3);

    formData.append('jobID', RNAseq_jobID);
    formData.append('analysisType', 'TPM_DESeq2');
    formData.append('execute', 'true');
    formData.append('RNAseq_species', RNAseq_species);
    formData.append('RNAseq_email', RNAseq_email);
    formData.append('controlSampleCount', controlSampleCount);
    formData.append('treatmentSampleCount', treatmentSampleCount);
    // Use the global environment variable from common_analyzer.js
    formData.append('RNA_ENV', CLASH_ENV);

    fetch('./Analyzer_php/RNAseq_execute_slurm.php', {
        method: 'POST',
        body: formData
    }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    }).then(text => {
        console.log('Execute response:', text);
    }).catch(error => {
        console.error('Error executing code:', error);
        alert('Failed to send data to PHP: ' + error.message);
    });
}

// Debugging Helper
function printCurrentSamples(group) {
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {

        const i = index + 1;
        console.log(`Sample ${i} for group ${group}:`);
        console.log(`ID: ${sample.id}`);

        let fastq1Input, fastq2Input, outputInput;

        if (group === 'TpmAnalysisOnly') {
            fastq1Input = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`);
            fastq2Input = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`);
            outputInput = document.getElementById(`RNAseq_outputFileName_${i}`);
        }

        else if (group === 'control') {
            fastq1Input = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`);
            fastq2Input = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`);
            outputInput = document.getElementById(`RNAseq_control_outputFileName_${i}`);
        }

        else if (group === 'treatment') {
            fastq1Input = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`);
            fastq2Input = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`);
            outputInput = document.getElementById(`RNAseq_treatment_outputFileName_${i}`);
        }

        if (fastq1Input && fastq1Input.files.length > 0) {
            console.log(`fastq1: ${fastq1Input.files[0].name}`);
        } else {
            console.log(`fastq1: No file selected`);
        }

        if (fastq2Input && fastq2Input.files.length > 0) {
            console.log(`fastq2: ${fastq2Input.files[0].name}`);
        } else {
            console.log(`fastq2: No file selected`);
        }

        if (outputInput) {
            console.log(`outputFileName: ${outputInput.value}`);
        } else {
            console.log('outputFileName: No output file name found');
        }
    });
}

/* ============================================================
   2. DOM & UI Event Listeners
============================================================ */

document.addEventListener('DOMContentLoaded', function() {
    // Ensure RNAseq image stays hidden until the user clicks RNA-seq menu
    const RNAimgContainer = document.getElementById('RNAseq_imageContainer');
    if (RNAimgContainer) RNAimgContainer.style.display = 'none';

    var analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;

    if (analysisType === 'TPM') {
        updateSamples('TpmAnalysisOnly');
    } else if (analysisType === 'TPM_DESeq2') {
        updateSamples('control');
        updateSamples('treatment');
    }

    document.getElementById('RNAseq_uploadForm').addEventListener('submit', function(event) {
        event.preventDefault();

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
            handleDESeq2Analysis(); 
        }
    });
});

function RNAseq_toggleAnalysisType() {
    var analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;
    
    var RNAseq_image = document.getElementById('RNAseq_image');

    if (analysisType === 'TPM') {
        RNAseq_image.src = 'image/RNAseq_pipeline_TPM.png';
        RNAseq_image.alt = 'RNA-seq TPM Analysis Pipeline';
    } else if (analysisType === 'TPM_DESeq2') {
        RNAseq_image.src = 'image/RNAseq_pipeline_Deseq2.png';
        RNAseq_image.alt = 'RNA-seq DESeq2 Analysis Pipeline';
    }

    var RNAseq_imageContainer = document.getElementById('RNAseq_imageContainer');
    RNAseq_imageContainer.style.display = 'block';

    const DESeq2Groups = document.getElementById('DESeq2Groups');
    const addSampleButton = document.getElementById('addSampleButton');
    const sampleTPMonly = document.getElementById('RNAseq_TPM');
    const controlSamplesContainer = document.getElementById('controlSamples');
    const treatmentSamplesContainer = document.getElementById('treatmentSamples');

    sampleTPMonly.innerHTML = '';
    controlSamplesContainer.innerHTML = '';
    treatmentSamplesContainer.innerHTML = '';

    if (analysisType === 'TPM') {
        const initialSampleDiv = createSampleDiv(1);
        sampleTPMonly.appendChild(initialSampleDiv);
        DESeq2Groups.style.display = 'none';
        sampleTPMonly.style.display = 'block';
        addSampleButton.style.display = 'block';
    } else if (analysisType === 'TPM_DESeq2') {
        DESeq2Groups.style.display = 'block';
        sampleTPMonly.style.display = 'none';
        addSampleButton.style.display = 'none';

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

/* ============================================================
   3. Validation Logic (Uses common_analyzer.js)
============================================================ */

function checkTPMsampleInputAndOutput() {
    const fileNames = new Set();
    const outputNames = new Set();
    
    for (let i = 1; i <= sampleTPM; i++) {
        const fileInput1 = document.getElementById(`RNAseq_fileToUpload_fastq1_${i}`);
        const fileInput2 = document.getElementById(`RNAseq_fileToUpload_fastq2_${i}`);
        const outputFileName = document.getElementById(`RNAseq_outputFileName_${i}`).value;
        const fivePrimeAdapter = document.getElementById(`RNAseq_fivePrimeAdapter_${i}`).value;
        const threePrimeAdapter = document.getElementById(`RNAseq_threePrimeAdapter_${i}`).value;

        if (!fileInput1) {  
            console.error(`Element RNAseq_fileToUpload_fastq1_${i} not found for sample ${i}`);
            return false;
        }
        if (!fileInput2) {  
            console.error(`Element RNAseq_fileToUpload_fastq2_${i} not found for sample ${i}`);
            return false;
        }

        // Validate File 1
        if (fileInput1.files.length > 0) {
            if (!fileInput1.files[0].name.endsWith('.fastq.gz')) {  
                alert(`File ${fileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(fileInput1.files[0].name)) { 
                alert(`File name ${fileInput1.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput1.files[0].name)) {
                alert(`File name ${fileInput1.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput1.files[0].name);
        }

        // Validate File 2
        if (fileInput2.files.length > 0) {
            if (!fileInput2.files[0].name.endsWith('.fastq.gz')) {  
                alert(`File ${fileInput2.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(fileInput2.files[0].name)) {  
                alert(`File name ${fileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (fileNames.has(fileInput2.files[0].name)) {
                alert(`File name ${fileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            fileNames.add(fileInput2.files[0].name);
        }

        // Validate Output Name
        if (!isValidFileName(outputFileName)) {  
            alert(`Output file name ${outputFileName} contains invalid characters. Please choose a different name.`);
            return false;
        }
        if (outputNames.has(outputFileName)) {
            alert(`Output file name ${outputFileName} is duplicated. Please choose a different name.`);
            return false;
        }
        outputNames.add(outputFileName);

        // Validate Adapters
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

    // Check Control Group
    for (let i = 1; i <= controlSampleCount; i++) {
        const controlFileInput1 = document.getElementById(`RNAseq_control_fileToUpload_fastq1_${i}`);
        const controlFileInput2 = document.getElementById(`RNAseq_control_fileToUpload_fastq2_${i}`);
        const controlOutputFileName = document.getElementById(`RNAseq_control_outputFileName_${i}`).value;
        const controlFivePrimeAdapter = document.getElementById(`RNAseq_control_fivePrimeAdapter_${i}`).value;
        const controlThreePrimeAdapter = document.getElementById(`RNAseq_control_threePrimeAdapter_${i}`).value;

        if (controlFileInput1.files.length > 0) {
            if (!controlFileInput1.files[0].name.endsWith('.fastq.gz')) { 
                alert(`File ${controlFileInput1.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(controlFileInput1.files[0].name)) { 
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
            if (!controlFileInput2.files[0].name.endsWith('.fastq.gz')) {  
                alert(`File ${controlFileInput2.files[0].name} must be a .fastq.gz file.`);
                return false;
            }
            if (!isValidFileName(controlFileInput2.files[0].name)) { 
                alert(`Control file name ${controlFileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (controlFileNames.has(controlFileInput2.files[0].name)) {
                alert(`Control file name ${controlFileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            controlFileNames.add(controlFileInput2.files[0].name);
        }

        if (!isValidFileName(controlOutputFileName)) {  
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

    // Check Treatment Group
    for (let i = 1; i <= treatmentSampleCount; i++) {
        const treatmentFileInput1 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq1_${i}`);
        const treatmentFileInput2 = document.getElementById(`RNAseq_treatment_fileToUpload_fastq2_${i}`);
        const treatmentOutputFileName = document.getElementById(`RNAseq_treatment_outputFileName_${i}`).value;
        const treatmentFivePrimeAdapter = document.getElementById(`RNAseq_treatment_fivePrimeAdapter_${i}`).value;
        const treatmentThreePrimeAdapter = document.getElementById(`RNAseq_treatment_threePrimeAdapter_${i}`).value;

        if (treatmentFileInput1.files.length > 0) {
            if (!isValidFileName(treatmentFileInput1.files[0].name)) { 
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
            if (!isValidFileName(treatmentFileInput2.files[0].name)) {
                alert(`Treatment file name ${treatmentFileInput2.files[0].name} contains invalid characters. Please rename your file.`);
                return false;
            }
            if (treatmentFileNames.has(treatmentFileInput2.files[0].name)) {
                alert(`Treatment file name ${treatmentFileInput2.files[0].name} is duplicated. Please choose a different file.`);
                return false;
            }
            treatmentFileNames.add(treatmentFileInput2.files[0].name);
        }

        if (!isValidFileName(treatmentOutputFileName)) { 
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

/* ============================================================
   4. Upload Handling (Uses common_analyzer.js)
============================================================ */

function handleTPMAnalysis() {
    // Generate Job ID using common function with specific prefix
    const outputName = document.getElementById('RNAseq_outputFileName_1').value;
    RNAseq_jobID = generateJobID('rsTPM', outputName);
    
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

        addProgressBar(i, '1');
        addProgressBar(i, '2');
    }

    RNAseq_startBatchUpload(); 
}

function handleDESeq2Analysis() {
    // Generate Job ID using common function with specific prefix
    const outputName = document.getElementById('RNAseq_control_outputFileName_1').value;
    RNAseq_jobID = generateJobID('rsDeq', outputName);
    
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

        addProgressBar(i, 'Treatment_1');
        addProgressBar(i, 'Treatment_2');
    }

    RNAseq_startBatchUpload(); 
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

/**
 * Initiates the sequential upload of all files in RNAseq_files.
 * Utilizes the shared 'uploadFileChunks' function from common_analyzer.js.
 */
function RNAseq_startBatchUpload() {
    const uploadBtn = document.getElementById('RNAseq_uploadButton');
    if (uploadBtn) uploadBtn.style.display = 'none';

    processNextUpload(0);
}

function processNextUpload(index) {
    if (index >= RNAseq_files.length) {
        // All files uploaded, proceed to completion logic
        RNAseq_onAllUploadsFinished();
        return;
    }

    const file = RNAseq_files[index];
    
    // Call the shared upload function
    uploadFileChunks(file, RNAseq_jobID, (percent) => {
        // Update the specific progress bar for this file
        if (RNAseq_progressBars[index]) {
            RNAseq_progressBars[index].text.textContent = `Uploading ${RNAseq_fileNames[index]}: ${percent}%`;
            RNAseq_progressBars[index].container.style.width = percent + '%';
        }
    })
    .then(() => {
        // Upload successful, move to next file
        processNextUpload(index + 1);
    })
    .catch((err) => {
        console.error(`[RNAseq] Error uploading file ${index}:`, err);
        if (RNAseq_progressBars[index]) {
            RNAseq_progressBars[index].text.textContent = "Upload Failed.";
            RNAseq_progressBars[index].container.style.backgroundColor = "red";
        }
    });
}

/**
 * Triggered when all files are successfully uploaded.
 * Updates UI and executes the SLURM job.
 */
function RNAseq_onAllUploadsFinished() {
    const p = document.getElementById('progressBarsContainer');
    if (p) p.innerHTML = '';

    const formBox = document.getElementById('RNAseq_formContainer');
    const resultBox = document.getElementById('RNAseq_resultContainer');
    const jobID_local = RNAseq_jobID;
    const email_local = document.getElementById('RNAseq_email') ? document.getElementById('RNAseq_email').value : "";

    if (formBox && resultBox) {
        resultBox.innerHTML = `
            <p>Your file has been successfully uploaded.</p>
            <p>Your Job ID is: <span style="color: red;"><strong>${jobID_local}</strong></span></p>
            <p>Your Email is: <span style="color: red;"><strong>${email_local}</strong></span></p>
            <div id="RNAseq_queueInfo">Checking job status...</div>
            <p>Once processing is finished, an automatic notification email will be sent to you.</p>
            <p>You may also check progress or download results anytime in the <span style="color: orange; font-weight: bold;">Job Status</span> menu.</p>
            <p>Completed jobs remain available for download for 7 days.</p>
        `;

        formBox.style.display = "none";
        resultBox.style.display = "block";
    }

    console.log("[RNAseq] All files uploaded → submitting to SLURM");

    const analysisType = document.querySelector('input[name="RNAseq_analysisType"]:checked').value;
    if (analysisType === 'TPM') {
        RNAseq_TPMonly_executeCode();
    } else if (analysisType === 'TPM_DESeq2') {
        RNAseq_DESeq2_executeCode();
    }

    // Fetch queue status AFTER SLURM job submission
    setTimeout(() => {
        fetch('../Analyzer_php/slurm_status.php?jobname=' + jobID_local)
          .then(res => {
            console.log("[DEBUG] (AFTER SUBMIT) Querying slurm_status.php with jobID:", jobID_local);
            return res.json();
          })
          .then(data => {
            console.log("[DEBUG] (AFTER SUBMIT) slurm_status.php returned:", data);
            let msg = '';
            if (data.your_status === 'queued') {
                msg = `Your job is currently in the queue.`;
            } else if (data.your_status === 'running') {
                msg = `<span style="color:green;">Your job is now running.</span>`;
            } else if (data.your_status === 'not_found') {
                msg = `Job not found — it may take a moment for SLURM to register new submissions.`;
            } else {
                msg = `Job status: ${data.your_status}.`;
            }
            const q = document.getElementById('RNAseq_queueInfo');
            if (q) q.innerHTML = msg;
          })
          .catch(err => {
            console.error('Error fetching queue status:', err);
            const q = document.getElementById('RNAseq_queueInfo');
            if (q) q.innerHTML = 'Unable to fetch queue status right now.';
          });
    }, 1500); // slight delay ensures job is already in SLURM
}

/* ============================================================
   5. Sample Management (Add/Remove/Create)
============================================================ */

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

        updateSamples(group);
    } else {
        console.error(`Sample div with id ${group}_sample_${sampleIndex} not found.`);
    }
}

function updateSamples(group) {
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        const sampleIndex = index + 1; 
        sample.id = `${group}_sample_${sampleIndex}`;  

        if (group === 'TpmAnalysisOnly') {
            sample.querySelector('h4').textContent = `Sample ${sampleIndex}`;
        } else if (group === 'control') {
            sample.querySelector('h4').textContent = `Control Sample ${sampleIndex}`;
        } else if (group === 'treatment') {
            sample.querySelector('h4').textContent = `Treatment Sample ${sampleIndex}`;
        }

        const removeButton = sample.querySelector('.removeSampleButton');
        if (removeButton) {
            removeButton.setAttribute('onclick', `removeSample('${group}', ${sampleIndex})`);
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

        console.log(`Updated sample ${sampleIndex} for group ${group}:`, sample);
    });

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
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download these control sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Control_R1.fastq.gz" download>Sample1 Control FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Control_R2.fastq.gz" download>Sample1 Control FASTQ R2</a><br>
            <a href="Samples/Sample2_RNAseq_Control_R1.fastq.gz" download>Sample2 Control FASTQ R1</a> |
            <a href="Samples/Sample2_RNAseq_Control_R2.fastq.gz" download>Sample2 Control FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
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
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download these treatment sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Treatment_R1.fastq.gz" download>Sample1 Treatment FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Treatment_R2.fastq.gz" download>Sample1 Treatment FASTQ R2</a><br>
            <a href="Samples/Sample2_RNAseq_Treatment_R1.fastq.gz" download>Sample2 Treatment FASTQ R1</a> |
            <a href="Samples/Sample2_RNAseq_Treatment_R2.fastq.gz" download>Sample2 Treatment FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
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
    if (sampleTPM >= 6) { 
        alert('Samples number cannot have more than 6.'); 
        return; 
    }
    sampleTPM++; 
    const sampleTPMonly = document.getElementById('RNAseq_TPM'); 
    const newSampleDiv = createSampleDiv(sampleTPM);  
    sampleTPMonly.appendChild(newSampleDiv); 
    document.getElementById('addSampleButton').textContent = 'Add one sample'; 
}

function createSampleDiv(index) {
    const newSampleDiv = document.createElement('div');
    newSampleDiv.classList.add('RNAseq_sample', 'TpmAnalysisOnly_sample');
    newSampleDiv.id = `TpmAnalysisOnly_sample_${index}`;
    newSampleDiv.innerHTML = `
        ${index === 1 ? `
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download these sample FASTQ files to test the analysis, but it's optional:</p>
            <a href="Samples/Sample1_RNAseq_Control_R1.fastq.gz" download>Sample1 RNA-seq FASTQ R1</a> |
            <a href="Samples/Sample1_RNAseq_Control_R2.fastq.gz" download>Sample1 RNA-seq FASTQ R2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
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

/* ============================================================
   6. Form Initialization
============================================================ */

function RNAseq_initializeForm() {
    console.log("[RNAseq] initializeForm triggered");

    const resultBox = document.getElementById('RNAseq_resultContainer');
    if (resultBox) {
        resultBox.style.display = 'none';
        resultBox.innerHTML = '';
    }

    RNAseq_files = [];
    RNAseq_fileNames = [];
    RNAseq_progressBars = [];

    const tpmBox = document.getElementById('RNAseq_TPM');
    if (tpmBox) tpmBox.innerHTML = "";

    sampleTPM = 1;
    if (tpmBox) {
        tpmBox.appendChild(createSampleDiv(1));
    }

    controlSampleCount = 2;
    treatmentSampleCount = 2;

    const ctrl = document.getElementById('controlSamples');
    const trt = document.getElementById('treatmentSamples');

    if (ctrl) {
        ctrl.innerHTML = "";
        ctrl.appendChild(createControlSampleDiv(1));
        ctrl.appendChild(createControlSampleDiv(2));
    }

    if (trt) {
        trt.innerHTML = "";
        trt.appendChild(createTreatmentSampleDiv(1));
        trt.appendChild(createTreatmentSampleDiv(2));
    }

    const sp = document.getElementById('RNAseq_species');
    if (sp) sp.value = "";  

    const em = document.getElementById('RNAseq_email');
    if (em) em.value = "";  

    const btn = document.getElementById('RNAseq_uploadButton');
    if (btn) btn.style.display = "inline-block";

    const libType = document.getElementById('RNAseq_libraryType');
    if (libType) libType.value = "unstranded"; // Restore default

    const eisaCheckbox = document.getElementById('RNAseq_performEISA');
    if (eisaCheckbox) eisaCheckbox.checked = false;

    RNAseq_toggleAnalysisType();

    console.log("[RNAseq] Form reset complete");
}