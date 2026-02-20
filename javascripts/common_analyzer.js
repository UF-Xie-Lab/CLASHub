/**
 * ============================================================================
 * CLASHub Common Utilities
 * ============================================================================
 * This file contains shared logic for environment detection, file validation,
 * Job ID generation, and chunked file uploading.
 * * It should be included in HTML files BEFORE specific logic scripts 
 * (e.g., before hyb.js, AQseq.js).
 */

// ============================================================================
// 1. Environment Detection
// ============================================================================

/**
 * Detects if the current environment is Development or Production.
 * Based on the URL: https://devclashub.rc.ufl.edu/ vs https://clashub.rc.ufl.edu/
 */
const CLASH_ENV = (function() {
    const origin = window.location.origin;
    // Check for your specific dev domain or localhost for local testing
    if (origin.includes("devclashub") || origin.includes("localhost")) {
        console.log("[Common] Environment detected: DEVELOPMENT");
        return "dev";
    }
    console.log("[Common] Environment detected: PRODUCTION");
    return "prod";
})();


// ============================================================================
// 2. Validation Utilities
// ============================================================================

/**
 * Checks if a file name contains only allowed characters.
 * Allowed: Letters, numbers, underscores, hyphens, and periods.
 * @param {string} fileName 
 * @returns {boolean}
 */
function isValidFileName(fileName) {
    const regex = /^[a-zA-Z0-9_.-]+$/;
    return regex.test(fileName);
}

/**
 * Checks if an adapter sequence is valid.
 * Allowed: IUPAC nucleotide codes (XACGTURYSWKMBDHVN).
 * Disallowed: Strings consisting ONLY of 'N'.
 * @param {string} sequence 
 * @returns {boolean}
 */
function isValidAdapterSequence(sequence) {
    if (!sequence) return true; // Empty is usually handled as "use default" by caller
    const allowedAdapterChars = /^[XACGTURYSWKMBDHVN]+$/;
    const containsOnlyN = /^N+$/;
    return allowedAdapterChars.test(sequence) && !containsOnlyN.test(sequence);
}


// ============================================================================
// 3. Job ID Generation
// ============================================================================

/**
 * Generates a standardized Job ID.
 * Format: [Prefix][YYMMDD][Random8Chars]_[OutputName]
 * * @param {string} prefix - e.g., 'CLA', 'aqPE', 'rsTPM'
 * @param {string} outputFileName - The user-defined output name
 * @returns {string} The complete Job ID
 */
function generateJobID(prefix, outputFileName) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const date = new Date();
    const year = date.getFullYear().toString().slice(-2); // YY
    const month = ('0' + (date.getMonth() + 1)).slice(-2); // MM
    const day = ('0' + date.getDate()).slice(-2); // DD
    const datePrefix = year + month + day;

    return `${prefix}${datePrefix}${randomPart}_${outputFileName}`;
}


// ============================================================================
// 4. Chunk Upload Logic
// ============================================================================

/**
 * Uploads a file in chunks to the server.
 * Returns a Promise that resolves when the upload is complete.
 * * @param {File} file - The DOM File object to upload
 * @param {string} jobID - The Job ID associated with this file
 * @param {function} onProgress - Callback function(percent) to update UI
 * @param {string} [uploadUrl] - Optional URL override (default: ./Analyzer_php/upload_chunk.php)
 * @returns {Promise}
 */
function uploadFileChunks(file, jobID, onProgress, uploadUrl) {
    return new Promise((resolve, reject) => {
        // Default URL assumes the HTML is in the root and PHP is in Analyzer_php/
        const targetUrl = uploadUrl || './Analyzer_php/upload_chunk.php';
        const chunkSize = 2 * 1024 * 1024; // 2MB
        const totalSize = file.size;
        let offset = 0;

        // Recursive function to upload chunks sequentially
        function uploadNext() {
            if (offset >= totalSize) {
                // All chunks finished
                if (onProgress) onProgress(100);
                resolve("Upload Complete");
                return;
            }

            const chunk = file.slice(offset, offset + chunkSize);
            const formData = new FormData();
            
            formData.append("fileChunk", chunk);
            formData.append("fileName", file.name);
            formData.append("offset", offset);
            formData.append("totalSize", totalSize);
            formData.append("jobID", jobID);
            formData.append("env", CLASH_ENV); // Automatically include the environment

            fetch(targetUrl, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    offset += chunk.size;
                    
                    // Calculate percentage
                    const percent = Math.min(100, Math.round((offset / totalSize) * 10000) / 100);
                    
                    // Update UI via callback
                    if (onProgress) onProgress(percent);

                    // Process next chunk
                    uploadNext();
                } else {
                    reject(new Error(data.message || "Upload failed on server side"));
                }
            })
            .catch(error => {
                console.error("[Common] Upload error:", error);
                reject(error);
            });
        }

        // Start the process
        uploadNext();
    });
}