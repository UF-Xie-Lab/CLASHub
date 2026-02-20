/**
 * ============================================================================
 * AQseq.js - miRNA-seq Analysis Module
 * Handles UI, validation, and file uploads for Single-End, Paired-End, and Cleaned FASTA.
 * Depends on: common_analyzer.js
 * ============================================================================
 */

// Global state variables
let aqseq_jobID = null;
let aqseq_files = [];       // Array of File objects to upload
let aqseq_fileNames = [];   // Array of display names for the files
let aqseq_progressBars = []; // Array of progress bar DOM elements

// Sample counters
let aqseq_PairedEnd_sampleCount = 1;
let aqseq_SingleEnd_sampleCount = 1;
let aqseq_CleanedFasta_sampleCount = 1;

// Global buttons
let addAqseq_PairedEndSampleButton;
let addAqseq_SingleEndSampleButton;
let addAqseq_CleanedFastaSampleButton;

function resetAqseqForms() {
    const formContainer = document.getElementById('aqseq_formContainer');
    if (formContainer) formContainer.style.display = 'block';

    const resultContainer = document.getElementById('aqseq_resultContainer');
    if (resultContainer) {
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
    }

    // Clear progress bars
    const pbContainer = document.getElementById('aqseqProgressBarsContainer');
    if (pbContainer) pbContainer.innerHTML = '';

    // Clear sample containers
    const containers = ['pairedEndSamplesContainer', 'singleEndSamplesContainer', 'aqseq_CleanedFastaSamplesContainer'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    // Reset inputs
    const species = document.getElementById('aqseq_species');
    if (species) species.value = '';

    const email = document.getElementById('aqseq_email');
    if (email) email.value = '';

    // Reset UMI length fields
    const umi5 = document.getElementById('aqseq_umi5');
    if (umi5) umi5.value = '';
    const umi3 = document.getElementById('aqseq_umi3');
    if (umi3) umi3.value = '';

    // Reset State
    aqseq_jobID = null;
    aqseq_files = [];
    aqseq_fileNames = [];
    aqseq_progressBars = [];
    aqseq_PairedEnd_sampleCount = 1;
    aqseq_SingleEnd_sampleCount = 1;
    aqseq_CleanedFasta_sampleCount = 1;

    // Show submit button
    const submitBtn = document.getElementById('aqseq_uploadButton');
    if (submitBtn) submitBtn.style.display = 'block';
}

/**
 * Initialization on DOM Load
 */
document.addEventListener('DOMContentLoaded', function() {
    addAqseq_PairedEndSampleButton = document.getElementById('addAqseq_PairedEndSampleButton');
    addAqseq_SingleEndSampleButton = document.getElementById('addAqseq_SingleEndSampleButton');
    addAqseq_CleanedFastaSampleButton = document.getElementById('addAqseq_CleanedFastaSampleButton');

    // Reset UI when clicking sidebar menu items
    const menuItemAqSeq = document.getElementById('menu-aqseq');
    if (menuItemAqSeq) {
        menuItemAqSeq.addEventListener('click', function () {
            // Hide other sections handled by Analyzer_main.js usually, but good safety
            resetAqseqForms();
            aqseq_toggleAnalysisType();
        });
    }

    // Reset AQ-seq if user navigates away to other tools
    ['menu-clash', 'menu-RNAseq', 'menu-cumulativeCurve', 'menu-jobStatus'].forEach(id => {
        const item = document.getElementById(id);
        if (item) {
            item.addEventListener('click', resetAqseqForms);
        }
    });

    // Form Submit Handler
    const form = document.getElementById('aqseq_uploadForm');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const analysisType = document.querySelector('input[name="aqseq_analysisType"]:checked').value;
            console.log('[AQseq] Submitting with analysisType:', analysisType);

            // 1. Validation
            let isValid = false;
            if (analysisType === 'aqPairedEndRead') isValid = aqseq_checkPairedEndSamples();
            else if (analysisType === 'aqSingleEndRead') isValid = aqseq_checkSingleEndSamples();
            else if (analysisType === 'CleanRead') isValid = aqseq_checkCleanedFastaSamples();

            if (!isValid) return;

            // 2. Prepare Upload Data
            if (analysisType === 'aqPairedEndRead') aqseq_handlePairedEndAnalysis();
            else if (analysisType === 'aqSingleEndRead') aqseq_handleSingleEndAnalysis();
            else if (analysisType === 'CleanRead') aqseq_handleCleanedFastaAnalysis();
        });
    }
});

