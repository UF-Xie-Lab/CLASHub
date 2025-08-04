$(document).ready(function() {
    const uploadUrl = './Analyzer_php/upload_chunk.php';
    const executeUrl = './Analyzer_php/CumulativeCurve_execute_slurm.php'; // Combined PHP script for execution and autocomplete
    let cumulativeCurve_jobID;

    // **Insert sample download link into the form**
    var cumulativeCurveForm = document.getElementById('CumulativeCurveUploadForm');

    // Create the sample download div
    var sampleDownloadDiv = document.createElement('div');
    sampleDownloadDiv.classList.add('template-download');
    sampleDownloadDiv.innerHTML = `
        <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
        <p>You may download this sample CSV file to test the analysis, but it's optional:</p>
        <a href="Samples/Sample_CumulativeFractionCurve_Deseq2_Drosophila.csv" download>Sample Cumulative Fraction Curve CSV (Drosophila)</a>
        <hr style="border-top: 1px dashed #ccc; margin: 15px 0; width: 610px;">
    `;

    // Find the section containing the file input
    var fileInput = document.getElementById('CumulativeCurve_fileToUpload');
    var fileSection = fileInput.closest('section');
    // Insert the sample download div after the file selection section
    cumulativeCurveForm.insertBefore(sampleDownloadDiv, fileSection.nextSibling);

    // **Define the autocomplete functionality using jQuery UI**

    let selectedSpecies = '';

    // Update selectedSpecies when species changes
    $('#CumulativeCurve_species').on('change', function() {
        selectedSpecies = $(this).val();
        $('#CumulativeCurve_mirnaName').val(''); // Clear miRNA name input
    });

    // Initialize Autocomplete for miRNA name input
    $('#CumulativeCurve_mirnaName').autocomplete({
        source: function(request, response) {
            if (!selectedSpecies) {
                alert('Please select a species first.');
                return;
            }
            $.ajax({
                url: executeUrl,
                dataType: 'json',
                data: {
                    term: request.term,
                    species: selectedSpecies,
                    autocomplete: true
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
        minLength: 2,
        select: function(event, ui) {
            // Optional: Do something when a suggestion is selected
            console.log('Selected miRNA:', ui.item.value);
        }
    });

    // **File upload functionality remains unchanged**

    // Function to upload file in chunks
    function CumulativeCurve_uploadChunk() {
        const fileInput = document.getElementById('CumulativeCurve_fileToUpload');
        const file = fileInput.files[0];
        if (!file) {
            alert('Please select a file to upload.');
            return;
        }

        const chunkSize = 2 * 1024 * 1024; // 2 MB
        let offset = 0;
        const totalSize = file.size;
        const fileName = file.name;
        const submitButton = document.getElementById('CumulativeCurve_uploadButton');

        function uploadChunk() {
            if (offset >= totalSize) {
                console.log('Upload complete');
                document.getElementById("CumulativeCurve_progressText1").textContent = 'Upload complete!';
                submitButton.style.display = 'none'; // Hide the submit button
                CumulativeCurve_executeCode();
                return;
            }
            const chunk = file.slice(offset, offset + chunkSize);
            const formData = new FormData();
            formData.append("fileChunk", chunk);
            formData.append("fileName", fileName);
            formData.append("offset", offset);
            formData.append("totalSize", totalSize);
            formData.append("jobID", cumulativeCurve_jobID);

            fetch(uploadUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Chunk uploaded:', data.message);
                    offset += chunk.size;
                    const progress = Math.min(100, Math.round(offset / totalSize * 100 * 100) / 100);
                    document.getElementById("CumulativeCurve_progressText1").textContent = 'Uploading: ' + progress + '%';
                    document.getElementById("CumulativeCurve_progressBar1").style.width = progress + '%';
                    uploadChunk(); // Continue uploading next chunk
                } else {
                    console.error('Upload failed:', data.message);
                }
            })
            .catch(error => {
                console.error('Error uploading chunk:', error);
            });
        }
        uploadChunk();
    }

    // Function to execute the analysis code
    function CumulativeCurve_executeCode() {
        const CumulativeCurve_fileToUpload = document.getElementById('CumulativeCurve_fileToUpload').files[0].name;
        const CumulativeCurve_species = document.getElementById('CumulativeCurve_species').value;
        const CumulativeCurve_mirnaName = document.getElementById('CumulativeCurve_mirnaName').value;
        const CumulativeCurve_BaseMean = document.getElementById('CumulativeCurve_BaseMean').value;
        const CumulativeCurve_outputFileName = document.getElementById('CumulativeCurve_outputFileName').value;
        const CumulativeCurve_email = document.getElementById('CumulativeCurve_email').value;

        console.log('Selected species:', CumulativeCurve_species);
        console.log('Email address:', CumulativeCurve_email);

        const formData = new FormData();
        formData.append('execute', 'true');
        formData.append('CumulativeCurve_fileToUpload', CumulativeCurve_fileToUpload);
        formData.append('CumulativeCurve_species', CumulativeCurve_species);
        formData.append('CumulativeCurve_mirnaName', CumulativeCurve_mirnaName);
        formData.append('CumulativeCurve_BaseMean', CumulativeCurve_BaseMean);
        formData.append('CumulativeCurve_outputFileName', CumulativeCurve_outputFileName);
        formData.append('CumulativeCurve_email', CumulativeCurve_email);
        formData.append('jobID', cumulativeCurve_jobID);

        fetch(executeUrl, {
            method: 'POST',
            body: formData
        }).then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error('Error executing code:', data.error);
                alert('Error executing code: ' + data.error);
            } else {
                console.log('Execute response:', data.message);
                document.getElementById('formSectionContainer').innerHTML =
                    '<p>Your file has been successfully uploaded.</p>' +
                    '<p style="color: red;">Your Job ID is: <strong>' + cumulativeCurve_jobID + '</strong></p>' +
                    '<p>Results will be sent to your email: ' + CumulativeCurve_email + '</p>' +
                    '<p>You can view the data processing status in real-time at <a href="https://clashhub.rc.ufl.edu/' + cumulativeCurve_jobID + '" style="color: red;">https://clashhub.rc.ufl.edu/' + cumulativeCurve_jobID + '</a></p>' +
                    '<div id="cumulative_queueInfo">Fetching queue status...</div>';

                // Fetch SLURM queue status
                fetch('./Analyzer_php/slurm_status.php?jobname=' + cumulativeCurve_jobID)
                  .then(res => res.json())
                  .then(statusData => {
                    let msg = '';
                    if (statusData.your_status === 'queued') {
                      const maxSlots = 2;
                      const running = statusData.running;
                      if (running < maxSlots) {
                        msg = 'Your job can start immediately.';
                      } else {
                        const queued = statusData.all_jobs.filter(j => j.status === 'queued');
                        const position = queued.findIndex(j => j.name === cumulativeCurve_jobID) + 1;
                        const waitJobs = Math.max(0, position - (maxSlots - running));
                        const estimate = waitJobs * 6;
                        msg = `Your job is number <strong>${position}</strong> in the queue. Estimated wait: <strong>${estimate}</strong> hours.`;
                      }
                    } else if (statusData.your_status === 'running') {
                      msg = `Job <strong>${cumulativeCurve_jobID}</strong> is now <span style="color:green;">running</span>.`;
                    } else {
                      msg = `Job status: ${statusData.your_status}.`;
                    }
                    const queueEl = document.getElementById('cumulative_queueInfo');
                    if (queueEl) queueEl.innerHTML = msg;
                  })
                  .catch(err => {
                    console.error('Error fetching queue status:', err);
                    const queueEl = document.getElementById('cumulative_queueInfo');
                    if (queueEl) queueEl.innerText = 'Unable to fetch queue status.';
                  });

                // Hide the submit button after successful execution
                const submitButton = document.getElementById('CumulativeCurve_uploadButton');
                if (submitButton) {
                    submitButton.style.display = 'none';
                }
            }
        }).catch(error => {
            console.error('Error executing code:', error);
        });
    }

    console.log("CumulativeCurve.js loaded");

    // Function to display the selected file name
    function showFileNameCumulativeCurve(inputId) {
        const fileInput = document.getElementById(inputId);
        const fileNameDisplay = document.getElementById('CumulativeCurve_fileNameDisplay');
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = 'Selected file: ' + fileInput.files[0].name;
        } else {
            fileNameDisplay.textContent = 'No file selected';
        }
    }

    // Event listener for custom file input button
    document.getElementById('customButton_CumulativeCurve_file').addEventListener('click', function() {
        document.getElementById('CumulativeCurve_fileToUpload').click();
    });

    // Event listener for file input change
    document.getElementById('CumulativeCurve_fileToUpload').addEventListener('change', function() {
        showFileNameCumulativeCurve('CumulativeCurve_fileToUpload');
    });

    // Function to validate and upload form data
    function CumulativeCurve_validateAndUpload(e) {
        e.preventDefault();
        const file = document.getElementById('CumulativeCurve_fileToUpload').value;
        const species = document.getElementById('CumulativeCurve_species').value;
        const mirnaName = document.getElementById('CumulativeCurve_mirnaName').value;
        const baseMean = document.getElementById('CumulativeCurve_BaseMean').value;
        const outputFileName = document.getElementById('CumulativeCurve_outputFileName').value;
        const email = document.getElementById('CumulativeCurve_email').value;

        if (!file || species === "" || !mirnaName || !baseMean || !outputFileName || !email) {
            alert('Please fill out all required fields.');
            return;
        }

        cumulativeCurve_jobID = cumulativeCurve_generateJobID(outputFileName);
        CumulativeCurve_uploadChunk();
    }

    // Event listener for form submission
    document.getElementById('CumulativeCurve_uploadButton').addEventListener('click', CumulativeCurve_validateAndUpload);

    // Function to generate a unique Job ID
    function cumulativeCurve_generateJobID(outputFileName) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomPart = '';
        for (let i = 0; i < 8; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2); // Get last two digits of the year
        const month = ('0' + (date.getMonth() + 1)).slice(-2); // Pad month with zero
        const day = ('0' + date.getDate()).slice(-2); // Pad day with zero
        const datePrefix = year + month + day; // Date prefix

        return 'CUR' + datePrefix + randomPart + '_' + outputFileName;
    }
});