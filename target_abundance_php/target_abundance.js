const urlParams = new URLSearchParams(window.location.search);
const geneName = urlParams.get('TargetAbundance_GeneName');
const species = urlParams.get('gene_species_hidden'); // 获取target_species_hidden参数
console.log('gene Name from URL:', geneName);
console.log('Species from URL:', species);
const canvas = document.getElementById('geneChart');
const ctx = canvas.getContext('2d');

document.getElementById('downloadCSV').addEventListener('click', function () {
    if (geneName && species) {
        fetchGeneData(geneName, species)
            .then(data => downloadGeneCSV(data, geneName))
            .catch(error => console.error('Error downloading CSV:', error));
    } else {
        console.error('Gene name or species not specified');
    }
});

function downloadGeneCSV(data, geneName) {
    // 1. New Header: Includes Sample ID and explicit Value column
    const rows = [['Cell Line / Tissue', 'Sample ID', 'Expression Value (TPM)']]; 

    // 2. Populate rows with detailed info
    // We loop through each Tissue, then loop through each Replicate inside it
    Object.keys(data.data).forEach(tissue => {
        const values = data.data[tissue];      // e.g. [74.54, 70.69...]
        const srrIDs = data.tissues[tissue];   // e.g. ['SRR285...', 'SRR285...']

        if (values && srrIDs) {
            values.forEach((val, index) => {
                // Get the specific SRR Name for this value (or 'N/A' if missing)
                const sampleID = srrIDs[index] || 'N/A'; 
                
                // Push a distinct row for every single sample
                rows.push([tissue, sampleID, val]);
            });
        }
    });

    // 3. Convert rows to CSV string
    const csvContent = rows.map(e => e.join(',')).join('\n');

    // 4. Create a downloadable link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${geneName}_expression_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    if (geneName && species) {
        fetchGeneData(geneName, species).then(data => {
            console.log('Fetched Data:', data.data);

            // Call the appropriate function based on the species
            switch (species) {
                case 'Mouse':
                    createGeneChart_mouse(data, geneName);
                    break;
                case 'Human':
                    createGeneChart_human(data, geneName);
                    break;
                case 'D.melanogaster':
                    createGeneChart_dmelanogaster(data, geneName);
                    break;
                case 'C.elegans':
                    createGeneChart_celegans(data, geneName);
                    break;
                default:
                    console.error('Species not supported:', species);
            }
        }).catch(error => {
            console.error('Error fetching gene data:', error);
        });
    } else {
        console.error('No TargetAbundance_GeneName or species parameter found in URL');
    }
});

function fetchGeneData(geneName, species) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'target_abundance_php/target_abundance.php',
            method: 'GET',
            data: { 
                TargetAbundance_GeneName: geneName,
                species: species // 将species参数传递给PHP
            },
            success: function(response) {
                try {
                    const data = (typeof response === 'string') ? JSON.parse(response) : response;

                    if (data.error) {
                        reject(data.error);
                    } else if (!data.geneFound) {
                        reject('Gene not found: ' + geneName);
                    } else {
                        resolve(data);
                    }
                } catch (error) {
                    reject('Failed to parse response: ' + error.message + ' Response was: ' + response);
                }
            },
            error: function(xhr, status, error) {
                reject('AJAX error: ' + error);
            }
        });
    });
}

