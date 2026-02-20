/**
 * ============================================================================
 * hyb.js - CLASH (Hybrid) Analysis Module
 * Handles UI, validation, and file uploads for CLASH (FASTQ/FASTA) pipelines.
 * Dependencies: common_analyzer.js
 * ============================================================================
 */

// Global State
let hyb_jobID = null;
const HYB_EXECUTE_URL = './Analyzer_php/hyb_execute_slurm.php';

/**
 * Initialization function called by Analyzer_main.js when switching to this tab.
 */
function hyb_initializeForm() {
    console.log("[HYB] Initializing form...");
    
    const formContainer = document.getElementById('hyb_formContainer');
    const resultContainer = document.getElementById('hyb_resultContainer');
    const form = document.getElementById('hyb_uploadForm');

    // 1. Reset Visibility
    if (formContainer) formContainer.style.display = 'block';
    if (resultContainer) {
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
    }

    // 2. Reset Form & Inputs
    if (form) form.reset();

    // 3. Reset Custom File Displays
    ['fileNameDisplay_hyb_fastq1', 'fileNameDisplay_hyb_fastq2', 'fileNameDisplay_hyb_fasta'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'No file selected';
    });

    // 4. Reset Progress Bars
    resetHybProgressBar('1');
    resetHybProgressBar('2');

    // 5. Reset Logic State
    hyb_jobID = null;

    // 6. Reset UMI fields
    const umi5 = document.getElementById('hyb_umi5');
    if (umi5) umi5.value = '';
    const umi3 = document.getElementById('hyb_umi3');
    if (umi3) umi3.value = '';
    
    // 7. Restore Default View (FASTQ)
    const radioFastq = document.querySelector('input[name="hyb_uploadType"][value="fastq"]');
    if (radioFastq) radioFastq.checked = true;
    hyb_toggleUploadType();

    // 8. Ensure Submit Button is Visible
    const btn = document.getElementById('hyb_uploadButton');
    if (btn) btn.style.display = 'block';
}

/**
 * Helper to reset a specific progress bar
 */
function resetHybProgressBar(suffix) {
    const bar = document.getElementById(`hyb_progressBar${suffix}`);
    const txt = document.getElementById(`hyb_progressText${suffix}`);
    const container = document.getElementById(`hyb_progressContainer${suffix}`);
    
    if (bar) bar.style.width = '0%';
    if (txt) txt.textContent = '';
    // We don't hide the container here to avoid layout shifts, 
    // but you can hide it if preferred.
}

// ============================================================================
// DOM Ready & Event Listeners
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
    
    // 1. Initialize Toggle State
    hyb_toggleUploadType();

    // 2. Bind Custom File Inputs (Link Button -> Hidden Input -> Span Display)
    setupCustomFileInput('hyb_fileToUpload_fastq1', 'customButton_fastq1', 'fileNameDisplay_hyb_fastq1');
    setupCustomFileInput('hyb_fileToUpload_fastq2', 'customButton_fastq2', 'fileNameDisplay_hyb_fastq2');
    setupCustomFileInput('hyb_fileToUpload_fasta', 'customButton_fasta', 'fileNameDisplay_hyb_fasta');

    // 3. Bind Submit Handler
    const form = document.getElementById('hyb_uploadForm');
    if (form) {
        form.addEventListener('submit', handleHybSubmission);
    }
});

/**
 * Sets up a custom file input button.
 */
function setupCustomFileInput(inputId, btnId, displayId) {
    const input = document.getElementById(inputId);
    
    // Create wrapper/button only if they don't exist (idempotent check)
    // Note: The HTML structure might already have these if static. 
    // If dynamically creating them like previous code:
    if (!input) return;

    // Check if we need to create the UI wrapper (Legacy support)
    // If your HTML already has the button/span structure, we just bind events.
    // If not, we insert it. Assuming HTML structure exists based on Analyzer.html provided previously.
    
    // However, the provided Analyzer.html DOES NOT have buttons for HYB, only inputs.
    // So we inject the UI elements here, similar to the original code.
    if (!input.parentNode.classList.contains('custom-file-input')) {
        const container = document.createElement('div');
        container.classList.add('custom-file-input');

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Select File';
        btn.className = 'custom-button'; // Add specific class if needed

        const display = document.createElement('span');
        display.id = displayId;
        display.textContent = 'No file selected';
        display.style.marginLeft = "10px";

        input.parentNode.insertBefore(container, input);
        container.appendChild(btn);
        container.appendChild(display);
        container.appendChild(input); // Move input inside
        input.style.display = 'none'; // Hide original

        btn.addEventListener('click', () => input.click());
    }

    // Bind Change Event
    input.addEventListener('change', function() {
        const file = this.files[0];
        const display = document.getElementById(displayId);
        
        if (file) {
            if (!isValidFileName(file.name)) {
                alert('Invalid file name. Only letters, numbers, underscores, hyphens, and periods allowed.');
                this.value = '';
                if(display) display.textContent = 'No file selected';
            } else {
                if(display) display.textContent = file.name;
            }
        } else {
            if(display) display.textContent = 'No file selected';
        }
    });
}


