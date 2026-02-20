var allRows = [];       // Global variable to store all raw rows fetched from server
var filteredRows = [];  // Global variable to store the currently filtered rows for display
var currentPageGlobal = 1; // Current page number
var currentSort = { columns: [], orders: [] }; // Current sort state (starts empty to respect SQL order)

/**
 * Function to get URL parameters
 * @param {string} name - Parameter name
 * @returns {string} - Parameter value
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}
 
/**
 * Function to update the <h1> header
 * @param {string} searchTerm - The search term used
 * @param {string} cellLine - The cell line or tissue name
 */
function updateClashHeader(searchTerm, cellLine) {
    if (searchTerm && cellLine) {
        $('#clash-header').text(`CLASH: ${searchTerm} in ${cellLine}`);
    } else if (searchTerm) {
        $('#clash-header').text(`CLASH: ${searchTerm}`);
    } else {
        $('#clash-header').text('CLASH');
    }
}

$(document).ready(function() {
    var search = getUrlParameter('index_CLASH_name');
    var speciesValue = getUrlParameter('CLASH_CellLine'); 
    var cellLineText = getUrlParameter('CLASH_CellLine_text'); 

    updateClashHeader(search, cellLineText); 

    loadAllTablePages(search, speciesValue, function() { 
        initFilters(); 

        // Enable auto-sort for BOTH Human and Mouse Consensus tables
        var consensusTables = ['CLASH_Human_Consensus_Final', 'CLASH_Mouse_Consensus_Final', 'CLASH_Celegans_Consensus_Final'];
        
        if (consensusTables.includes(speciesValue)) {
            currentSort.columns = ['total_cell_lines'];
            currentSort.orders = ['desc'];

            sortTable(currentSort.columns, currentSort.orders);
            updateSortIndicators();
        }
    });

    $('#downloadTable').click(function() {
        downloadTableAsCSV();
    });

    $('#filterRegion, #filterSiteType').on('change', function() {
        applyFilters();
    });

    $('#dataContainer').on('click', 'th[data-column]', function(event) {
        if ($(event.target).hasClass('sort-btn')) {
            event.stopPropagation();
        }
        var column = $(this).data('column');
        handleSort(column);
    });
});
 
/**
 * Handle sort logic (Manual triggers via header clicks)
 * @param {string} column - data-column attribute of the clicked column
 */
function handleSort(column) {
    if (currentSort.columns.includes(column)) {
        var orderIndex = currentSort.columns.indexOf(column);
        currentSort.orders[orderIndex] = currentSort.orders[orderIndex] === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.columns = [column];
        currentSort.orders = ['desc']; 
    }

    sortTable(currentSort.columns, currentSort.orders);
    updateSortIndicators();
}

/**
 * Load all table data pages
 */
function loadAllTablePages(searchTerm, species, callback) {
    allRows = [];
    $.ajax({
        url: './microRNA_targets_php/microRNA_targets.php',
        type: 'GET',
        data: { index_CLASH_name: searchTerm, CLASH_CellLine: species, page: 'all' },
        success: function(response) {
            $('#dataContainer').html(response);

            var currentRows = $('#dataContainer table tbody tr').get();
            allRows = allRows.concat(currentRows);
            filteredRows = allRows.slice();

            var perPage = 10; 
            var totalPages = Math.ceil(filteredRows.length / perPage);
            currentPageGlobal = 1;
            
            // Initial display: Uses the order returned by the SQL server
            displayTable(filteredRows, currentPageGlobal, perPage);
            setupPagination(filteredRows, perPage, totalPages);

            if (callback) callback();
        },
        error: function(xhr, status, error) {
            console.error('AJAX request failed:', error);
            $('#dataContainer').html('<p>Error loading data.</p>');
        }
    });
}

/**
 * Initialize filter dropdown options
 */
function initFilters() {
    var siteTypes = new Set();
    filteredRows.forEach(function(row) {
        var $tds = $(row).find('td');
        var siteTypeText = $tds.eq(9).text().trim();
        if (siteTypeText) siteTypes.add(siteTypeText);
    });

    var siteTypeSelect = $('#filterSiteType');
    siteTypeSelect.find('option:not([value="all"])').remove();

    Array.from(siteTypes).sort().forEach(function(s) {
        siteTypeSelect.append(new Option(s, s));
    });
}

/**
 * Apply filters
 */
