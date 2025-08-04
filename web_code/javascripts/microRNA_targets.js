var allRows = []; // 全局变量存储所有行
var currentPageGlobal = 1; // 当前页码
var currentSort = { columns: [], orders: [] }; // 当前排序状态

/**
 * 获取URL参数的函数
 * @param {string} name - 参数名
 * @returns {string} - 参数值
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

/**
 * 更新 <h1> 的函数
 * @param {string} searchTerm - 搜索词
 * @param {string} cellLine - 细胞系或组织名称
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
    var speciesValue = getUrlParameter('CLASH_CellLine'); // 获取 CLASH_CellLine 的值
    var cellLineText = getUrlParameter('CLASH_CellLine_text'); // 获取 CLASH_CellLine_text 的显示文本

    console.log("Species Value js1:", speciesValue); // 调试输出
    console.log("Cell Line Text js1:", cellLineText); // 调试输出


    updateClashHeader(search, cellLineText); // 使用显示文本更新标题

    loadAllTablePages(search, speciesValue, function() { // 使用值进行数据加载
        // 页面加载完成后，执行默认排序
        defaultSort();
    });

    $('#downloadTable').click(function() {
        downloadTableAsCSV();
    });

    /**
     * 绑定表头点击事件处理器
     * 只绑定一个事件处理器，避免重复逻辑
     */
    $('#dataContainer').on('click', 'th[data-column]', function(event) {
        console.log('Header clicked:', $(this).data('column')); // 调试信息

        // 如果点击的是 sort-btn，阻止事件冒泡，避免触发 th 的点击事件
        if ($(event.target).hasClass('sort-btn')) {
            event.stopPropagation();
        }

        var column = $(this).data('column');
        handleSort(column);
    });
});

/**
 * 处理排序逻辑
 * @param {string} column - 被点击的列的 data-column 属性值
 */
function handleSort(column) {
    console.log('Handling sort for column:', column);

    if (currentSort.columns.includes(column)) {
        // 如果点击的列已经是当前排序列，切换其排序顺序
        var orderIndex = currentSort.columns.indexOf(column);
        currentSort.orders[orderIndex] = currentSort.orders[orderIndex] === 'asc' ? 'desc' : 'asc';
    } else {
        // 只对当前点击的列进行排序，重置排序状态
        currentSort.columns = [column];
        currentSort.orders = ['desc']; // 默认排序顺序为降序
    }

    console.log('Current sort state:', currentSort);
    sortTable(currentSort.columns, currentSort.orders);
    updateSortIndicators();
}

/**
 * 加载所有表格页面数据
 * @param {string} searchTerm - 搜索词
 * @param {string} species - 物种（这里是 CLASH_CellLine 的值）
 * @param {function} callback - 回调函数
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

            var perPage = 10; // 每页行数
            var totalPages = Math.ceil(allRows.length / perPage);
            currentPageGlobal = 1;
            displayTable(allRows, currentPageGlobal, perPage);
            setupPagination(allRows, perPage, totalPages);

            if (callback) callback();
        },
        error: function(xhr, status, error) {
            console.error('AJAX request failed:', error);
            // 可以在页面上显示错误信息
            $('#dataContainer').html('<p>Error loading data. Please try again later.</p>');
        }
    });
}

/**
 * 显示表格数据
 * @param {Array} rows - 所有行
 * @param {number} currentPage - 当前页码
 * @param {number} perPage - 每页行数
 * @param {number} totalPages - 总页数
 */
function displayTable(rows, currentPage, perPage) {
    var tableHeader = $('#dataContainer table thead').clone();
    console.log('Cloned table header:', tableHeader.html()); // 调试信息
    $('#dataContainer table').empty();
    $('#dataContainer table').append(tableHeader).append('<tbody></tbody>');

    var start = (currentPage - 1) * perPage;
    var end = start + perPage;
    $('#dataContainer table tbody').append(rows.slice(start, end));
}

/**
 * 设置分页控件
 * @param {Array} rows - 所有行
 * @param {number} perPage - 每页行数
 * @param {number} totalPages - 总页数
 */