/**
 * Toggles the UI based on the selected Analysis Type (Paired, Single, or Cleaned).
 */
function aqseq_toggleAnalysisType() {
    const selected = document.querySelector('input[name="aqseq_analysisType"]:checked');
    if (!selected) return;

    const analysisType = selected.value;
    const pairedSec = document.getElementById("aqseq_PairedEnd");
    const singleSec = document.getElementById("aqseq_SingleEnd");
    const cleanSec = document.getElementById("aqseq_CleanedFasta");
    const img = document.getElementById("aqseq_image");
    const imgCont = document.getElementById("aqseq_imageContainer");

    // Hide all sections first
    [pairedSec, singleSec, cleanSec].forEach(el => {
        if(el) { el.style.display = "none"; el.innerHTML = ""; }
    });

    // Hide all add buttons
    if (addAqseq_PairedEndSampleButton) addAqseq_PairedEndSampleButton.style.display = "none";
    if (addAqseq_SingleEndSampleButton) addAqseq_SingleEndSampleButton.style.display = "none";
    if (addAqseq_CleanedFastaSampleButton) addAqseq_CleanedFastaSampleButton.style.display = "none";

    // Show specific section
    if (analysisType === "aqPairedEndRead") {
        aqseq_PairedEnd_sampleCount = 1;
        if (pairedSec) {
            pairedSec.appendChild(aqseq_createPairedEnd_SampleDiv(1));
            pairedSec.style.display = "block";
        }
        if (addAqseq_PairedEndSampleButton) addAqseq_PairedEndSampleButton.style.display = "block";
        if (img) { img.src = "image/miRNA_pipeline_pairedfastq.png"; img.alt = "Paired-End Pipeline"; }

    } else if (analysisType === "aqSingleEndRead") {
        aqseq_SingleEnd_sampleCount = 1;
        if (singleSec) {
            singleSec.appendChild(aqseq_createSingleEnd_SampleDiv(1));
            singleSec.style.display = "block";
        }
        if (addAqseq_SingleEndSampleButton) addAqseq_SingleEndSampleButton.style.display = "block";
        if (img) { img.src = "image/miRNA_pipeline_singlefastq.png"; img.alt = "Single-End Pipeline"; }

    } else if (analysisType === "CleanRead") {
        aqseq_CleanedFasta_sampleCount = 1;
        if (cleanSec) {
            cleanSec.appendChild(aqseq_createCleanedFasta_SampleDiv(1));
            cleanSec.style.display = "block";
        }
        if (addAqseq_CleanedFastaSampleButton) addAqseq_CleanedFastaSampleButton.style.display = "block";
        if (img) { img.src = "image/miRNA_pipeline_cleanfasta.png"; img.alt = "Cleaned FASTA Pipeline"; }
    }

    if (imgCont) imgCont.style.display = "block";

    // Show/hide UMI section based on analysis type
    const umiSection = document.getElementById("aqseq_umiSection");
    if (umiSection) {
        if (analysisType === "CleanRead") {
            umiSection.style.display = "none";
        } else {
            umiSection.style.display = "block";
        }
    }
}

/* ============================================================================
   VALIDATION LOGIC (Uses common_analyzer.js)
   ============================================================================ */

