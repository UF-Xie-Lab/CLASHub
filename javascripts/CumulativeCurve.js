/**
 * ============================================================================
 * CumulativeCurve.js
 * Handles the logic for the "Cumulative Fraction Curve" analysis tool.
 * Dependencies: common_analyzer.js, jQuery, jQuery UI
 * ============================================================================
 */

// Global variables
let cumulativeCurve_jobID = null;
const CUMULATIVE_EXECUTE_URL = './Analyzer_php/CumulativeCurve_execute_slurm.php';

/**
 * Initialization function called by Analyzer_main.js when switching to this tab.
 * Resets the form and UI elements to their default state.
 */
function initializeCumulativeCurve() {
    console.log("[CumulativeCurve] Initializing form...");

    const formContainer = document.getElementById('CumulativeCurve_formContainer');
    const resultContainer = document.getElementById('CumulativeCurve_resultContainer');
    const form = document.getElementById('CumulativeCurveUploadForm');
    
    // 1. Reset Visibility
    if (formContainer) formContainer.style.display = 'block';
    if (resultContainer) {
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
    }
    
    // 2. Reset Form Inputs
    if (form) form.reset();
    
    // 3. Reset Advanced Options (Default: unchecked, enabled, no warning)
    const advCheckbox = document.getElementById('CumulativeCurve_performAdvanced');
    const advWarning = document.getElementById('CumulativeCurve_advancedWarning');
    if (advCheckbox) {
        advCheckbox.checked = false;
        advCheckbox.disabled = false;
    }
    if (advWarning) {
        advWarning.style.display = 'none';
    }
    
    // 4. Reset Progress Bar
    const progressBar = document.getElementById("CumulativeCurve_progressBar1");
    const progressText = document.getElementById("CumulativeCurve_progressText1");
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '';
    
    // 5. Reset File Name Display
    const fileDisplay = document.getElementById('CumulativeCurve_fileNameDisplay');
    if (fileDisplay) fileDisplay.textContent = 'No file selected';

    // 6. Reset Button State
    const btn = document.getElementById('CumulativeCurve_uploadButton');
    if (btn) {
        btn.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Submit Request';
    }
}


