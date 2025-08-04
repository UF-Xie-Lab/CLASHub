$(document).ready(function() {
    // 定义不同 species 和 data_type 对应的选项
    const options = {
        "Human": {
            "CLASH": [
                { value: "20241022_A549_eCLIP_qCLASH_h43toh48_h95toh100", text: "A549" },
                { value: "20240621_D425_qCLASH_h76toh78", text: "D425" },
                { value: "20240621_ES2_qCLASH_h49toh54", text: "ES2" },
                { value: "20240621_HCT116_qCLASH_h9toh16", text: "HCT116" },
                { value: "20240619_293t_eclip_h1toh8", text: "HEK293T" },
                { value: "20240621_HepG2_qCLASH_h73toh75", text: "HepG2" },
                { value: "20240911_Huh75_qCLASH_h83toh94", text: "Huh-7.5" },
                { value: "20240621_H1299_qCLASH_h61toh66", text: "H1299" },
                { value: "20240621_liver_qCLASH_h79", text: "Liver tissue" },
                { value: "20240621_MB002_qCLASH_h17toh24", text: "MB002" },
                { value: "20241022_MDAMB231_eCLIP_qCLASH_h437toh42_h101toh106", text: "MDA-MB-231" },
                { value: "20240621_Ovcar8_qCLASH_h55toh60", text: "OVCAR8" },
                { value: "20240911_TIVE_qCLASH_h80toh82", text: "TIVE-EX-LTC" },
                { value: "20240621_T98G_qCLASH_h31toh36", text: "T98G" },
                { value: "20240621_U87MG_qCLASH_h25toh30", text: "U87MG" },
                { value: "20240621_Mel501_qCLASH_h67toh72", text: "501Mel" }],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "Mouse": {
            "CLASH": [
                { value: "20240912_MouseHE21b_CLEARCLIP_m33tom38", text: "HE2.1 B" },
                { value: "20240813_mouse_eCLIP_m9_to_m12", text: "MEF" },
                { value: "20241022_MouseStriatal_eCLIP_m1tom8", text: "Striatal cell" },
                { value: "20240912_Mouse3T12_CLEARCLIP_m39tom41", text: "3T12" },
                { value: "20240912_MouseCortex_qCLASH_m17tom32", text: "Cortex tissue" },
                { value: "20240813_mouse_eCLIP_m13tom14", text: "Heart tissue" },
                { value: "20240813_mouse_eCLIP_m15tom16", text: "Kidney tissue" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "D.melanogaster": {
            "CLASH": [
                { value: "20240701_DrosophilaS2_qCLASH_d1tod6", text: "S2" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        },
        "C.elegans": {
            "CLASH": [
                { value: "20240628_Celegans_eCLIP_S1tohS10", text: "Embryo" },
                { value: "alg1_l3_c11toc17_20250801", text: "L3 stage" },
                { value: "alg_1_mid_l4_c18toc22_20250801", text: "mid L4 stage" }
            ],
            "RNA-seq": [],
            "miRNA-seq": []
        }
    };

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
                            },
                            error: function(xhr, status, error) {
                                console.error('Error fetching autocomplete data:', error);
                            }
                        });
                    },
                    minLength: 3, // 最小输入长度
                    select: function(event, ui) {
                        $(inputSelector).val(ui.item.value); // 在选择项目时设置输入框的值
                        return false;
                    }
                });
            }
        });
    }

    // CLASH 补全
    setupAutocomplete('#index_CLASH_name', '/Index_php/Clash_name.php');

    // RNA-seq 补全
    setupAutocomplete('#TargetAbundance_GeneName', '/Index_php/target_name.php');

    // miRNA-seq 补全
    setupAutocomplete('#mirnaAbundance_name', '/Index_php/miRNA_name.php');

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
        } else if(selected === 'RNA-seq') {
            // 显示 RNA-seq 表单
            $('#index_searchForm').hide();
            $('#TargetAbundance_GeneSearchForm').show();
            $('#mirnaAbundance_searchForm').hide();
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

    // 监听 Species 的选择变化
    $('#species').change(function() {
        const selectedSpecies = $(this).val();
        const selectedDataType = $('#data_type').val();

        // 根据当前选择的数据类型，设置对应的隐藏字段
        if(selectedDataType === 'CLASH') {
            $('#clash_species_hidden').val(selectedSpecies);
        } else if(selectedDataType === 'RNA-seq') {
            $('#gene_species_hidden').val(selectedSpecies);
        } else if(selectedDataType === 'miRNA-seq') {
            $('#mirna_species_hidden').val(selectedSpecies);
        }

        // if(selectedDataType === 'CLASH' && selectedSpecies) {   
        //     const cellLines = options[selectedSpecies][selectedDataType];
        // the above code temperory not use
        
        if (selectedDataType === 'CLASH' && selectedSpecies) {
            if (selectedSpecies === "C.elegans") {
                const cellLines = options[selectedSpecies][selectedDataType];

                $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>');

                $.each(cellLines, function(index, cellLine) {
                    const option = $('<option></option>')
                        .attr('value', cellLine.value)
                        .text(cellLine.text);

                    // 如果是 Embryo 项，设置为 disabled
                    if (cellLine.value === "20240628_Celegans_eCLIP_S1tohS10") {
                        option.attr('disabled', true)
                            .text(cellLine.text + " (Unavailable – awaiting collaborator publication)");
                    }

                    $('#CLASH_CellLine').append(option);
                });

                $('#CLASH_CellLine').prop('disabled', false);
                $('#clash_help').hide();
                return;
            }

            const cellLines = options[selectedSpecies][selectedDataType];

            // 清空并填充 CLASH_CellLine 下拉菜单
            $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>');

            if(cellLines && cellLines.length > 0) {
                $.each(cellLines, function(index, cellLine) {
                    $('#CLASH_CellLine').append(
                        $('<option></option>').attr('value', cellLine.value).text(cellLine.text)
                    );
                });
                $('#CLASH_CellLine').prop('disabled', false);
                $('#clash_help').hide();
            } else {
                // 如果没有对应的 cell lines，禁用下拉菜单并显示提示
                $('#CLASH_CellLine').prop('disabled', true);
                $('#clash_help').show();
            }
        } else if(selectedDataType === 'CLASH' && !selectedSpecies) {
            // 如果未选择 species，保持下拉菜单可用但只显示默认选项
            $('#CLASH_CellLine').empty().append('<option value="">-- Select --</option>').prop('disabled', false);
            $('#clash_help').hide(); // 隐藏提示信息
        }
    });

    // 监听表单提交，确保隐藏字段被正确设置
    $('form').submit(function(event) {
        const formId = $(this).attr('id');
        const selectedSpecies = $('#species').val();

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
    });

    // 新增代码结束
});