function aqseq_checkPairedEndSamples() {
    const fileNames = new Set();
    const outputNames = new Set();
    
    for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) {
        const file1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`);
        const file2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`);
        const outName = document.getElementById(`aqseq_PairedEnd_outputFileName_${i}`).value;
        const adapter5 = document.getElementById(`aqseq_PairedEnd_fivePrimeAdapter_${i}`).value;
        const adapter3 = document.getElementById(`aqseq_PairedEnd_threePrimeAdapter_${i}`).value;

        if (!aqseq_validateFile(file1, '.fastq.gz', fileNames)) return false;
        if (!aqseq_validateFile(file2, '.fastq.gz', fileNames)) return false;
        
        if (!isValidFileName(outName)) {
            alert(`Output name "${outName}" contains invalid characters.`);
            return false;
        }
        if (outputNames.has(outName)) {
            alert(`Duplicate output name: ${outName}`);
            return false;
        }
        outputNames.add(outName);

        if (adapter5 && !isValidAdapterSequence(adapter5)) { alert(`Invalid 5' Adapter for sample ${i}`); return false; }
        if (adapter3 && !isValidAdapterSequence(adapter3)) { alert(`Invalid 3' Adapter for sample ${i}`); return false; }
    }
    return true;
}

function aqseq_checkSingleEndSamples() {
    const fileNames = new Set();
    const outputNames = new Set();

    for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) {
        const file1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`);
        const outName = document.getElementById(`aqseq_SingleEnd_outputFileName_${i}`).value;
        const adapter3 = document.getElementById(`aqseq_SingleEnd_threePrimeAdapter_${i}`).value;

        if (!aqseq_validateFile(file1, '.fastq.gz', fileNames)) return false;

        if (!isValidFileName(outName)) { alert(`Output name "${outName}" invalid.`); return false; }
        if (outputNames.has(outName)) { alert(`Duplicate output name: ${outName}`); return false; }
        outputNames.add(outName);

        if (adapter3 && !isValidAdapterSequence(adapter3)) { alert(`Invalid 3' Adapter for sample ${i}`); return false; }
    }
    return true;
}

function aqseq_checkCleanedFastaSamples() {
    const fileNames = new Set();
    const outputNames = new Set();

    for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) {
        const file1 = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`);
        const outName = document.getElementById(`aqseq_CleanedFasta_outputFileName_${i}`).value;

        if (!aqseq_validateFile(file1, '.fasta.gz', fileNames)) return false;

        if (!isValidFileName(outName)) { alert(`Output name "${outName}" invalid.`); return false; }
        if (outputNames.has(outName)) { alert(`Duplicate output name: ${outName}`); return false; }
        outputNames.add(outName);
    }
    return true;
}

/**
 * Helper to validate a single file input
 */
function aqseq_validateFile(inputElement, extension, nameSet) {
    if (!inputElement || inputElement.files.length === 0) {
        alert("Please select all required files.");
        return false;
    }
    const file = inputElement.files[0];
    if (!file.name.endsWith(extension)) {
        alert(`File ${file.name} must end with ${extension}`);
        return false;
    }
    if (!isValidFileName(file.name)) {
        alert(`File name ${file.name} contains invalid characters.`);
        return false;
    }
    if (nameSet.has(file.name)) {
        alert(`Duplicate file selected: ${file.name}`);
        return false;
    }
    nameSet.add(file.name);
    return true;
}

/* ============================================================================
   UPLOAD PREPARATION LOGIC
   ============================================================================ */

function aqseq_handlePairedEndAnalysis() {
    const outName = document.getElementById('aqseq_PairedEnd_outputFileName_1').value;
    aqseq_jobID = generateJobID('aqPE', outName); // Use common generator
    aqseq_files = [];
    aqseq_fileNames = [];
    aqseq_progressBars = [];

    // Collect all files
    for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) {
        const f1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`).files[0];
        const f2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`).files[0];
        
        aqseq_files.push(f1);
        aqseq_files.push(f2);
        aqseq_fileNames.push(`Sample${i}_R1`);
        aqseq_fileNames.push(`Sample${i}_R2`);
        
        aqseq_createProgressBarUI(i, '1');
        aqseq_createProgressBarUI(i, '2');
    }
    
    aqseq_startUploadSequence();
}

function aqseq_handleSingleEndAnalysis() {
    const outName = document.getElementById('aqseq_SingleEnd_outputFileName_1').value;
    aqseq_jobID = generateJobID('aqSE', outName);
    aqseq_files = [];
    aqseq_fileNames = [];
    aqseq_progressBars = [];

    for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) {
        const f1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`).files[0];
        aqseq_files.push(f1);
        aqseq_fileNames.push(`Sample${i}_R1`);
        aqseq_createProgressBarUI(i, '1');
    }
    
    aqseq_startUploadSequence();
}

