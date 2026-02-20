$(document).ready(function() {
    // 定义不同 species 和 data_type 对应的选项
    const options = {
        "Human": {
            "CLASH": [            
                { value: "CLASH_Human_Consensus_Final", text: "All Human Sources" },
                { value: "CLASH_human_A549_Expanded", text: "A549" },
                { value: "CLASH_human_D425_Expanded", text: "D425" },
                { value: "CLASH_human_ES2_Expanded", text: "ES2" },
                { value: "CLASH_human_HCT116", text: "HCT116" }, 
                { value: "CLASH_human_HEK293T_Expanded", text: "HEK293T" },
                { value: "CLASH_human_HepG2_Expanded", text: "HepG2" },
                { value: "CLASH_human_H1299_Expanded", text: "H1299" },
                { value: "CLASH_human_MB002_Expanded", text: "MB002" },
                { value: "CLASH_human_MDAMB231_Expanded", text: "MDA-MB-231" },
                { value: "CLASH_human_Ovcar8_Expanded", text: "OVCAR8" },
                { value: "CLASH_human_TIVE", text: "TIVE" },
                { value: "CLASH_human_T98G_Expanded", text: "T98G" },
                { value: "CLASH_human_U87MG_Expanded", text: "U87MG" },
                { value: "CLASH_human_501Mel_Expanded", text: "501Mel" },
                { value: "CLASH_human_Colorectal_tissue", text: "Colorectal Tissue" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "Mouse": {
            "CLASH": [
                { value: "CLASH_Mouse_Consensus_Final", text: "All Mouse Sources" },
                { value: "CLASH_mouse_HE2_1B", text: "HE2.1 B" }, 
                { value: "CLASH_mouse_MEF_Expanded", text: "MEF" },
                { value: "CLASH_mouse_Striatal_Cell_Expanded", text: "Striatal cell" },
                { value: "CLASH_mouse_3T12", text: "3T12" },
                { value: "CLASH_mouse_Cortex", text: "Cortex tissue" },
                { value: "CLASH_mouse_Heart_Expanded", text: "Heart tissue" },
                { value: "CLASH_mouse_Kidney_Expanded", text: "Kidney tissue" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "D.melanogaster": {
            "CLASH": [
                { value: "CLASH_Drosophila_S2_Expanded", text: "S2" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "C.elegans": {
            "CLASH": [
                { value: "CLASH_Celegans_Consensus_Final", text: "All C. elegans Stages" },
                { value: "CLASH_Celegans_Embryo_Expanded", text: "Embryo" },
                { value: "CLASH_Celegans_L4_Expanded", text: "L4 stage" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        }
    };

    // === 新增：统一填充 CLASH_CellLine 的函数（修复返回后不刷新的问题） ===
    function populateCellLines() {
        const selectedSpecies = $('#species').val();
        const selectedDataType = $('#data_type').val();

        // 同步隐藏字段
        if (selectedDataType === 'CLASH') {
            $('#clash_species_hidden').val(selectedSpecies || '');
        } else if (selectedDataType === 'RNA-seq') {
            $('#gene_species_hidden').val(selectedSpecies || '');
        } else if (selectedDataType === 'miRNA-seq') {
            $('#mirna_species_hidden').val(selectedSpecies || '');
        }

        // 只有在 CLASH + 已选择物种 时才填充 cell lines
        if (selectedDataType !== 'CLASH') return;

        $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>');

        if (!selectedSpecies) {
            $('#CLASH_CellLine').prop('disabled', false);
            try { $('#clash_help').hide(); } catch (e) {}
            return;
        }

        const cellLines = (options[selectedSpecies] && options[selectedSpecies]['CLASH']) ? options[selectedSpecies]['CLASH'] : [];

        // C.elegans 特殊处理保持不变
        if (selectedSpecies === 'C.elegans') {
            $.each(cellLines, function(index, cellLine) {
                const option = $('<option></option>')
                    .attr('value', cellLine.value)
                    .text(cellLine.text);
                $('#CLASH_CellLine').append(option);
            });
            // 新增：尽量恢复上次选择
            try {
                const storedSpecies = sessionStorage.getItem('species');
                const storedType = sessionStorage.getItem('data_type');
                const preferredVal = (storedSpecies === selectedSpecies && storedType === 'CLASH') ? sessionStorage.getItem('clash_cellline_value') : null;
                if (preferredVal) {
                    $('#CLASH_CellLine').val(preferredVal);
                }
                // 同步隐藏文本
                $('#CLASH_CellLine_text').val($('#CLASH_CellLine option:selected').text());
            } catch (e) {}
            $('#CLASH_CellLine').prop('disabled', false);
            try { $('#clash_help').hide(); } catch (e) {}
            return;
        }

        // 常规填充
        if (cellLines && cellLines.length > 0) {
            $.each(cellLines, function(index, cellLine) {
                $('#CLASH_CellLine').append(
                    $('<option></option>').attr('value', cellLine.value).text(cellLine.text)
                );
            });
            // 新增：尽量恢复上次选择
            try {
                const storedSpecies = sessionStorage.getItem('species');
                const storedType = sessionStorage.getItem('data_type');
                const preferredVal = (storedSpecies === selectedSpecies && storedType === 'CLASH') ? sessionStorage.getItem('clash_cellline_value') : null;
                if (preferredVal) {
                    $('#CLASH_CellLine').val(preferredVal);
                }
                // 同步隐藏文本
                $('#CLASH_CellLine_text').val($('#CLASH_CellLine option:selected').text());
            } catch (e) {}
            $('#CLASH_CellLine').prop('disabled', false);
            try { $('#clash_help').hide(); } catch (e) {}
        } else {
            $('#CLASH_CellLine').prop('disabled', true);
            try { $('#clash_help').show(); } catch (e) {}
        }
    }

    // 自动补全功能
    function setupAutocomplete(inputSelector, phpScript) {
        $.ajax({
            url: phpScript,
            type: 'HEAD',
            error: function() {
                console.warn('Warning: ' + phpScript + ' not found. Skipping autocomplete setup.');
            },
            success: function() {
                $(inputSelector).autocomplete({
                    source: function(request, response) {
                        const species = $('#species').val();  // 获取当前物种
                        const dataType = $('#data_type').val();  // 获取当前数据类型

                        $.ajax({
                            url: phpScript,
                            dataType: 'json',
                            data: {
                                autocomplete: true,
                                term: request.term,
                                species: species, // 传递 species 参数
                                data_type: dataType // 传递 data_type 参数
                            },
                        success: function(data) {
                            response(data);
                            // 记录本次候选，用于后续精确匹配判断（兼容 string / {value,label} 两种返回）
                            try {
                                const list = (Array.isArray(data) ? data : []).map(function(x){
                                    if (typeof x === 'string') return x;
                                    if (x && typeof x === 'object') return x.value || x.label || '';
                                    return '';
                                }).filter(Boolean);
                                $(inputSelector).data('suggestions', list);
                            } catch (e) {}
                        },
                            error: function(xhr, status, error) {
                                console.error('Error fetching autocomplete data:', error);
                            }
                        });
                    },
                    minLength: 3, // 最小输入长度
                    select: function(event, ui) {
                        $(inputSelector).val(ui.item.value); // 在选择项目时设置输入框的值
                        // 新增：标记为“来自下拉选择”，用于回车校验
                        $(inputSelector).data('selected-from-menu', true);
                        return false;
                    }
                });
                // 新增：用户手动输入时，重置“来自下拉选择”标记
                $(inputSelector).on('input', function() {
                    $(this).data('selected-from-menu', false);
                });

                // 新增：当下拉菜单展开且未选择具体项时，拦截 Enter，避免误提交
                $(inputSelector).on('keydown', function(e) {
                    if (e.keyCode === 13) { // Enter
                        try {
                            const menuOpen = $(this).autocomplete('widget').is(':visible');
                            const picked = $(this).data('selected-from-menu');
                            if (menuOpen && !picked) {
                                e.preventDefault();
                                e.stopPropagation();
                                return false;
                            }
                        } catch (err) {}
                    }
                });
                // 新增：失焦时如果当前值与最后一次选择不一致，也视为未选择
                $(inputSelector).on('blur', function() {
                    const picked = $(this).data('selected-from-menu');
                    if (!picked) return; // 没选过就不用比对
                    const lastPicked = $(this).val();
                    // 简化：若用户在选择后又修改了输入，input 事件已把标记置为 false；这里不再额外处理
                });
            }
        });
    }

    function isExactToSuggestions($input) {
        const v = ($input.val() || '').trim().toLowerCase();
        if (!v) return false;
        const list = $input.data('suggestions') || [];
        for (var i = 0; i < list.length; i++) {
            if ((list[i] || '').toLowerCase() === v) return true;
        }
        return false;
    }

    // CLASH 补全
    setupAutocomplete('#index_CLASH_name', '/Index_php/Clash_name.php');

    // RNA-seq 补全
    setupAutocomplete('#TargetAbundance_GeneName', '/Index_php/target_name.php');

    // Persist gene name input for back navigation
    $('#TargetAbundance_GeneName').on('input change', function () {
        try { sessionStorage.setItem('gene_name_input', ($(this).val() || '')); } catch (e) {}
    });

    // 新增：持久化 CLASH 名称输入
    $('#index_CLASH_name').on('input change', function () {
        try { sessionStorage.setItem('clash_name_input', ($(this).val() || '')); } catch (e) {}
    });
    // miRNA-seq 补全
    setupAutocomplete('#mirnaAbundance_name', '/Index_php/miRNA_name.php');
    // [新增] 记录 miRNA 名称输入，便于后退恢复
    $('#mirnaAbundance_name').on('input change', function () {
        try { sessionStorage.setItem('mirna_name_input', ($(this).val() || '')); } catch (e) {}
    });

    // 新增代码开始：控制表单的显示和隐藏
    // 初始时仅显示 CLASH 表单，隐藏其他表单
    $('#index_searchForm').show();
    $('#TargetAbundance_GeneSearchForm').hide();
    $('#mirnaAbundance_searchForm').hide();

    // 初始化 Step 3 下拉菜单为可用状态，并添加默认选项
    $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>').prop('disabled', false);

    // 监听 Step 1 的选择变化
    $('#data_type').change(function() {
        const selected = $(this).val();

        // 新增：记住 data_type（用于返回后恢复选择）
        try { sessionStorage.setItem('data_type', selected); } catch (e) {}

        // 重置所有表单
        $('#index_searchForm')[0].reset();
        $('#TargetAbundance_GeneSearchForm')[0].reset();
        $('#mirnaAbundance_searchForm')[0].reset();

        // 重置 Step 3 下拉菜单
        $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>').prop('disabled', false);
        $('#clash_help').hide(); // 隐藏提示信息

        // 重置隐藏字段
        $('#clash_species_hidden').val('');
        $('#gene_species_hidden').val('');
        $('#mirna_species_hidden').val('');

        if(selected === 'CLASH') {
            // 显示 CLASH 表单
            $('#index_searchForm').show();
            // 隐藏其他表单
            $('#TargetAbundance_GeneSearchForm').hide();
            $('#mirnaAbundance_searchForm').hide();

            // 新增：切回 CLASH 时若已有 species，立刻填充一次
            populateCellLines();
            (function(){
                const v = ($('#index_CLASH_name').val() || '').trim();
                if (v) $('#index_CLASH_name').data('selected-from-menu', true);
            })();
        } else if(selected === 'RNA-seq') {
            // 显示 RNA-seq 表单
            $('#index_searchForm').hide();
            $('#TargetAbundance_GeneSearchForm').show();
            $('#mirnaAbundance_searchForm').hide();
            // [新增] 如果已恢复值，标记为有效选择（Gene）
            (function(){
                const v = ($('#TargetAbundance_GeneName').val() || '').trim();
                if (v) $('#TargetAbundance_GeneName').data('selected-from-menu', true);
            })();
        } else if(selected === 'miRNA-seq') {
            // 显示 miRNA-seq 表单
            $('#index_searchForm').hide();
            $('#TargetAbundance_GeneSearchForm').hide();
            $('#mirnaAbundance_searchForm').show();
        } else {
            // 如果未选择任何选项，默认显示 CLASH 表单
            $('#index_searchForm').show();
            $('#TargetAbundance_GeneSearchForm').hide();
            $('#mirnaAbundance_searchForm').hide();
        }
    });

    // 新增：缓存 species，并在物种变化时清理旧的 cell line 选择
    $('#species').change(function() {
        const prevSpecies = (function(){ try { return sessionStorage.getItem('species'); } catch(e) { return null; } })();
        const selectedSpecies = $(this).val();
        try { sessionStorage.setItem('species', selectedSpecies || ''); } catch (e) {}
        if (prevSpecies && prevSpecies !== selectedSpecies) {
            try {
                sessionStorage.removeItem('clash_cellline_value');
                sessionStorage.removeItem('clash_cellline_text');
            } catch (e) {}
        }
        populateCellLines();
    });

    // 监听表单提交，确保隐藏字段被正确设置
    $('form').submit(function(event) {
        const formId = $(this).attr('id');
        const selectedSpecies = $('#species').val();

        // ✅ 新增：CLASH 需要精确选择 miRNA/gene 名称，并强制选择细胞系
        if (formId === 'index_searchForm') {
            const $clashInput = $('#index_CLASH_name');
            const val = ($clashInput.val() || '').trim();
            const picked = $clashInput.data('selected-from-menu') === true;
            const looksFull = /\|/.test(val); // 若 CLASH 的完整项含“|”，与 Gene 规则保持一致
            const exactToList = isExactToSuggestions($clashInput);

            if (!picked && !looksFull && !exactToList) {
                event.preventDefault();
                alert('Please select a specific miRNA/gene from the dropdown or type the full name.');
                return false;
            }
            // 记住 CLASH 名称用于后退恢复
            try { sessionStorage.setItem('clash_name_input', val); } catch (e) {}

            // 必须选择一个 CLASH cell line
            const cl = $('#CLASH_CellLine').val();
            if (!cl) {
                event.preventDefault();
                alert('Please select a CLASH cell line.');
                return false;
            }
        }

        // 新增：Gene Expression 需要用户从下拉中选择完整项，或键入包含“|”的完整名称，或恢复的完整值
        if (formId === 'TargetAbundance_GeneSearchForm') {
            const $geneInput = $('#TargetAbundance_GeneName');
            const val = ($geneInput.val() || '').trim();
            const picked = $geneInput.data('selected-from-menu') === true;
            const looksFull = /\|/.test(val);
            const exactToList = isExactToSuggestions($geneInput);
            if (!picked && !looksFull && !exactToList) {
                event.preventDefault();
                alert('Please select a specific gene from the dropdown or type the full name.');
                return false;
            }
            // Remember gene name for back navigation
            try { sessionStorage.setItem('gene_name_input', val); } catch (e) {}
        }

        if (formId === 'mirnaAbundance_searchForm') {
            const $miInput = $('#mirnaAbundance_name');
            const val = ($miInput.val() || '').trim();
            const picked = $miInput.data('selected-from-menu') === true;
            const exactToList = isExactToSuggestions($miInput);

            if (!picked && !exactToList) {
                event.preventDefault();
                alert('Please select a microRNA from the dropdown or type the full name.');
                return false;
            }
            try { sessionStorage.setItem('mirna_name_input', val); } catch (e) {}
}

        if(formId === 'index_searchForm') {
            $('#clash_species_hidden').val(selectedSpecies);
        } else if(formId === 'TargetAbundance_GeneSearchForm') {
            $('#gene_species_hidden').val(selectedSpecies);
        } else if(formId === 'mirnaAbundance_searchForm') {
            $('#mirna_species_hidden').val(selectedSpecies);
        }
    });
    $('#CLASH_CellLine').change(function() {
        var selectedOption = $(this).find('option:selected');
        var cellLineText = selectedOption.text();
        // 将所选细胞系名称写入隐藏字段中
        $('#CLASH_CellLine_text').val(cellLineText);
        // 新增：缓存选择的细胞系，便于返回后恢复
        try {
            sessionStorage.setItem('clash_cellline_value', $(this).val() || '');
            sessionStorage.setItem('clash_cellline_text', cellLineText || '');
        } catch (e) {}
    });

    // [新增] 点击“Database”或顶部 CLASH Logo（都指向 index.html）时，清理会话状态，回到初始页面
    $('a[href="index.html"]').on('click', function() {
        try {
            ['data_type', 'species', 'gene_name_input', 'clash_name_input', 'clash_cellline_value', 'clash_cellline_text'].forEach(function(k){
                sessionStorage.removeItem(k);
            });
        } catch (e) {}
        // 不阻止默认跳转
    });

    // 新增：初次加载或刷新/后退时，如果是 CLASH 且已有 species，自动填充
    if ($('#data_type').val() === 'CLASH' && $('#species').val()) {
        populateCellLines();
    }
    try {
        if ($('#data_type').val()) sessionStorage.setItem('data_type', $('#data_type').val());
        if ($('#species').val()) sessionStorage.setItem('species', $('#species').val());
    } catch (e) {}

    // Restore state on back/forward navigation (bfcache)
    window.addEventListener('pageshow', function() {
        try {
            const storedType = sessionStorage.getItem('data_type');
            const storedSpecies = sessionStorage.getItem('species');
            const storedGene = sessionStorage.getItem('gene_name_input');
            if (storedType === 'RNA-seq') {
                if (storedSpecies) $('#species').val(storedSpecies);
                $('#data_type').val('RNA-seq').trigger('change'); // reuse existing visibility logic
                if (storedSpecies) $('#gene_species_hidden').val(storedSpecies);
                if (storedGene) $('#TargetAbundance_GeneName').val(storedGene);
            } else if (storedType === 'miRNA-seq') {
                if (storedSpecies) $('#species').val(storedSpecies);
                $('#data_type').val('miRNA-seq').trigger('change');
                if (storedSpecies) $('#mirna_species_hidden').val(storedSpecies);
                const storedMi = sessionStorage.getItem('mirna_name_input');
                if (storedMi) $('#mirnaAbundance_name').val(storedMi);
            } else if (storedType === 'CLASH') {
                // Keep original CLASH behavior
                if ($('#data_type').val() !== 'CLASH') $('#data_type').val('CLASH').trigger('change');
                if ($('#species').val()) populateCellLines();

                // ✅ 新增：恢复 CLASH 名称，并标记为“已选中”
                const storedClash = sessionStorage.getItem('clash_name_input');
                if (storedClash) {
                    $('#index_CLASH_name').val(storedClash);
                    $('#index_CLASH_name').data('selected-from-menu', true);
                }
            }
        } catch (e) {
            // no-op
        }
    });

}); 