function setupPagination(rows, perPage, totalPages) {
    var paginationHtml = '';

    // 添加 "First" 和 "Previous" 按钮
    paginationHtml += '<a href="javascript:void(0);" class="first-page">First</a>';
    paginationHtml += '<a href="javascript:void(0);" class="prev-page">Previous</a>';

    // 定义可见页码范围
    var maxVisiblePages = 5; // 最大可见页码数
    var startPage = Math.max(currentPageGlobal - 2, 1);
    var endPage = Math.min(startPage + maxVisiblePages - 1, totalPages);

    // 调整 startPage 以确保足够的页码可见
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(endPage - maxVisiblePages + 1, 1);
    }

    // 如果 startPage > 1，添加省略号
    if (startPage > 1) {
        paginationHtml += '<span class="ellipsis">...</span>';
    }

    // 创建页码链接
    for (var i = startPage; i <= endPage; i++) {
        if (i === currentPageGlobal) {
            paginationHtml += '<span class="current-page">' + i + '</span>';
        } else {
            paginationHtml += '<a href="javascript:void(0);" class="page-link" data-page="' + i + '">' + i + '</a>';
        }
    }

    // 如果 endPage < totalPages，添加省略号
    if (endPage < totalPages) {
        paginationHtml += '<span class="ellipsis">...</span>';
    }

    // 添加 "Next" 和 "Last" 按钮
    paginationHtml += '<a href="javascript:void(0);" class="next-page">Next</a>';
    paginationHtml += '<a href="javascript:void(0);" class="last-page">Last</a>';

    $('.pagination').html(paginationHtml);

    // 绑定分页按钮的点击事件
    $('.first-page').off('click').on('click', function() {
        if (currentPageGlobal !== 1) {
            currentPageGlobal = 1;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });

    $('.prev-page').off('click').on('click', function() {
        if (currentPageGlobal > 1) {
            currentPageGlobal--;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });

    $('.next-page').off('click').on('click', function() {
        if (currentPageGlobal < totalPages) {
            currentPageGlobal++;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });

    $('.last-page').off('click').on('click', function() {
        if (currentPageGlobal !== totalPages) {
            currentPageGlobal = totalPages;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });

    $('.page-link').off('click').on('click', function() {
        var page = $(this).data('page');
        if (page !== currentPageGlobal) {
            currentPageGlobal = page;
            displayTable(rows, currentPageGlobal, perPage);
            setupPagination(rows, perPage, totalPages);
        }
    });
}

/**
 * 排序表格
 * @param {Array} columns - 排序的列数组
 * @param {Array} orders - 对应的排序顺序数组
 */
function sortTable(columns, orders) {
    // console.log('Sorting by columns:', columns, 'with orders:', orders);
    allRows.sort(function(a, b) {
        for (var i = 0; i < columns.length; i++) {
            var column = columns[i];
            var order = orders[i];
            var columnIndex = getColumnIndex(column); // 获取实际的列索引
            // console.log('Sorting by column:', column, 'at index:', columnIndex);
            if (columnIndex === -1) {
                console.warn('Column not found:', column);
                continue; // 如果找不到列，跳过
            }

            var aText = getCellTextByColumnIndex(a, columnIndex);
            var bText = getCellTextByColumnIndex(b, columnIndex);

            // console.log('Row A:', aText, 'Row B:', bText);

            // 尝试根据数字排序
            var aNum = parseFloat(aText);
            var bNum = parseFloat(bText);
            if (!isNaN(aNum) && !isNaN(bNum)) {
                aText = aNum;
                bText = bNum;
            }

            if (aText < bText) {
                return order === 'asc' ? -1 : 1;
            }
            if (aText > bText) {
                return order === 'asc' ? 1 : -1;
            }
            // 如果相等，继续比较下一个排序列
        }
        return 0; // 所有排序列相等
    });

    // 重新显示当前页
    var perPage = 10;
    var totalPages = Math.ceil(allRows.length / perPage);
    console.log('Total pages after sorting:', totalPages);
    displayTable(allRows, currentPageGlobal, perPage);
    setupPagination(allRows, perPage, totalPages);
}

/**
 * 根据列索引获取单元格文本
 * @param {HTMLElement} row - 表格行元素
 * @param {number} columnIndex - 列索引（1-based）
 * @returns {string} - 单元格文本
 */
function getCellTextByColumnIndex(row, columnIndex) {
    var cell = $(row).find('td').eq(columnIndex - 1); // 假设 columnIndex 是1-based
    if (columnIndex === 2) { // 假设 UNAfold 在第2列
        // 处理 UNAfold 列，提取排序关键字（如 miRNA 序列）
        var miRNA_seq = $(cell).find('.miRNA-seq').text().trim();
        return miRNA_seq;
    }
    return cell.text().trim();
}

/**
 * 根据 data-column 属性获取列索引
 * @param {string} column - data-column 属性值
 * @returns {number} - 列索引（1-based），如果未找到返回 -1
 */
function getColumnIndex(column) {
    var index = -1;
    $('#dataContainer table thead th').each(function(i) {
        if ($(this).data('column') === column) {
            index = i + 1; // 返回1-based索引
            return false; // 退出循环
        }
    });
    return index;
}

/**
 * 更新排序指示器（如箭头）
 */
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
 * 执行默认排序
 */
function defaultSort() {
    var species = getUrlParameter('CLASH_CellLine');
    var defaultColumn = '';
    var defaultOrder = 'desc'; // 默认排序顺序

    if (species === '20240619_293t_eclip_h1toh8') {
        defaultColumn = 'Number_of_occurrences_in_8_replicates';
    } else if (species === '20240621_HCT116_qCLASH_h9toh16') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_MB002_qCLASH_h17toh24') {
        defaultColumn = 'Number_of_occurrences_in_4_replicates_zswim8_KO';
    } else if (species === '20240621_U87MG_qCLASH_h25toh30') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_T98G_qCLASH_h31toh36') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20241022_MDAMB231_eCLIP_qCLASH_h437toh42_h101toh106') {
        defaultColumn = 'Number_of_occurrences_in_6_replicates_in_zs8';
    } else if (species === '20241022_A549_eCLIP_qCLASH_h43toh48_h95toh100') {
        defaultColumn = 'Number_of_occurrences_in_6_replicates_in_zs8';
    } else if (species === '20240621_ES2_qCLASH_h49toh54') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_Ovcar8_qCLASH_h55toh60') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_H1299_qCLASH_h61toh66') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_Mel501_qCLASH_h67toh72') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20240621_HepG2_qCLASH_h73toh75') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_wt';
    } else if (species === '20240621_D425_qCLASH_h76toh78') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_wt';
    } else if (species === '20240621_liver_qCLASH_h79') {
        defaultColumn = 'Normalized_abundance_1_liver_cancer_tissue';
    } else if (species === '20240911_TIVE_qCLASH_h80toh82') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_wt';
    } else if (species === '20240911_Huh75_qCLASH_h83toh94') {
        defaultColumn = 'Number_of_occurrences_in_12_replicates_wt';
    } else if (species === '20240628_Celegans_eCLIP_S1tohS10') {
        defaultColumn = 'Number_of_occurrences_in_4_replicates_ebax_knockout';
    } else if (species === '20240701_DrosophilaS2_qCLASH_d1tod6') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_zswim8_KO';
    } else if (species === '20241022_MouseStriatal_eCLIP_m1tom8') {
        defaultColumn = 'Number_of_occurrences_in_4_replicates_in_zs8';
    } else if (species === '20240813_mouse_eCLIP_m9_to_m12') {
        defaultColumn = 'Number_of_occurrences_in_2_replicates_zswim8_KO';
    } else if (species === '20240813_mouse_eCLIP_m13tom14') {
        defaultColumn = 'Number_of_occurrences_in_2_replicates_wt';
    } else if (species === '20240813_mouse_eCLIP_m15tom16') {
        defaultColumn = 'Number_of_occurrences_in_2_replicates_wt';
    } else if (species === '20240912_MouseCortex_qCLASH_m17tom32') {
        defaultColumn = 'Number_of_occurrences_in_16_replicates_wt';
    } else if (species === '20240912_MouseHE21b_CLEARCLIP_m33tom38') {
        defaultColumn = 'Number_of_occurrences_in_6_replicates_wt';
    } else if (species === '20240912_Mouse3T12_CLEARCLIP_m39tom41') {
        defaultColumn = 'Number_of_occurrences_in_3_replicates_wt';
    }

    if (defaultColumn) {
        currentSort.columns = [defaultColumn];
        currentSort.orders = [defaultOrder];
        sortTable(currentSort.columns, currentSort.orders);
        updateSortIndicators();
    }
}