// ============================================================================
// Core Logic: Submission & Upload
// ============================================================================

/**
 * Main Async Handler for Form Submission
 */
async function handleHybSubmission(event) {
    event.preventDefault();
    
    const uploadType = document.querySelector('input[name="hyb_uploadType"]:checked').value;
    const outputFileName = document.getElementById('hyb_outputFileName').value;

    // 1. Validate Output Name
    if (!isValidFileName(outputFileName)) {
        alert('Invalid output file name.');
        return;
    }

    // 2. Validate Inputs & Gather Files
    const filesToUpload = []; // Array of { file: File, suffix: '1' or '2' }
    
    if (uploadType === 'fasta') {
        const input = document.getElementById('hyb_fileToUpload_fasta');
        if (!input.files.length) { alert('Please select a FASTA file.'); return; }
        
        const file = input.files[0];
        if (!file.name.endsWith('.fasta.gz')) { alert('File must be .fasta.gz'); return; }
        
        filesToUpload.push({ file: file, suffix: '1' }); // Reuse progress bar 1

    } else {
        const input1 = document.getElementById('hyb_fileToUpload_fastq1');
        const input2 = document.getElementById('hyb_fileToUpload_fastq2');
        
        if (!input1.files.length || !input2.files.length) { alert('Please select both FASTQ files.'); return; }
        
        const f1 = input1.files[0];
        const f2 = input2.files[0];

        if (!f1.name.endsWith('.fastq.gz') || !f2.name.endsWith('.fastq.gz')) { alert('Files must be .fastq.gz'); return; }
        
        filesToUpload.push({ file: f1, suffix: '1' });
        filesToUpload.push({ file: f2, suffix: '2' });
    }

    // 3. Generate Job ID (Using common_analyzer.js)
    const prefix = (uploadType === 'fasta') ? 'CLA' : 'CLQ';
    hyb_jobID = generateJobID(prefix, outputFileName);
    console.log(`[HYB] Job ID generated: ${hyb_jobID}`);

    // 4. Start Uploads
    const submitBtn = document.getElementById('hyb_uploadButton');
    submitBtn.style.display = 'none';

    try {
        // Sequentially upload files
        for (const item of filesToUpload) {
            await uploadFileChunks(item.file, hyb_jobID, (percent) => {
                // Update UI
                const bar = document.getElementById(`hyb_progressBar${item.suffix}`);
                const txt = document.getElementById(`hyb_progressText${item.suffix}`);
                if (bar) bar.style.width = `${percent}%`;
                if (txt) txt.textContent = `Uploading: ${percent}%`;
            });
            // Mark complete text
            document.getElementById(`hyb_progressText${item.suffix}`).textContent = "Upload Complete";
        }

        // 5. Execute PHP Script
        executeHybAnalysis(uploadType);

    } catch (error) {
        console.error("[HYB] Upload error:", error);
        alert("Upload failed: " + error.message);
        submitBtn.style.display = 'block'; // Restore button
    }
}

/**
 * Sends execution command to server
 */
function executeHybAnalysis(uploadType) {
    const formData = new FormData();
    
    // File Names
    if (uploadType === 'fasta') {
        formData.append('hyb_fileToUpload_fasta', document.getElementById('hyb_fileToUpload_fasta').files[0].name);
        // Force UMI to 0 for fasta (already cleaned)
        formData.append('hyb_umi5', '0');
        formData.append('hyb_umi3', '0');
    } else {
        formData.append('hyb_fileToUpload_fastq1', document.getElementById('hyb_fileToUpload_fastq1').files[0].name);
        formData.append('hyb_fileToUpload_fastq2', document.getElementById('hyb_fileToUpload_fastq2').files[0].name);
        
        // Adapters (Only needed for FASTQ)
        const def5 = 'GATCGTCGGACTGTAGAACT';
        const def3 = 'TGGAATTCTCGGGTGCCAAG';
        formData.append('hyb_fivePrimeAdapter', document.getElementById('hyb_fivePrimeAdapter').value || def5);
        formData.append('hyb_threePrimeAdapter', document.getElementById('hyb_threePrimeAdapter').value || def3);

        // UMI lengths (Only for FASTQ)
        formData.append('hyb_umi5', document.getElementById('hyb_umi5').value || '0');
        formData.append('hyb_umi3', document.getElementById('hyb_umi3').value || '0');
    }

    // Common Data
    formData.append('hyb_outputFileName', document.getElementById('hyb_outputFileName').value);
    formData.append('hyb_species', document.getElementById('hyb_species').value);
    formData.append('hyb_email', document.getElementById('hyb_email').value);
    
    formData.append('jobID', hyb_jobID);
    formData.append('uploadType', uploadType);
    formData.append('execute', 'true');
    formData.append('env', CLASH_ENV);

    fetch(HYB_EXECUTE_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok.');
        return response.text();
    })
    .then(text => {
        console.log('[HYB] Execution Response:', text);
        displayHybSuccess();
    })
    .catch(error => {
        console.error('[HYB] Execution Error:', error);
        alert("Execution failed: " + error.message);
        document.getElementById('hyb_uploadButton').style.display = 'block';
    });
}