function applyFilters() {
    var selectedRegion = $('#filterRegion').val();
    var selectedSiteType = $('#filterSiteType').val();

    filteredRows = allRows.filter(function(row) {
        var $tds = $(row).find('td');
        var regionText = ($tds.eq(7).text() || '').trim();
        var siteTypeText = ($tds.eq(9).text() || '').trim();
        var matchRegion = false;
        
        if (selectedRegion === 'all') {
            matchRegion = true;
        } else if (selectedRegion === 'intron') {
            matchRegion = regionText.toLowerCase().includes('intron');
        } else if (selectedRegion === 'non-coding') {
            var r = regionText.toLowerCase();
            matchRegion = !r.includes('utr') && !r.includes('cds') && !r.includes('intron');
        } else {
            matchRegion = regionText.includes(selectedRegion);
        }

        var matchSiteType = (selectedSiteType === 'all') || (siteTypeText === selectedSiteType);
        return matchRegion && matchSiteType;
    });

    currentPageGlobal = 1;
    var perPage = 10;
    
    // Only re-apply sort if the user has manually clicked a column header
    if (currentSort.columns.length > 0) {
        sortTable(currentSort.columns, currentSort.orders);
    } else {
        var totalPages = Math.ceil(filteredRows.length / perPage);
        displayTable(filteredRows, currentPageGlobal, perPage);
        setupPagination(filteredRows, perPage, totalPages);
    }
}

/**
 * Display table rows
 */
function displayTable(rows, currentPage, perPage) {
    var tableHeader = $('#dataContainer table thead').clone();
    $('#dataContainer table').empty();
    $('#dataContainer table').append(tableHeader).append('<tbody></tbody>');

    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    $('#dataContainer table tbody').append(rows.slice(start, end));
    
    updateSortIndicators();
}

/**
 * Setup pagination controls
 */
function setupPagination(rows, perPage, totalPages) {
    var paginationHtml = '';
    paginationHtml += '<a href="javascript:void(0);" class="first-page">First</a>';
    paginationHtml += '<a href="javascript:void(0);" class="prev-page">Previous</a>';

    var maxVisiblePages = 5;
    var startPage = Math.max(currentPageGlobal - 2, 1);
    var endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(endPage - maxVisiblePages + 1, 1);
    }

    if (startPage > 1) paginationHtml += '<span class="ellipsis">...</span>';

    for (var i = startPage; i <= endPage; i++) {
        if (i === currentPageGlobal) {
            paginationHtml += '<span class="current-page">' + i + '</span>';
        } else {
            paginationHtml += '<a href="javascript:void(0);" class="page-link" data-page="' + i + '">' + i + '</a>';
        }
    }

    if (endPage < totalPages) paginationHtml += '<span class="ellipsis">...</span>';

    paginationHtml += '<a href="javascript:void(0);" class="next-page">Next</a>';
    paginationHtml += '<a href="javascript:void(0);" class="last-page">Last</a>';

    $('.pagination').html(paginationHtml);

    // Event listeners
    $('.first-page, .prev-page, .next-page, .last-page, .page-link').off('click').on('click', function() {
        var targetPage = currentPageGlobal;
        if ($(this).hasClass('first-page')) targetPage = 1;
        else if ($(this).hasClass('prev-page')) targetPage = Math.max(1, currentPageGlobal - 1);
        else if ($(this).hasClass('next-page')) targetPage = Math.min(totalPages, currentPageGlobal + 1);
        else if ($(this).hasClass('last-page')) targetPage = totalPages;
        else targetPage = $(this).data('page');

        if (targetPage !== currentPageGlobal) {
            currentPageGlobal = targetPage;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });
}

/**
 * Sort table
 */
function sortTable(columns, orders) {
    filteredRows.sort(function(a, b) {
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            var order = orders[i];
            var columnIndex = getColumnIndex(column); 
            
            if (columnIndex === -1) continue; 

            var aText = getCellTextByColumnIndex(a, columnIndex);
            var bText = getCellTextByColumnIndex(b, columnIndex);

            var aNum = parseFloat(aText);
            var bNum = parseFloat(bText);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                aText = aNum;
                bText = bNum;
            }

            if (aText < bText) return order === 'asc' ? -1 : 1;
            if (aText > bText) return order === 'asc' ? 1 : -1;
        }
        return 0; 
    });

    var perPage = 10;
    displayTable(filteredRows, currentPageGlobal, perPage);
    setupPagination(filteredRows, perPage, Math.ceil(filteredRows.length / perPage));
}

function getCellTextByColumnIndex(row, columnIndex) {
    var cell = $(row).find('td').eq(columnIndex - 1); 
    if (columnIndex === 2) { 
        return $(cell).find('.miRNA-seq').text().trim();
    }
    return cell.text().trim();
}

function getColumnIndex(column) {
    var index = -1;
    $('#dataContainer table thead th').each(function(i) {
        if ($(this).data('column') === column) {
            index = i + 1;
            return false; 
        }
    });
    return index;
}