/**
 * 下载表格为 CSV
 */
function downloadTableAsCSV() {
    var headerRow = document.querySelectorAll("#dataContainer table thead tr th");
    var header = [];
    for (var h = 0; h < headerRow.length; h++) {
        if (headerRow[h].innerText === 'Pairing Pattern (UNAfold)') {
            // 如果表头是 Pairing Pattern (UNAfold)，将其拆分成三列
            header.push('miRNA sequence', 'Pairing Pattern', 'target sequence');
        } else {
            // 其他列正常添加到 CSV 头部
            header.push(headerRow[h].innerText);
        }
    }
           
    var csvContent = header.map(item => `"${item}"`).join(",") + "\n";

    for (var i = 0; i < allRows.length; i++) {
        var row = [];
        var cols = $(allRows[i]).find("td, th"); // 获取当前行的所有单元格
    
        for (var j = 0; j < cols.length; j++) {
            if (headerRow[j].innerText === 'Pairing Pattern (UNAfold)') { 
                // 提取 miRNA 序列：去掉 "miRNA:  5' " 并去除特殊字符
                var miRNA_seq = $(cols[j]).find(".miRNA-seq").text()
                    .replace(/[\u00AC\u202F\u00A0]/g, "") // 去掉特殊字符 ¬†、非断空格等
                    .replace("miRNA: 5'", "") // 去掉固定前缀
                    .trim(); // 可选：去除首尾空格
            
                // 提取配对模式：去掉前面11个空格
                var base_pattern = $(cols[j]).find(".match-lines:nth-child(2)").text()
                    .slice(11);
            
                // 提取 target 序列：去掉 "target: 3' " 并去除特殊字符
                var target_seq = $(cols[j]).find(".target-seq").text()
                    .replace(/[\u00AC\u202F\u00A0]/g, "") // 去掉特殊字符 ¬†、非断空格等
                    .replace("target: 3'", "")
                    .trim(); // 可选：去除首尾空格
            
                // 添加到 CSV 行
                row.push(`"${miRNA_seq}"`, `"${base_pattern}"`, `"${target_seq}"`);
            } else {
                // 其他列正常添加
                row.push(`"${cols[j].innerText.trim()}"`);
            }
        }
        csvContent += row.join(",") + "\n"; // 拼接成 CSV 格式
    }

    var csvFile = new Blob([csvContent], { type: "text/csv" });

    var downloadLink = document.createElement("a");

    // 获取搜索词和细胞系名称作为文件名的一部分
    var searchTerm = getUrlParameter('index_CLASH_name');
    var cellLineText = getUrlParameter('CLASH_CellLine_text'); // 获取细胞系的显示文本

    if (searchTerm && cellLineText) {
        // 对搜索词和细胞系名称进行编码，避免特殊字符影响文件名
        var encodedSearchTerm = encodeURIComponent(searchTerm).replace(/%20/g, '_');
        var encodedCellLine = encodeURIComponent(cellLineText).replace(/%20/g, '_');
        downloadLink.download = `clash_search_${encodedSearchTerm}_in_${encodedCellLine}.csv`;
    } else if (searchTerm) {
        var encodedSearchTerm = encodeURIComponent(searchTerm).replace(/%20/g, '_');
        downloadLink.download = `clash_search_${encodedSearchTerm}.csv`;
    } else {
        downloadLink.download = "clash_table.csv";
    }

    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";

    document.body.appendChild(downloadLink);

    downloadLink.click();

    document.body.removeChild(downloadLink);
}