// ============================================================================
// Main Event Listeners (jQuery Ready)
// ============================================================================
$(document).ready(function() {
    
    // 1. Insert Sample Download Link (Dynamic Insertion)
    // ------------------------------------------------------------------------
    const form = document.getElementById('CumulativeCurveUploadForm');
    if (form && !document.getElementById('cumulative_sample_dl')) {
        const fileInput = document.getElementById('CumulativeCurve_fileToUpload');
        if(fileInput) {
            const fileSection = fileInput.closest('section');
            const sampleDiv = document.createElement('div');
            sampleDiv.id = 'cumulative_sample_dl';
            sampleDiv.classList.add('template-download');
            sampleDiv.innerHTML = `
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
                <p>You may download this sample CSV file to test the analysis (Optional):</p>
                <a href="Samples/Sample_CumulativeFractionCurve_Deseq2_Drosophila.csv" download>Sample Cumulative Fraction Curve CSV (Drosophila)</a>
                <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 500px;">
            `;
            // Insert after file input section
            if (fileSection && fileSection.parentNode) {
                fileSection.parentNode.insertBefore(sampleDiv, fileSection.nextSibling);
            }
        }
    }

    // 2. Custom File Input Button Logic
    // ------------------------------------------------------------------------
    $('#customButton_CumulativeCurve_file').on('click', function() {
        $('#CumulativeCurve_fileToUpload').click();
    });

    $('#CumulativeCurve_fileToUpload').on('change', function() {
        const file = this.files[0];
        const display = $('#CumulativeCurve_fileNameDisplay');
        if (file) {
            // Validate file name using common_analyzer.js
            if (!isValidFileName(file.name)) {
                alert("File name contains invalid characters. Please rename it.");
                this.value = ''; // Reset input
                display.text('No file selected');
            } else {
                display.text('Selected: ' + file.name);
            }
        } else {
            display.text('No file selected');
        }
    });

    // 3. Species Change Logic (Handle C. elegans restrictions)
    // ------------------------------------------------------------------------
    $('#CumulativeCurve_species').on('change', function() {
        const selectedSpecies = $(this).val();
        
        // Clear miRNA input on species change to prevent mismatch
        $('#CumulativeCurve_mirnaName').val(''); 

        const advCheckbox = document.getElementById('CumulativeCurve_performAdvanced');
        const advWarning = document.getElementById('CumulativeCurve_advancedWarning');

        if (selectedSpecies === 'C.elegans') {
            // C. elegans: Disable "Advanced" (Context++ scores not available)
            if (advCheckbox) {
                advCheckbox.checked = false;
                advCheckbox.disabled = true;
            }
            if (advWarning) advWarning.style.display = 'block';
        } else {
            // Others: Enable "Advanced"
            if (advCheckbox) advCheckbox.disabled = false;
            if (advWarning) advWarning.style.display = 'none';
        }
    });

    // 4. jQuery UI Autocomplete for miRNA Names
    // ------------------------------------------------------------------------
    $('#CumulativeCurve_mirnaName').autocomplete({
        source: function(request, response) {
            const currentSpecies = $('#CumulativeCurve_species').val();
            
            if (!currentSpecies) {
                alert('Please select a species first.');
                return;
            }

            $.ajax({
                url: CUMULATIVE_EXECUTE_URL,
                dataType: 'json',
                data: {
                    term: request.term,
                    species: currentSpecies,
                    autocomplete: true,
                    env: CLASH_ENV // Use global env from common_analyzer.js
                },
                success: function(data) {
                    if (data.error) {
                        console.error('Autocomplete error:', data.error);
                        response([]);
                    } else {
                        response(data);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Error fetching autocomplete data:', error);
                    response([]);
                }
            });
        },
        minLength: 2
    });

    // 5. Submit Button Click Handler
    // ------------------------------------------------------------------------
    $('#CumulativeCurve_uploadButton').on('click', function(e) {
        e.preventDefault();
        handleCumulativeCurveSubmission();
    });
});


// ============================================================================
// Core Logic: Validation, Upload, and Execution
// ============================================================================

/**
 * Orchestrates the submission process:
 * 1. Validates Form inputs.
 * 2. Validates miRNA name via server (Async).
 * 3. Generates Job ID.
 * 4. Uploads file in chunks (Async).
 * 5. Executes the analysis script.
 */
async function handleCumulativeCurveSubmission() {
    // 1. Gather Input Values
    const fileInput = document.getElementById('CumulativeCurve_fileToUpload');
    const file = fileInput.files[0];
    const species = document.getElementById('CumulativeCurve_species').value;
    const mirnaName = document.getElementById('CumulativeCurve_mirnaName').value.trim();
    const baseMean = document.getElementById('CumulativeCurve_BaseMean').value;
    const outputFileName = document.getElementById('CumulativeCurve_outputFileName').value;
    const email = document.getElementById('CumulativeCurve_email').value;

    // 2. Basic Validation
    if (!file || species === "" || !mirnaName || !baseMean || !outputFileName || !email) {
        alert('Please fill out all required fields.');
        return;
    }
    
    if (!isValidFileName(outputFileName)) {
        alert("Output file name contains invalid characters.");
        return;
    }

    const submitBtn = document.getElementById('CumulativeCurve_uploadButton');
    
    try {
        // 3. Server-side Validation of miRNA Name
        // We call the PHP script to check if the miRNA name exists in the database
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Validating...";
        submitBtn.disabled = true;

        const validateUrl = `${CUMULATIVE_EXECUTE_URL}?validate_mirna_name=${encodeURIComponent(mirnaName)}&species=${encodeURIComponent(species)}&env=${CLASH_ENV}`;
        const response = await fetch(validateUrl);
        const data = await response.json();

        if (data.valid !== true) {
            alert(`Error: The miRNA name "${mirnaName}" is invalid for ${species}.\nPlease select an exact name from the dropdown list.`);
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            return;
        }

        // 4. Generate Job ID (Using common_analyzer.js)
        cumulativeCurve_jobID = generateJobID('CUR', outputFileName);
        console.log(`[CumulativeCurve] Job ID generated: ${cumulativeCurve_jobID}`);

        // 5. Start Upload (Using common_analyzer.js)
        submitBtn.innerText = "Uploading...";
        
        await uploadFileChunks(file, cumulativeCurve_jobID, (percent) => {
            // Update UI progress bar
            document.getElementById("CumulativeCurve_progressText1").textContent = 'Uploading: ' + percent + '%';
            document.getElementById("CumulativeCurve_progressBar1").style.width = percent + '%';
        });

        // 6. Execute Analysis
        document.getElementById("CumulativeCurve_progressText1").textContent = 'Upload complete. Processing...';
        submitBtn.style.display = 'none'; // Hide button to prevent double submit
        
        executeCumulativeCurveAnalysis();

    } catch (error) {
        console.error("Submission error:", error);
        alert("An error occurred: " + error.message);
        
        // Reset button state on error
        submitBtn.innerText = "Submit Request";
        submitBtn.disabled = false;
    }
}

/**
 * Sends the final execution command to the server after successful upload.
 */
function executeCumulativeCurveAnalysis() {
    const formData = new FormData();
    
    // Collect Data
    const file = document.getElementById('CumulativeCurve_fileToUpload').files[0];
    const isAdvanced = document.getElementById('CumulativeCurve_performAdvanced').checked ? 'yes' : 'no';
    
    formData.append('execute', 'true');
    formData.append('CumulativeCurve_fileToUpload', file.name); // PHP expects filename
    formData.append('CumulativeCurve_species', document.getElementById('CumulativeCurve_species').value);
    formData.append('CumulativeCurve_mirnaName', document.getElementById('CumulativeCurve_mirnaName').value);
    formData.append('CumulativeCurve_BaseMean', document.getElementById('CumulativeCurve_BaseMean').value);
    formData.append('CumulativeCurve_outputFileName', document.getElementById('CumulativeCurve_outputFileName').value);
    formData.append('CumulativeCurve_email', document.getElementById('CumulativeCurve_email').value);
    formData.append('CumulativeCurve_performAdvanced', isAdvanced);
    
    // Shared parameters
    formData.append('jobID', cumulativeCurve_jobID);
    formData.append('env', CLASH_ENV);

    fetch(CUMULATIVE_EXECUTE_URL, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Success: Update UI
        console.log('Execution started:', data.message);
        displaySuccessMessage();
    })
    .catch(error => {
        console.error('Execute error:', error);
        alert('Error executing code: ' + error.message);
        // Restore button if execution failed immediately
        const btn = document.getElementById('CumulativeCurve_uploadButton');
        if(btn) {
            btn.style.display = 'block';
            btn.textContent = 'Submit Request';
            btn.disabled = false;
        }
    });
}