function aqseq_handleCleanedFastaAnalysis() {
    const outName = document.getElementById('aqseq_CleanedFasta_outputFileName_1').value;
    aqseq_jobID = generateJobID('aqCR', outName);
    aqseq_files = [];
    aqseq_fileNames = [];
    aqseq_progressBars = [];

    for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) {
        const f1 = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`).files[0];
        aqseq_files.push(f1);
        aqseq_fileNames.push(`Sample${i}_Fasta`);
        aqseq_createProgressBarUI(i, '1');
    }
    
    aqseq_startUploadSequence();
}

/**
 * Creates the DOM elements for progress bars
 */
function aqseq_createProgressBarUI(sampleIndex, suffix) {
    const container = document.createElement('div');
    container.style = 'width: 50%; background-color: transparent; margin-top: 5px;';
    
    const barOuter = document.createElement('div');
    barOuter.style = 'width: 100%; background-color: #eee; border-radius: 10px; overflow: hidden;';
    
    const barInner = document.createElement('div');
    barInner.id = `aqseq_pb_${sampleIndex}_${suffix}`; // simpler ID
    barInner.style = 'width: 0%; height: 15px; background-color: #76c7c0; transition: width 0.2s;';
    
    const text = document.createElement('p');
    text.id = `aqseq_txt_${sampleIndex}_${suffix}`;
    text.style = 'margin-left: 10px; font-size: 0.9em;';

    barOuter.appendChild(barInner);
    container.appendChild(barOuter);
    
    const wrapper = document.createElement('div');
    wrapper.style = "display: flex; align-items: center;";
    wrapper.appendChild(container);
    wrapper.appendChild(text);

    document.getElementById('aqseqProgressBarsContainer').appendChild(wrapper);

    aqseq_progressBars.push({ bar: barInner, text: text });
}

/* ============================================================================
   UPLOAD EXECUTION (Uses common_analyzer.js)
   ============================================================================ */

/**
 * Iterates through all files and uploads them sequentially using the common utility.
 */
async function aqseq_startUploadSequence() {
    const btn = document.getElementById('aqseq_uploadButton');
    if(btn) btn.style.display = 'none';

    console.log(`[AQseq] Starting upload for ${aqseq_files.length} files. JobID: ${aqseq_jobID}`);

    for (let i = 0; i < aqseq_files.length; i++) {
        const file = aqseq_files[i];
        const ui = aqseq_progressBars[i];

        try {
            await uploadFileChunks(file, aqseq_jobID, (percent) => {
                if(ui) {
                    ui.text.textContent = `Uploading ${aqseq_fileNames[i]}: ${percent}%`;
                    ui.bar.style.width = `${percent}%`;
                }
            });
            // Mark complete in UI
            if(ui) ui.text.textContent = `${aqseq_fileNames[i]} Complete.`;

        } catch (error) {
            console.error(error);
            alert(`Error uploading ${file.name}: ${error.message}`);
            if(btn) btn.style.display = 'block'; // Allow retry
            return;
        }
    }

    // All uploads finished
    console.log("[AQseq] All uploads complete. Triggering execution.");
    aqseq_executeCode();
}

/**
 * Submits the job to PHP/Slurm after successful upload.
 */
function aqseq_executeCode() {
    const analysisType = document.querySelector('input[name="aqseq_analysisType"]:checked').value;
    const formData = new FormData();

    // Re-gather data form fields to send to PHP
    if (analysisType === 'aqPairedEndRead') {
        for (let i = 1; i <= aqseq_PairedEnd_sampleCount; i++) {
            const f1 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`).files[0].name;
            const f2 = document.getElementById(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`).files[0].name;
            const a5 = document.getElementById(`aqseq_PairedEnd_fivePrimeAdapter_${i}`).value || 'GATCGTCGGACTGTAGAACT';
            const a3 = document.getElementById(`aqseq_PairedEnd_threePrimeAdapter_${i}`).value || 'TGGAATTCTCGGGTGCCAAG';
            const out = document.getElementById(`aqseq_PairedEnd_outputFileName_${i}`).value;

            formData.append(`aqseq_PairedEnd_fileToUpload_fastq1_${i}`, f1);
            formData.append(`aqseq_PairedEnd_fileToUpload_fastq2_${i}`, f2);
            formData.append(`aqseq_PairedEnd_fivePrimeAdapter_${i}`, a5);
            formData.append(`aqseq_PairedEnd_threePrimeAdapter_${i}`, a3);
            formData.append(`aqseq_PairedEnd_outputFileName_${i}`, out);
        }
    } else if (analysisType === 'aqSingleEndRead') {
        for (let i = 1; i <= aqseq_SingleEnd_sampleCount; i++) {
            const f1 = document.getElementById(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`).files[0].name;
            const a3 = document.getElementById(`aqseq_SingleEnd_threePrimeAdapter_${i}`).value || 'TGGAATTCTCGGGTGCCAAG';
            const out = document.getElementById(`aqseq_SingleEnd_outputFileName_${i}`).value;

            formData.append(`aqseq_SingleEnd_fileToUpload_fastq1_${i}`, f1);
            formData.append(`aqseq_SingleEnd_threePrimeAdapter_${i}`, a3);
            formData.append(`aqseq_SingleEnd_outputFileName_${i}`, out);
        }
    } else if (analysisType === 'CleanRead') {
        for (let i = 1; i <= aqseq_CleanedFasta_sampleCount; i++) {
            const f1 = document.getElementById(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`).files[0].name;
            const out = document.getElementById(`aqseq_CleanedFasta_outputFileName_${i}`).value;
            
            formData.append(`aqseq_CleanedFasta_fileToUpload_fasta_${i}`, f1);
            formData.append(`aqseq_CleanedFasta_outputFileName_${i}`, out);
        }
    }

    // Common data
    formData.append('jobID', aqseq_jobID);
    formData.append('analysisType', analysisType);
    formData.append('execute', 'true');
    formData.append('aqseq_species', document.getElementById('aqseq_species').value);
    formData.append('aqseq_email', document.getElementById('aqseq_email').value);

    // UMI: force 0 for CleanRead, read from inputs otherwise
    if (analysisType === 'CleanRead') {
        formData.append('umi5', '0');
        formData.append('umi3', '0');
    } else {
        const umi5 = document.getElementById('aqseq_umi5').value || '0';
        const umi3 = document.getElementById('aqseq_umi3').value || '0';
        formData.append('umi5', umi5);
        formData.append('umi3', umi3);
    }

    formData.append('env', CLASH_ENV);

    fetch('./Analyzer_php/aqseq_execute_slurm.php', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    })
    .then(text => {
        console.log('Execute response:', text);
        
        // Update UI to success state
        const formContainer = document.getElementById('aqseq_formContainer');
        const resultContainer = document.getElementById('aqseq_resultContainer');
        const email = document.getElementById('aqseq_email').value;

        if (formContainer) formContainer.style.display = 'none';
        if (resultContainer) {
            resultContainer.style.display = 'block';
            resultContainer.innerHTML = `
                <p>Your files for miRNA-seq analysis have been successfully uploaded.</p>
                <p>Your Job ID is: <span style="color: red;"><strong>${aqseq_jobID}</strong></span></p>
                <p>Your Email is: <span style="color: red;"><strong>${email}</strong></span></p>
                <p>Once processing is finished, an automatic notification email will be sent to you.</p>
                <p>You may also check progress or download results anytime in the <span style="color: orange; font-weight: bold;">Job Status</span> menu.</p>
            `;
        }
    })
    .catch(error => {
        console.error('Error executing code:', error);
        alert("Server execution failed: " + error.message);
    });
}

/* ============================================================================
   SAMPLE MANAGEMENT (Add/Remove)
   ============================================================================ */

function addAqseq_PairedEndSample() {
    if (aqseq_PairedEnd_sampleCount >= 12) { alert('Max 12 samples allowed.'); return; }
    aqseq_PairedEnd_sampleCount++;
    document.getElementById('aqseq_PairedEnd').appendChild(aqseq_createPairedEnd_SampleDiv(aqseq_PairedEnd_sampleCount));
}

function addAqseq_SingleEndSample() {
    if (aqseq_SingleEnd_sampleCount >= 12) { alert('Max 12 samples allowed.'); return; }
    aqseq_SingleEnd_sampleCount++;
    document.getElementById('aqseq_SingleEnd').appendChild(aqseq_createSingleEnd_SampleDiv(aqseq_SingleEnd_sampleCount));
}

function addAqseq_CleanedFastaSample() {
    if (aqseq_CleanedFasta_sampleCount >= 12) { alert('Max 12 samples allowed.'); return; }
    aqseq_CleanedFasta_sampleCount++;
    document.getElementById('aqseq_CleanedFasta').appendChild(aqseq_createCleanedFasta_SampleDiv(aqseq_CleanedFasta_sampleCount));
}

function aqseq_removeSample(group, sampleIndex) {
    const el = document.getElementById(`${group}_sample_${sampleIndex}`);
    if (el) el.remove();

    if (group === 'Paired_Analysis') {
        aqseq_PairedEnd_sampleCount--;
        if (aqseq_PairedEnd_sampleCount < 1) aqseq_PairedEnd_sampleCount = 1; // safety
    } else if (group === 'Single_Analysis') {
        aqseq_SingleEnd_sampleCount--;
    } else if (group === 'Clean_Analysis') {
        aqseq_CleanedFasta_sampleCount--;
    }
    aqseq_updateSamples(group);
}

function aqseq_updateSamples(group) {
    // Re-index all samples in the group to ensure sequential IDs
    const samples = document.querySelectorAll(`.${group}_sample`);
    samples.forEach((sample, index) => {
        const newIndex = index + 1;
        sample.id = `${group}_sample_${newIndex}`;
        
        // Update Title
        const title = sample.querySelector('h4');
        if(title) {
            if (group === 'Paired_Analysis') title.textContent = `Paired-End Sample ${newIndex}`;
            if (group === 'Single_Analysis') title.textContent = `Single-End Sample ${newIndex}`;
            if (group === 'Clean_Analysis') title.textContent = `Cleaned FASTA Sample ${newIndex}`;
        }

        // Update Remove Button
        const btn = sample.querySelector('button[class*="remove"]');
        if(btn) btn.setAttribute('onclick', `aqseq_removeSample('${group}', ${newIndex})`);

        // Update Inputs
        const inputs = sample.querySelectorAll('input, label');
        inputs.forEach(el => {
            ['name', 'id', 'for'].forEach(attr => {
                const val = el.getAttribute(attr);
                if (val) el.setAttribute(attr, val.replace(/_\d+$/, `_${newIndex}`));
            });
        });
    });
}


/* ============================================================================
   HTML GENERATORS
   ============================================================================ */

function aqseq_createPairedEnd_SampleDiv(index) {
    const div = document.createElement('div');
    div.classList.add('aqseq_sample', 'Paired_Analysis_sample');
    div.id = `Paired_Analysis_sample_${index}`;
    
    // Template download logic for first sample
    const templateHTML = index === 1 ? `
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download these two FASTQ files to test the analysis (Optional):</p>
            <a href="Samples/Sample_miRNAseq_R1.fastq.gz" download>Sample miRNAseq FASTQ 1</a> |
            <a href="Samples/Sample_miRNAseq_R2.fastq.gz" download>Sample miRNAseq FASTQ 2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
        </div>` : '';

    const removeBtn = index > 1 ? 
        `<button type="button" class="removePairedEndSampleButton" onclick="aqseq_removeSample('Paired_Analysis', ${index})">-</button>` : '';

    div.innerHTML = `
        ${templateHTML}
        <h4>Paired-End Sample ${index}</h4>
        <section> 
            <label>Choose <strong>Read 1 (R1)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="btn_pe_r1_${index}">Select File</button>
                <span id="txt_pe_r1_${index}">No file selected</span>
                <input type="file" id="aqseq_PairedEnd_fileToUpload_fastq1_${index}" name="aqseq_PairedEnd_fileToUpload_fastq1_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label>Choose <strong>Read 2 (R2)</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="btn_pe_r2_${index}">Select File</button>
                <span id="txt_pe_r2_${index}">No file selected</span>
                <input type="file" id="aqseq_PairedEnd_fileToUpload_fastq2_${index}" name="aqseq_PairedEnd_fileToUpload_fastq2_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
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
        ${removeBtn}
    `;

    // Bind custom file buttons
    aqseq_bindFileButton(div, `btn_pe_r1_${index}`, `aqseq_PairedEnd_fileToUpload_fastq1_${index}`, `txt_pe_r1_${index}`);
    aqseq_bindFileButton(div, `btn_pe_r2_${index}`, `aqseq_PairedEnd_fileToUpload_fastq2_${index}`, `txt_pe_r2_${index}`);

    return div;
}

function aqseq_createSingleEnd_SampleDiv(index) {
    const div = document.createElement('div');
    div.classList.add('aqseq_sample', 'Single_Analysis_sample');
    div.id = `Single_Analysis_sample_${index}`;

    const templateHTML = index === 1 ? `
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download this FASTQ file to test the analysis (Optional):</p>
            <a href="Samples/Sample_miRNAseq_R1.fastq.gz" download>Sample miRNAseq FASTQ</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
        </div>` : '';

    const removeBtn = index > 1 ? 
        `<button type="button" class="removeSingleEndSampleButton" onclick="aqseq_removeSample('Single_Analysis', ${index})">-</button>` : '';

    div.innerHTML = `
        ${templateHTML}
        <h4>Single-End Sample ${index}</h4> 
        <section> 
            <label>Choose <strong>Single-End FASTQ</strong> file (.fastq.gz):</label>
            <div class="custom-file-input">
                <button type="button" id="btn_se_r1_${index}">Select File</button>
                <span id="txt_se_r1_${index}">No file selected</span>
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
        ${removeBtn}
    `;

    aqseq_bindFileButton(div, `btn_se_r1_${index}`, `aqseq_SingleEnd_fileToUpload_fastq1_${index}`, `txt_se_r1_${index}`);
    return div;
}

function aqseq_createCleanedFasta_SampleDiv(index) {
    const div = document.createElement('div');
    div.classList.add('aqseq_sample', 'Clean_Analysis_sample');
    div.id = `Clean_Analysis_sample_${index}`;

    const templateHTML = index === 1 ? `
        <div class="template-download">
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download this FASTA file to test the analysis (Optional):</p>
            <a href="Samples/Sample_miRNAseq.fasta.gz" download>Sample miRNAseq FASTA</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
        </div>` : '';

    const removeBtn = index > 1 ? 
        `<button type="button" class="removeCleanedFastaSampleButton" onclick="aqseq_removeSample('Clean_Analysis', ${index})">-</button>` : '';

    div.innerHTML = `
        ${templateHTML}
        <h4>Cleaned FASTA Sample ${index}</h4>
        <section> 
            <label>Choose .fasta.gz file:</label>
            <div class="custom-file-input">
                <button type="button" id="btn_cf_r1_${index}">Select File</button>
                <span id="txt_cf_r1_${index}">No file selected</span>
                <input type="file" id="aqseq_CleanedFasta_fileToUpload_fasta_${index}" name="aqseq_CleanedFasta_fileToUpload_fasta_${index}" required accept=".gz" style="display: none;">
            </div>
        </section> 
        <section> 
            <label for="aqseq_CleanedFasta_outputFileName_${index}">Output file name (without extension):</label> 
            <input type="text" id="aqseq_CleanedFasta_outputFileName_${index}" name="aqseq_CleanedFasta_outputFileName_${index}" class="uniform-width" required placeholder="CleanedFasta_Sample${index}"> 
        </section> 
        ${removeBtn}
    `;

    aqseq_bindFileButton(div, `btn_cf_r1_${index}`, `aqseq_CleanedFasta_fileToUpload_fasta_${index}`, `txt_cf_r1_${index}`);
    return div;
}

/**
 * Helper to bind custom button click to hidden file input
 */
function aqseq_bindFileButton(parent, btnId, inputId, textId) {
    const btn = parent.querySelector(`#${btnId}`);
    const input = parent.querySelector(`#${inputId}`);
    const text = parent.querySelector(`#${textId}`);

    if (btn && input) {
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            text.textContent = input.files[0] ? input.files[0].name : 'No file selected';
        });
    }
}