function updateSortIndicators() {
    $('#dataContainer table thead th').each(function() {
        $(this).removeClass('sorted-asc sorted-desc');
        var column = $(this).data('column');
        var index = currentSort.columns.indexOf(column);
        if (index > -1) {
            $(this).addClass(currentSort.orders[index] === 'asc' ? 'sorted-asc' : 'sorted-desc');
        }
    });
}

/**
 * Download table as CSV
 */
function downloadTableAsCSV() {
    // 1. Process HEADERS
    var headerRow = document.querySelectorAll("#dataContainer table thead tr th");
    var header = [];
    
    for (var h = 0; h < headerRow.length; h++) {
        var $th = $(headerRow[h]);
        var $clone = $th.clone();
        
        // Remove tooltips so they don't appear in the CSV file
        $clone.find('.tooltip, .help_site_type').remove(); 
        
        // --- SAFE HEADER CLEANUP ---
        // We use .replace(/\s+/g, ' ') HERE ONLY. 
        // This fixes the PHP newline/indentation issue in the column titles.
        var thText = $clone.text().replace(/\s+/g, ' ').trim();

        var thDataCol = $th.data('column');
        var isPairingCol = (thDataCol === 'UNAfold' || thDataCol === 'pairing_pattern');

        if (isPairingCol) {
            // Split the pairing column into 3 useful CSV columns
            header.push('miRNA Sequence (5->3)', 'Pairing Pattern', 'Target Sequence (3->5)');
        } else {
            // Clean up smart quotes in headers
            var clean = thText.replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/\u00A0|\u202F/g, ' ').trim();
            header.push(clean);
        }
    }
           
    var csvContent = header.map(item => `"${item}"`).join(",") + "\n";

    // Helper: Escapes quotes but PRESERVES internal spacing
    function csvEscape(val) {
        if (val === undefined || val === null) return '""';
        // We replace Non-Breaking Spaces with regular spaces, but we DO NOT collapse multiple spaces.
        var cleanVal = String(val).replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');
        return '"' + cleanVal.replace(/"/g, '""') + '"';
    }

    // 2. Process DATA ROWS
    for (var i = 0; i < filteredRows.length; i++) {
        var row = [];
        var cols = $(filteredRows[i]).find("td, th"); 

        for (var j = 0; j < cols.length; j++) {
            var th = headerRow[j];
            var thDataCol = (th && th.getAttribute) ? th.getAttribute('data-column') : $(th).data('column');
            var isPairingCol = (thDataCol === 'UNAfold' || thDataCol === 'pairing_pattern');

            if (isPairingCol) {
                // --- PAIRING PATTERN PRESERVATION ---
                // We extract text directly. We do NOT use .replace(/\s+/g, ' ') here.
                // This ensures "     |||||" alignments stay intact.
                var $cell = $(cols[j]);
                
                var miRNA_seq = ($cell.find('.miRNA-seq').text() || '').replace(/^\s*miRNA:\s*5'\s*/i, '').replace(/-/g, '').trim();
                
                // Get the middle line (alignment sticks)
                var baseLine = $cell.find('.match-lines').filter(function(){
                    var cls = this.className || '';
                    return cls.indexOf('miRNA-seq') === -1 && cls.indexOf('target-seq') === -1;
                }).first().text(); // .text() preserves the spaces inside the string
                
                var base_pattern = baseLine.trimStart();
                
                var target_seq = ($cell.find('.target-seq').text() || '').replace(/^\s*target:\s*3'\s*/i, '').replace(/-/g, '').trim();
                
                row.push(csvEscape(miRNA_seq), csvEscape(base_pattern), csvEscape(target_seq));
            } else {
                // For regular text columns, innerText is safe
                row.push(csvEscape(cols[j].innerText.trim()));
            }
        }
        csvContent += row.join(",") + "\n"; 
    }

    var BOM = "\uFEFF"; 
    var csvFile = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8" });
    var downloadLink = document.createElement("a");
    var searchTerm = getUrlParameter('index_CLASH_name');
    var cellLineText = getUrlParameter('CLASH_CellLine_text'); 

    if (searchTerm && cellLineText) {
        var encodedSearchTerm = encodeURIComponent(searchTerm).replace(/%20/g, '_');
        var encodedCellLine = encodeURIComponent(cellLineText).replace(/%20/g, '_');
        downloadLink.download = `clash_search_${encodedSearchTerm}_in_${encodedCellLine}.csv`;
    } else if (searchTerm) {
        downloadLink.download = `clash_search_${encodeURIComponent(searchTerm).replace(/%20/g, '_')}.csv`;
    } else {
        downloadLink.download = "clash_table.csv";
    }

    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.click();
}