function createGeneChart_mouse(data, geneName) {
    // 1. Setup Canvas
    const ctx = document.getElementById('geneChart').getContext('2d');
    
    if (window.myGeneChart) {
        window.myGeneChart.destroy();
    }

    // 2. Prepare Data
    const labels = Object.keys(data.data);
    
    const barData = labels.map(label => {
        const values = data.data[label];
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const scatterData = [];
    labels.forEach(label => {
        const values = data.data[label];
        const tissueLabels = data.tissues[label] || [];
        values.forEach((value, index) => {
            scatterData.push({ 
                x: label, 
                y: value, 
                tissueLabel: tissueLabels[index] || 'N/A' 
            });
        });
    });

    // 3. Colors
    const baseColors = [
        'rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)', 'rgba(83, 102, 255, 0.5)', 'rgba(120, 159, 64, 0.5)',
        'rgba(255, 99, 255, 0.5)', 'rgba(0, 100, 132, 0.5)', 'rgba(200, 200, 132, 0.5)',
        'rgba(128, 128, 128, 0.5)'
    ];
    const backgroundColors = labels.map((_, i) => baseColors[i % baseColors.length]);
    const borderColors = labels.map((_, i) => baseColors[i % baseColors.length].replace('0.5', '1'));

    // 4. Create Chart
    window.myGeneChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average',
                    data: barData,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                },
                {
                    type: 'scatter',
                    label: 'Replicates',
                    data: scatterData,
                    backgroundColor: 'rgba(50, 50, 50, 0.6)',
                    pointRadius: 3
                }
            ]
        },
        options: {
            // 1. ADD TOP PADDING (Creates a safe zone for Title + Legend)
            layout: { 
                padding: { 
                    top: 0,   
                    bottom: 100 
                } 
            }, 
            plugins: {
                title: { display: true, text: geneName, font: { size: 20 } },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        // FIX: Hide the default title to prevent incorrect group labels
                        title: function() {
                            return ''; 
                        },
                        label: function(context) {
                            if (context.dataset.type === 'scatter') {
                                return `${context.raw.y.toFixed(2)}, ${context.raw.tissueLabel}`;
                            }
                            return `Average: ${context.raw.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { display: false } 
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'TPM Expression Level', font: { size: 16 } }
                }
            }
        },
        plugins: [{
            id: 'custom-mouse-labels',
            afterDraw: chart => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yBottom = chart.scales.y.bottom;
                
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = 'black';
                ctx.font = '12px Arial';

                // --- Draw Labels Under Bars ---
                for (let i = 0; i < labels.length; i++) {
                    const label = labels[i];
                    const nextLabel = labels[i + 1];
                    const x = xAxis.getPixelForTick(i);

                    // CASE 1: Striatal Group
                    if (label === 'Striatal_HD_Het_sgNT') {
                        drawBracket(ctx, xAxis.getPixelForTick(i), xAxis.getPixelForTick(i+1), yBottom, 'sgNT', 'Z8', 'HD-Het');
                        drawBracket(ctx, xAxis.getPixelForTick(i+2), xAxis.getPixelForTick(i+3), yBottom, 'sgNT', 'Z8', 'HD-Hom');
                        drawLine(ctx, xAxis.getPixelForTick(i), xAxis.getPixelForTick(i+3), yBottom + 38);
                        ctx.fillText('Striatal Cell', (xAxis.getPixelForTick(i) + xAxis.getPixelForTick(i+3))/2, yBottom + 43);
                        i += 3; 
                        continue;
                    }

                    // CASE 2: Zswim8 Pairs
                    if (label.endsWith('_Zswim8_Het') && nextLabel && nextLabel === label.replace('_Het', '_KO')) {
                        const xNext = xAxis.getPixelForTick(i + 1);
                        const tissueName = label.replace('_Zswim8_Het', ''); 

                        ctx.fillText('+/-', x, yBottom + 5);
                        ctx.fillText('-/-', xNext, yBottom + 5);
                        drawLine(ctx, x, xNext, yBottom + 20);
                        ctx.fillText(tissueName, (x + xNext) / 2, yBottom + 25);
                        i++; 
                        continue;
                    }

                    // CASE 3: Standard Single Tissues
                    ctx.save();
                    ctx.translate(x, yBottom + 10);
                    ctx.rotate(-45 * Math.PI / 180);
                    ctx.textAlign = 'right';
                    ctx.fillText(label.replace('_', ' '), 0, 0);
                    ctx.restore();
                }

                // --- NEW LEGEND POSITION ---
                const annotationX = chart.width - 20;
                let legendY = 45; 

                ctx.textAlign = 'right';
                ctx.fillStyle = '#444'; 
                ctx.font = '14px Arial'; 

                // Line 1: Striatal Explanations
                ctx.fillText('Striatal: sgNT = Non-targeting | Z8 = Zswim8 KO', annotationX, legendY);

                // Line 2: Tissue Genotype Explanations
                ctx.fillText('Tissues: +/- = Zswim8 Het | -/- = Zswim8 KO', annotationX, legendY + 20);

                // --- Optimized Data Source Alignment ---
                ctx.save();
                ctx.textAlign = 'left'; 
                ctx.fillStyle = '#666';
                ctx.font = '12px Arial';

                const sourceX = chart.scales.y.left; 
                const sourceY = yBottom + 85; 

                ctx.fillText('Data Source: GSE231447, GSE239373, PRJNA1166120', sourceX, sourceY);
                ctx.restore();
            }
        }]
    });
}

// --- Helper Functions ---
function drawLine(ctx, x1, x2, y) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
}

function drawBracket(ctx, x1, x2, y, label1, label2, groupLabel) {
    ctx.fillText(label1, x1, y + 5);
    ctx.fillText(label2, x2, y + 5);
    drawLine(ctx, x1, x2, y + 20);
    ctx.fillText(groupLabel, (x1 + x2) / 2, y + 25);
}

function createGeneChart_human(data, geneName) {
    console.log('Data:', data.data);
    console.log('Tissues:', data.tissues);
    
    const labels = Object.keys(data.data); // 获取所有组织名称
    const barData = labels.map(label => {
        console.log('Processing label:', label, 'with values:', data.data[label]);
        const values = data.data[label];
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length; // 计算平均值
    });

    const scatterData = [];
    labels.forEach(label => {
        const values = data.data[label];
        const tissueLabels = data.tissues[label] || []; // 确保tissueLabels存在
        values.forEach((value, index) => {
            scatterData.push({ x: label, y: value, tissueLabel: tissueLabels[index] || 'N/A' });
        });
    });

    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)',
        'rgba(83, 102, 255, 0.5)',
        'rgba(120, 159, 64, 0.5)',
        'rgba(255, 99, 255, 0.5)',
        'rgba(0, 100, 132, 0.5)',
        'rgba(200, 200, 132, 0.5)',
        'rgba(128, 128, 128, 0.5)' // 为ABC添加颜色

    ]; // 添加不同的颜色

    const borderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(199, 199, 199, 1)',
        'rgba(83, 102, 255, 1)',
        'rgba(120, 159, 64, 1)',
        'rgba(255, 99, 255, 1)',
        'rgba(0, 100, 132, 1)',
        'rgba(200, 200, 132, 1)',
        'rgba(128, 128, 128, 1)' // 为ABC添加边框颜色
    ]; // 添加不同的边框颜色

    new Chart(ctx, {
        type: 'bar', // 柱状图
        data: {
            labels: labels, // X轴标签
            // labels: displayLabels, // 使用带下划线的标签进行显示
            datasets: [{
                label: 'Average', // 设置标签为Average
                backgroundColor: backgroundColors, // 柱状图的背景颜色
                borderColor: borderColors, // 柱状图的边框颜色
                borderWidth: 1, // 边框宽度
                data: barData // 柱状图数据
            }, {
                type: 'scatter', // 散点图
                label: 'Scatter', // 设置标签为Scatter
                data: scatterData, // 散点图的数据
                backgroundColor: 'rgba(128, 128, 128, 0.6)', // 散点图点的颜色，柔和的灰色
                borderColor: 'rgba(0, 0, 0, 1)', // 散点图点的边框颜色，柔和的灰色    
                showLine: false // 不显示连接线
            }]
        },
        options: {
            layout: {
                padding: {
                    top: 20,
                    bottom: 130 // 增加底部边距，为文本和下划线腾出空间
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: geneName,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false, // 不显示图例
                },
                tooltip: { // 添加tooltip配置
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.type === 'scatter') {
                                return `${context.raw.y.toFixed(2)}, ${context.raw.tissueLabel}`; // 自定义显示格式，值和具体标签
                                // return `${context.raw.y.toFixed(2)}, abc`; 
                            } else if (context.raw === 'NA') {
                                return 'Average: NA'; // 如果值为'NA'，显示'Average: NA'
                            } else {
                                return `Average: ${context.raw.toFixed(2)}`;
                            }
                        },
                        title: function(tooltipItems) {
                            return ''; // 使标题为空，不显示默认的组织名称
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    labels: labels,
                    ticks: {
                        display: false, // 不显示默认的X轴标签
                        autoSkip: false,
                        maxRotation: 30,
                        minRotation: 0,
                        font: {
                            size: 14
                        }
                    },
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'TPM Expression Level',
                        font: {
                            size: 18
                        }
                    },
                    ticks: {
                        font: {
                            size: 14
                        }
                    }
                }
            },
            devicePixelRatio: 2
        },plugins: [{
            id: 'NA-plugin',
            afterDraw: chart => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                // 定义下划线和标签的Y轴位置
                const y = yAxis.bottom + 40; // 在 x 轴下方绘制下划线，所有下划线和标签的Y轴位置保持一致
                const textY = y-15 ; // 文本标记的位置（下划线上方）

                // Rotate text labels for organ names by 45 degrees
                const angle = -45 * Math.PI / 180; // Convert 45 degrees to radians

                const labels = ['A549', 'D425', 'ES2','HEK293T', 'Hela', 'HepG2', 'H1299', 'K562', 'MB002', 'MCF7', 'MDA-MB-231','Ovcar8', 'T98G',  'U87MG', '501Mel'];

                for (let i = 0; i <= 14; i++) {
                    const x = xAxis.getPixelForTick(i)+15;
                    ctx.save(); // Save the current state of the canvas
                    ctx.translate(x, textY-10); // Move the canvas origin to the text position
                    ctx.rotate(angle); // Rotate the canvas
                    ctx.textAlign = 'right'; // Align the text to the top after rotation
                    ctx.fillText(labels[i], 0, 0); // Draw the text at the new origin
                    ctx.restore(); // Restore the canvas state to avoid affecting other drawings
                }
                ctx.font = '12px Arial'; // 设置字体大小为10px
                ctx.fillText('Data Source: GSE231583, GSE196043, GSE273634, GSE218727, GSE199309, GSE199309, GSE167869, GSE178532, ', 20,  y+50);
                ctx.fillText('GSE263036, GSE212057, GSE199309, GSE212057, GSE147626, GSE235568, GSE112241, PRJNA580150, GSE218794, ', 20,  y+70);
                ctx.fillText('GSE245778, GSE246325, PRJNA515302, GSE104869, GSE224980, GSE264010, GSE151810, GSE185024, GSE261568', 20,  y+90);
                ctx.restore();
                ctx.restore();

            }
        }]
    });
}

function createGeneChart_dmelanogaster(data, geneName) {
    // 1. Setup Canvas
    const canvas = document.getElementById('geneChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart to prevent overlap
    if (window.myGeneChart) {
        window.myGeneChart.destroy();
    }

    // 2. Prepare Data
    const labels = Object.keys(data.data);
    
    const barData = labels.map(label => {
        const values = data.data[label];
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const scatterData = [];
    labels.forEach(label => {
        const values = data.data[label];
        const tissueLabels = data.tissues[label] || [];
        values.forEach((value, index) => {
            scatterData.push({ 
                x: label, 
                y: value, 
                tissueLabel: tissueLabels[index] || 'N/A' 
            });
        });
    });

    // 3. Colors
    const baseColors = [
        'rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 
        'rgba(255, 206, 86, 0.5)', 'rgba(75, 192, 192, 0.5)', 
        'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)'
    ];
    // Map colors cyclically
    const backgroundColors = labels.map((_, i) => baseColors[i % baseColors.length]);
    const borderColors = labels.map((_, i) => baseColors[i % baseColors.length].replace('0.5', '1'));

    // 4. Create Chart
    window.myGeneChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Average',
                    data: barData,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                },
                {
                    type: 'scatter',
                    label: 'Replicates',
                    data: scatterData,
                    backgroundColor: 'rgba(50, 50, 50, 0.6)',
                    borderColor: 'rgba(0, 0, 0, 1)',
                    pointRadius: 3,
                    showLine: false
                }
            ]
        },
        options: {
            layout: {
                padding: {
                    top: 20,
                    // Increased bottom padding to fit 3 levels of text (Genotype, Stage, Group)
                    bottom: 100 
                }
            },
            plugins: {
                title: { display: true, text: geneName, font: { size: 20 } },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.type === 'scatter') {
                                return `${context.raw.y.toFixed(2)}, ${context.raw.tissueLabel}`;
                            }
                            return `Average: ${context.raw.toFixed(2)}`;
                        },
                        title: () => '' // Hide default title
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { display: false } // Hide default X labels, we draw custom ones
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'TPM Expression Level', font: { size: 16 } }
                }
            }
        },
        plugins: [{
            id: 'dmel-hierarchical-labels',
            afterDraw: chart => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;
                const yBase = yAxis.bottom;

                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillStyle = 'black';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;

                // --- 1. Top Right Legend (New Code) ---
                ctx.save();
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.font = '12px Arial'; 
                ctx.fillStyle = '#444'; // Dark grey color
                
                // Position at top right edge
                const legendX = chart.width - 20; 
                const legendY = 70; 

                ctx.fillText('WT = Wild Type', legendX, legendY);
                ctx.fillText('Dora = Dora Knockout', legendX, legendY + 20);
                ctx.restore();

                // --- 2. Helper to draw lines (Existing) ---
                const drawGroupLine = (startIdx, endIdx, yPos, text) => {
                    if (startIdx === -1 || endIdx === -1) return;
                    
                    const x1 = xAxis.getPixelForTick(startIdx);
                    const x2 = xAxis.getPixelForTick(endIdx);
                    const padding = (x1 === x2) ? 20 : 0; 

                    ctx.beginPath();
                    ctx.moveTo(x1 - padding, yPos);
                    ctx.lineTo(x2 + padding, yPos);
                    ctx.stroke();

                    if (text) {
                        ctx.font = '12px Arial';
                        ctx.fillText(text, (x1 + x2) / 2, yPos + 5);
                    }
                };

                // --- 3. Row 1: Genotype Labels (WT, Dora, Fly) ---
                ctx.font = '12px Arial';
                labels.forEach((label, i) => {
                    const x = xAxis.getPixelForTick(i);
                    let text = '';
                    
                    if (label === 'flyscr') text = 'Fly';
                    else if (label.includes('WT')) text = 'WT';
                    else if (label.toLowerCase().includes('dora')) text = 'Dora';

                    if (text) ctx.fillText(text, x, yBase + 5);
                });

                // --- 4. Row 2: Sub-Group Lines ---
                const findIndices = (substring) => {
                    const indices = labels.map((l, i) => l.includes(substring) ? i : -1).filter(i => i !== -1);
                    if (indices.length === 0) return { start: -1, end: -1 };
                    return { start: Math.min(...indices), end: Math.max(...indices) };
                };

                // Draw groups
                const s2 = findIndices('S2');
                drawGroupLine(s2.start, s2.end, yBase + 25, 'S2 cell');

                const t0_4 = findIndices('0to4h');
                drawGroupLine(t0_4.start, t0_4.end, yBase + 25, '0-4h');

                const t8_12 = findIndices('8to12h');
                drawGroupLine(t8_12.start, t8_12.end, yBase + 25, '8-12h');

                const t12_16 = findIndices('12to16h');
                drawGroupLine(t12_16.start, t12_16.end, yBase + 25, '12-16h');

                const t16_20 = findIndices('16to20h');
                drawGroupLine(t16_20.start, t16_20.end, yBase + 25, '16-20h');

                // --- 5. Row 3: Super-Group (Embryos) ---
                const embryos = findIndices('Embryos');
                drawGroupLine(embryos.start, embryos.end, yBase + 50, 'Embryos');

                // --- Data Source ---
                ctx.save();
                ctx.textAlign = 'left'; 
                ctx.font = '11px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText('Data Source: GSE196837', 10, chart.height - 15);
                ctx.restore();
            }
        }]
    });
}

function createGeneChart_celegans(data, geneName) {
    // 1. Setup Canvas
    const canvas = document.getElementById('geneChart');
    const ctx = canvas.getContext('2d');

    // Destroy existing chart to prevent overlap (Crucial Step)
    if (window.myGeneChart) {
        window.myGeneChart.destroy();
    }

    console.log('Data:', data.data);

    // 2. Prepare Data
    // PHP Keys: ['embryos', 'L1_wt', 'L1_ebax', 'L2', 'L3', 'L4', 'Adult']
    const labels = Object.keys(data.data); 
    
    const barData = labels.map(label => {
        const values = data.data[label];
        if (!values || values.length === 0) return 0;
        return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const scatterData = [];
    labels.forEach(label => {
        const values = data.data[label];
        const tissueLabels = data.tissues[label] || [];
        values.forEach((value, index) => {
            scatterData.push({ 
                x: label, 
                y: value, 
                tissueLabel: tissueLabels[index] || 'N/A' 
            });
        });
    });

    // 3. Colors
    const baseColors = [
        'rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)', 'rgba(153, 102, 255, 0.5)', 'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)', 'rgba(83, 102, 255, 0.5)', 'rgba(120, 159, 64, 0.5)',
        'rgba(255, 99, 255, 0.5)', 'rgba(0, 100, 132, 0.5)', 'rgba(200, 200, 132, 0.5)',
        'rgba(128, 128, 128, 0.5)'
    ];
    
    const backgroundColors = labels.map((_, i) => baseColors[i % baseColors.length]);
    const borderColors = labels.map((_, i) => baseColors[i % baseColors.length].replace('0.5', '1'));

    // 4. Create Chart
    window.myGeneChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Average',
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1,
                data: barData
            }, {
                type: 'scatter',
                label: 'Replicates',
                data: scatterData,
                backgroundColor: 'rgba(128, 128, 128, 0.6)',
                borderColor: 'rgba(0, 0, 0, 1)',
                showLine: false,
                pointRadius: 3
            }]
        },
        options: {
            layout: {
                padding: { top: 20, bottom: 60 } // Padding for labels
            },
            plugins: {
                title: { display: true, text: geneName, font: { size: 20 } },
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.type === 'scatter') {
                                return `${context.raw.y.toFixed(2)}, ${context.raw.tissueLabel}`;
                            }
                            return `Average: ${context.raw.toFixed(2)}`;
                        },
                        title: () => ''
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    ticks: { display: false } // Hide default X labels, we draw custom ones
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'TPM Expression Level', font: { size: 18 } }
                }
            },
            devicePixelRatio: 2
        },
        plugins: [{
            id: 'celegans-custom-labels',
            afterDraw: chart => {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                const yBottom = yAxis.bottom;
                const textY = yBottom + 10; 

                // --- Map PHP Keys to Display Names ---
                const labelMap = {
                    'embryos': 'Embryos',
                    'L1_wt': 'L1',          // Display 'L1' for wild type
                    'L1_ebax': 'L1 ebax null',
                    'L2': 'L2',
                    'L3': 'L3',
                    'L4': 'L4',
                    'Adult': 'Adult'        // You removed Adult_ebax, so we just have Adult
                };

                ctx.font = '12px Arial';
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                // Loop through the actual data keys present in the chart
                labels.forEach((rawKey, index) => {
                    const x = xAxis.getPixelForTick(index);
                    
                    // Get pretty name, or fallback to raw key if missing
                    const displayName = labelMap[rawKey] || rawKey;

                    ctx.fillText(displayName, x, textY);
                });

                // Data Source Footer
                ctx.save();
                ctx.textAlign = 'left';
                ctx.fillStyle = '#666';
                ctx.fillText('Data Source: PRJNA922944, PRJNA684142, GSE266398, GSE68588, GSE262626, GSE267368', 20, chart.height - 15);
                ctx.restore();
            }
        }]
    });
}