/* ============================================================
   CLASHub Analyzer — Unified Form Switch Controller
   (Fixed: correct default PNG behavior + form toggle)
============================================================ */

function switchForm(formId) {
    if (!formId) return;

    const allForms = document.querySelectorAll('.form-section');
    const allImages = document.querySelectorAll('.image-section');
    const defaultImage = document.getElementById('default_imageContainer');
    const formAndImageContainer = document.getElementById('formAndImageContainer');
    const formSectionContainer = document.getElementById('formSectionContainer');

    /* -------------------------------
       ALWAYS show form area when clicking menu
    --------------------------------*/
    if (formSectionContainer) formSectionContainer.style.display = "block";
    if (defaultImage) defaultImage.style.display = "none";

    /* -------------------------------
       1. Hide all forms and images
    --------------------------------*/
    allForms.forEach(f => {
        f.style.display = 'none';
        f.classList.remove('active');
    });
    allImages.forEach(img => img.style.display = 'none');

    /* -------------------------------
       Hide and clear all result containers
    --------------------------------*/
    const resultContainers = [
        'hyb_resultContainer',
        'aqseq_resultContainer',
        'RNAseq_resultContainer',
        'CumulativeCurve_resultContainer'
    ];
    resultContainers.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.innerHTML = "";
        }
    });

    /* -------------------------------
       2. Show selected form
    --------------------------------*/
    const form = document.getElementById(formId);
    if (form) {
        form.style.display = 'block';
        form.classList.add('active');
    }

    /* -------------------------------
       3. Show corresponding pipeline PNG
    --------------------------------*/
    const imageMap = {
        hyb: 'hyb_imageContainer',
        aqseq: 'aqseq_imageContainer',
        RNAseq: 'RNAseq_imageContainer',
        CumulativeCurve: 'CumulativeCurve_imageContainer',
        jobStatus: null
    };

    const imgId = imageMap[formId];
    if (imgId) {
        const imgBox = document.getElementById(imgId);
        if (imgBox) imgBox.style.display = 'block';
    }

    /* -------------------------------
       4. Initialize modules
    --------------------------------*/
    if (formId === 'hyb' && typeof hyb_initializeForm === 'function') hyb_initializeForm();
    if (formId === 'aqseq') {
        if (typeof resetAqseqForms === 'function') resetAqseqForms();
        if (typeof initializeAqseqForm === 'function') initializeAqseqForm();
    }
    if (formId === 'RNAseq') {
        const rf = document.getElementById('RNAseq_formContainer');
        const rr = document.getElementById('RNAseq_resultContainer');
        if (rf) rf.style.display = 'block';
        if (rr) {
            rr.style.display = 'none';
            rr.innerHTML = "";
        }
        if (typeof RNAseq_initializeForm === 'function') RNAseq_initializeForm();
    }
    if (formId === 'CumulativeCurve' && typeof initializeCumulativeCurve === 'function') initializeCumulativeCurve();

    /* -------------------------------
       5. Highlight menu
    --------------------------------*/
    document.querySelectorAll('#leftMenu li').forEach(li => {
        if (li.getAttribute('data-form') === formId) {
            li.classList.add('selected-menu-item');
        } else {
            li.classList.remove('selected-menu-item');
        }
    });

    formAndImageContainer.classList.remove('default-layout');
}

/* ============================================================
   DOMContentLoaded — Only ONCE
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    const defaultImg = document.getElementById('default_imageContainer');
    const formSectionContainer = document.getElementById('formSectionContainer');

    /* Initial load: show default PNG, hide all forms */
    if (defaultImg) defaultImg.style.display = 'block';
    if (formSectionContainer) formSectionContainer.style.display = 'none';

    /* Left menu click binding */
    document.querySelectorAll('#leftMenu li').forEach(li => {
        li.addEventListener('click', () => {
            const formId = li.getAttribute('data-form');
            const def = document.getElementById('default_imageContainer');
            if (def) def.style.display = 'none';
            switchForm(formId);
        });
    });
});

/* ============================================================
   Job Status
============================================================ */
function updateQueueStatus() {
    fetch('./Analyzer_php/slurm_status.php')
        .then(res => res.json())
        .then(data => {
            const q = document.getElementById('queuedCount');
            const r = document.getElementById('runningCount');
            if (q) q.innerText = data.queued;
            if (r) r.innerText = data.running;
        })
        .catch(console.error);
}