/**
 * Updates the UI to show the success message and status check info.
 */
function displaySuccessMessage() {
    const formContainer = document.getElementById('CumulativeCurve_formContainer');
    const resultContainer = document.getElementById('CumulativeCurve_resultContainer');
    const email = document.getElementById('CumulativeCurve_email').value;

    if (formContainer) formContainer.style.display = 'none';
    if (resultContainer) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <p>Your file has been successfully uploaded.</p>
            <p>Your Job ID is: <span style="color: red;"><strong>${cumulativeCurve_jobID}</strong></span></p>
            <p>Your Email is: <span style="color: red;"><strong>${email}</strong></span></p>
            <div id="cumulative_queueInfo">Fetching queue status...</div>
            <p>Once processing is finished, an automatic notification email will be sent to you.</p>
            <p>You may also check progress or download results anytime in the <span style="color: orange; font-weight: bold;">Job Status</span> menu.</p>
            <p>Completed jobs remain available for download for 7 days.</p>
        `;
    }

    // Immediate Queue Check
    fetch(`./Analyzer_php/slurm_status.php?jobname=${cumulativeCurve_jobID}&env=${CLASH_ENV}`)
        .then(res => res.json())
        .then(data => {
            let msg = '';
            if (data.your_status === 'queued') {
                msg = `Your job is currently <strong>queued</strong>.`;
            } else if (data.your_status === 'running') {
                msg = `Job <strong>${cumulativeCurve_jobID}</strong> is now <span style="color:green;">running</span>.`;
            } else {
                msg = `Job status: ${data.your_status}.`;
            }
            const el = document.getElementById('cumulative_queueInfo');
            if(el) el.innerHTML = msg;
        })
        .catch(err => console.error("Queue check failed:", err));
}