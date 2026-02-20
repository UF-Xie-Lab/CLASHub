(function() {
    // 1. Prevent duplicate loading
    if (window.__clashubTracked) return;
    window.__clashubTracked = true;

    // 2. Capture the full path including search parameters (e.g. ?gene=AGO2)
    var fullPath = location.pathname + location.search;
    
    // 3. Get Geolocation (with lat/lng)
    function getGeo(callback) {
        var done = false;
        // 1.5 second timeout to ensure the page doesn't hang
        var timeout = setTimeout(function(){ 
            if(!done) { done=true; callback(null); } 
        }, 1500);
        fetch('https://get.geojs.io/v1/ip/geo.json')
            .then(function(res){ return res.json(); })
            .then(function(j){
                if(!done) { 
                    done=true; 
                    clearTimeout(timeout); 
                    callback({
                        country_code: j.country_code,
                        region: j.region,
                        city: j.city,
                        lat: j.latitude,
                        lng: j.longitude
                    }); 
                }
            })
            .catch(function(){ 
                if(!done) { done=true; clearTimeout(timeout); callback(null); } 
            });
    }
    // 4. Send Data to Server
    function sendData(geo) {
        var payload = {
            path: fullPath,
            ref: document.referrer,
            ua: navigator.userAgent
        };
        
        // Add geo data if available
        if (geo) {
            payload.country_code = geo.country_code;
            payload.region = geo.region;
            payload.city = geo.city;
            payload.lat = geo.lat; // Send Latitude
            payload.lng = geo.lng; // Send Longitude
        }

        // Send POST request
        try {
            // Note: Ensure this path points correctly to your PHP file
            fetch('/Index_php/track.php', { 
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload),
                keepalive: true
            });
        } catch(e) {
            console.error('[track] Error sending data:', e);
        }
    }

    // 5. Execute
    getGeo(function(geo){ 
        sendData(geo); 
    });

})();

// ==========================================
// Automatic Copyright Year Updater
// ==========================================
(function() {
    function updateCopyright() {
        var startYear = 2025;
        var currentYear = new Date().getFullYear();
        var yearSpan = document.getElementById('copyright-year');
        
        // Only update if the element exists on the page
        if (yearSpan) {
            if (currentYear > startYear) {
                // Example: "2025-2026"
                yearSpan.textContent = startYear + "-" + currentYear;
            } else {
                // Example: "2025"
                yearSpan.textContent = startYear;
            }
        }
    }

    // Execute when the DOM is fully loaded to ensure the footer exists
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateCopyright);
    } else {
        updateCopyright();
    }
})();