document.addEventListener('DOMContentLoaded', () => {
    const jobBtn = document.getElementById('menu-jobStatus');
    if (jobBtn) {
        jobBtn.addEventListener('click', () => {
            updateQueueStatus();
            setInterval(updateQueueStatus, 5000);
        });
    }

    const checkBtn = document.getElementById('jobIdCheck');
    if (checkBtn) {
        checkBtn.addEventListener('click', () => {
            const id = document.getElementById('jobIdInput').value.trim();
            const baseURL = window.location.origin;
            const jobResult = document.getElementById('jobResult');
            if (!id) {
                jobResult.innerHTML = "Please enter a Job ID.";
                return;
            }

            fetch('./Analyzer_php/slurm_status.php?jobname=' + encodeURIComponent(id))
                .then(res => res.json())
                .then(data => {
                    const job = data.all_jobs.find(j => j.name === id);
                    const status = job ? job.status : data.your_status;

                    let prefix = "";
                    if (/^(CLQ|CLA)/.test(id)) prefix = "clash";
                    else if (/^(aqPE|aqSE|aqCR)/.test(id)) prefix = "mirseq";
                    else if (/^(rsDeq|rsTPM)/.test(id)) prefix = "rnaseq";
                    else if (/^(CUR)/.test(id)) prefix = "curve";

                    // Define render function: updates UI based on content
                    const renderResult = (downloadHtml) => {
                        let statusMsg = "";
                        if (status === 'queued') statusMsg = `Job <b>${id}</b> is queued.`;
                        else if (status === 'running') statusMsg = `Job <b>${id}</b> is <span style='color:green;'>running</span>.`;
                        else if (status === 'finished') statusMsg = `Job <b>${id}</b> has <span style='color:blue;'>finished</span>.`;
                        else statusMsg = `Job <b>${id}</b> status: ${status}`;

                        jobResult.innerHTML = `${statusMsg}<br><br>${downloadHtml}`;
                    };

                    if (status !== 'finished') {
                        renderResult("<p>Results will be available after analysis finishes. You will also receive an email.</p>");
                        return; // Exit if not finished
                    }

                    // === RNA-seq Special Handling (Async check for EISA) ===
                    if (prefix === "rnaseq") {
                        let standardSection = "";
                        let eisaSection = "";

                        // 1. Build Standard HTML
                        if (id.startsWith("rsTPM")) {
                            standardSection = `
                                <div style="text-align: left;">
                                    <p style="margin-bottom: 5px; color: #2c3e50;"><b>Standard Analysis (Main Results):</b></p>
                                    <ul style="margin-top: 0; padding-left: 20px;">
                                        <li><a href="${baseURL}/${id}/RNAseq_analysis_report.html" target="_blank">QC Report (HTML)</a> <span style="color:gray; font-size:0.9em;">- Check quality & mapping rate</span></li>
                                        <li><a href="${baseURL}/${id}/geneTPM.csv" target="_blank">Gene TPM Matrix (CSV)</a> <span style="color:gray; font-size:0.9em;">- Normalized expression</span></li>
                                        <li><a href="${baseURL}/${id}/gene_count_matrix.csv" target="_blank">Raw Count Matrix (CSV)</a> <span style="color:gray; font-size:0.9em;">- Raw reads</span></li>
                                    </ul>
                                </div>`;
                            eisaSection = `
                                <hr style="margin: 10px 0; border-top: 1px dashed #ccc;">
                                <div style="text-align: left;">
                                    <p style="margin-bottom: 5px; color: #d9534f;"><b>EISA Analysis (Add-on):</b></p>
                                    <ul style="margin-top: 0; padding-left: 20px;">
                                        <li><a href="${baseURL}/${id}/gene_count_eisa_exon_matrix.csv" target="_blank">Exon Count Matrix (CSV)</a></li>
                                        <li><a href="${baseURL}/${id}/gene_count_eisa_intron_matrix.csv" target="_blank">Intron Count Matrix (CSV)</a></li>
                                    </ul>
                                </div>`;
                        } else if (id.startsWith("rsDeq")) {
                            standardSection = `
                                <div style="text-align: left;">
                                    <p style="margin-bottom: 5px; color: #2c3e50;"><b>Standard Analysis (Main Results):</b></p>
                                    <ul style="margin-top: 0; padding-left: 20px;">
                                        <li><a href="${baseURL}/${id}/differential_expression_results.csv" target="_blank"><strong>Differential Expression Results (CSV)</strong></a></li>
                                        <li><a href="${baseURL}/${id}/RNAseq_analysis_report.html" target="_blank">QC Report (HTML)</a></li>
                                        <li><a href="${baseURL}/${id}/geneTPM.csv" target="_blank">Gene TPM Matrix (CSV)</a></li>
                                        <li><a href="${baseURL}/${id}/gene_count_matrix.csv" target="_blank">Raw Count Matrix (CSV)</a></li>
                                    </ul>
                                </div>`;
                            eisaSection = `
                                <hr style="margin: 10px 0; border-top: 1px dashed #ccc;">
                                <div style="text-align: left;">
                                    <p style="margin-bottom: 5px; color: #d9534f;"><b>EISA Analysis (Add-on):</b></p>
                                    <ul style="margin-top: 0; padding-left: 20px;">
                                        <li><a href="${baseURL}/${id}/EISA_analysis_results.csv" target="_blank"><strong>EISA Mechanism Results (CSV)</strong></a></li>
                                        <li><a href="${baseURL}/${id}/gene_count_eisa_exon_matrix.csv" target="_blank">Exon Count Matrix (CSV)</a></li>
                                        <li><a href="${baseURL}/${id}/gene_count_eisa_intron_matrix.csv" target="_blank">Intron Count Matrix (CSV)</a></li>
                                    </ul>
                                </div>`;
                        }

                        // Render Standard first
                        renderResult(standardSection);

                        // Async probe for EISA file
                        let probeFile = id.startsWith("rsDeq") ? "EISA_analysis_results.csv" : "gene_count_eisa_exon_matrix.csv";
                        let probeUrl = `${baseURL}/${id}/${probeFile}`;

                        fetch(probeUrl, { method: 'HEAD' })
                            .then(response => {
                                if (response.ok) {
                                    renderResult(standardSection + eisaSection);
                                }
                            })
                            .catch(() => {});

                        return; // Stop here for RNA-seq
                    }

                    // === Cumulative Curve Special Handling (Async check for Stringent) ===
                    if (prefix === "curve") {
                        const outputName = id.split('_').slice(1).join('_');
                        
                        // Always available results (Standard)
                        const standardSection = `
                            <div style="text-align: left;">
                                <p style="margin-bottom: 5px; color: #2c3e50;"><b>Standard Analysis Results:</b></p>
                                <ul style="margin-top: 0; padding-left: 20px;">
                                    <li><a href="${baseURL}/${id}/${outputName}_CumulativeFractionCurve_Standard.svg" target="_blank">Standard Plot (SVG)</a></li>
                                    <li><a href="${baseURL}/${id}/${outputName}_merged_targets_data.csv" target="_blank">Merged Data (CSV)</a></li>
                                </ul>
                            </div>`;
                        
                        // Optional Stringent results
                        const stringentSection = `
                            <div style="text-align: left; margin-top: 10px;">
                                <p style="margin-bottom: 5px; color: #d9534f;"><b>Stringent Filtering Results:</b></p>
                                <ul style="margin-top: 0; padding-left: 20px;">
                                    <li><a href="${baseURL}/${id}/${outputName}_CumulativeFractionCurve_Stringent.svg" target="_blank">Stringent Plot (SVG)</a></li>
                                </ul>
                            </div>`;

                        // Render Standard first
                        renderResult(standardSection);

                        // Async probe for Stringent file
                        let probeUrl = `${baseURL}/${id}/${outputName}_CumulativeFractionCurve_Stringent.svg`;

                        fetch(probeUrl, { method: 'HEAD' })
                            .then(response => {
                                if (response.ok) {
                                    // If Stringent file exists, re-render with both sections
                                    renderResult(standardSection + stringentSection);
                                }
                            })
                            .catch(() => {});

                        return; // Stop here for Curve
                    }

                    // === Other Job Types (CLASH, Mirseq) ===
                    let downloads = "";
                    if (prefix === "clash") {
                        const outputName = id.split('_').slice(1).join('_');
                        downloads = `
                            <p><b>Download Results:</b></p>
                            <a href="${baseURL}/${id}/${outputName}_analysis_report.html" target="_blank">Report (HTML)</a><br>
                            <a href="${baseURL}/${id}/${outputName}_FinalResult_with_piranha.csv" target="_blank">Final Result CSV</a><br>
                            <a href="${baseURL}/${id}/${outputName}.genome.bw" target="_blank">bigWig File</a>
                        `;
                    } else if (prefix === "mirseq") {
                         downloads = `
                            <p><b>Download Results:</b></p>
                            <a href="${baseURL}/${id}/mirnaseq_analysis_report.html" target="_blank">Report (HTML)</a><br>
                            <a href="${baseURL}/${id}/AllSample_RawCount.csv" target="_blank">miRNA total abundance (AllSample_RawCount.csv)</a><br>
                            <a href="${baseURL}/${id}/AllSample_Isoform_RawCount.csv" target="_blank">miRNA isoform abundance (AllSample_Isoform_RawCount.csv)</a>
                        `;
                    } else {
                        downloads = "<p>No recognized job type. Cannot generate download links.</p>";
                    }

                    // Render common jobs
                    renderResult(downloads);
                })
                .catch(() => {
                    jobResult.innerText = "Error checking job status.";
                });
        });
    }
});