/**
 * Updates UI to success state and triggers status check
 */
function displayHybSuccess() {
    const formContainer = document.getElementById('hyb_formContainer');
    const resultContainer = document.getElementById('hyb_resultContainer');
    const email = document.getElementById('hyb_email').value;

    if (formContainer) formContainer.style.display = 'none';
    
    if (resultContainer) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <p>Your file has been successfully uploaded.</p>
            <p>Your Job ID is: <span style="color: red;"><strong>${hyb_jobID}</strong></span></p>
            <p>Your Email is: <span style="color: red;"><strong>${email}</strong></span></p>
            <div id="hyb_queueInfo">Fetching queue status...</div>
            <p>Once processing is finished, an automatic notification email will be sent to you.</p>
            <p>You may also check progress or download results anytime in the <span style="color: orange; font-weight: bold;">Job Status</span> menu.</p>
            <p>Completed jobs remain available for download for 7 days.</p>
            <p><em>As a general reference:</em> analyzing a pair of fastq.gz files totaling 1GB typically takes about 3 hours.</p>
        `;
    }

    // Check Queue Status
    fetch(`../Analyzer_php/slurm_status.php?jobname=${hyb_jobID}&env=${CLASH_ENV}`)
        .then(res => res.json())
        .then(data => {
            let msg = '';
            if (data.your_status === 'queued') {
                const position = data.all_jobs.filter(j => j.status === 'queued').findIndex(j => j.name === hyb_jobID) + 1;
                msg = `Your job is number <strong>${position}</strong> in the queue.`;
            } else if (data.your_status === 'running') {
                msg = `Job <strong>${hyb_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
                msg = `Job status: ${data.your_status}.`;
            }
            const el = document.getElementById('hyb_queueInfo');
            if(el) el.innerHTML = msg;
        })
        .catch(err => console.error("Queue check failed:", err));
}


// ============================================================================
// UI Toggle Logic
// ============================================================================

function hyb_toggleUploadType() {
    const uploadType = document.querySelector('input[name="hyb_uploadType"]:checked').value;
    const fastaSec = document.getElementById('hyb_fastaUpload');
    const fastqSec = document.getElementById('hyb_fastqUpload');
    const img = document.getElementById('hyb_image');

    // Remove existing sample download links to prevent duplicates
    const oldLinks = document.querySelectorAll('.hyb-sample-link');
    oldLinks.forEach(el => el.remove());

    if (uploadType === 'fasta') {
        fastaSec.style.display = 'block';
        fastqSec.style.display = 'none';
        
        // Update required attributes
        setRequired('hyb_fileToUpload_fasta', true);
        setRequired('hyb_fileToUpload_fastq1', false);
        setRequired('hyb_fileToUpload_fastq2', false);

        // Inject Sample Download
        insertSampleLink(fastaSec, `
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download this FASTA file to test the analysis (Optional):</p>
            <a href="Samples/Sample_CLASH.fasta.gz" download>Sample CLASH FASTA</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
        `);

        if(img) {
            img.src = 'image/CLASH_pipeline_fasta.png';
            img.alt = 'CLASH FASTA Pipeline';
        }

    } else {
        fastaSec.style.display = 'none';
        fastqSec.style.display = 'block';

        setRequired('hyb_fileToUpload_fasta', false);
        setRequired('hyb_fileToUpload_fastq1', true);
        setRequired('hyb_fileToUpload_fastq2', true);

        // Inject Sample Download (FASTQ)
        insertSampleLink(fastqSec, `
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            <p>You may download these FASTQ files to test the analysis (Optional):</p>
            <a href="Samples/Sample_CLASH_R1.fastq.gz" download>Sample CLASH FASTQ 1</a> | 
            <a href="Samples/Sample_CLASH_R2.fastq.gz" download>Sample CLASH FASTQ 2</a>
            <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
        `);

        if(img) {
            img.src = 'image/CLASH_pipeline_fastq.png';
            img.alt = 'CLASH FASTQ Pipeline';
        }
    }
}

function setRequired(id, isRequired) {
    const el = document.getElementById(id);
    if (el) el.required = isRequired;
}

function insertSampleLink(parent, html) {
    const div = document.createElement('div');
    div.className = 'template-download hyb-sample-link'; // Add marker class
    div.innerHTML = html;
    parent.insertBefore(div, parent.firstChild);
}