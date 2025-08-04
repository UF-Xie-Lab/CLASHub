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
    const rows = [['Sample', 'Expression Values']]; // Header row

    // Populate rows with tissue names and their expression values
    Object.keys(data.data).forEach(tissue => {
        rows.push([tissue, data.data[tissue].join(', ')]);
    });

    // Convert rows to CSV string
    const csvContent = rows.map(e => e.join(',')).join('\n');

    // Create a downloadable link
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
                    bottom: 100 // 增加底部边距，为文本和下划线腾出空间
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
                const y = yAxis.bottom + 30; // 在 x 轴下方绘制下划线，所有下划线和标签的Y轴位置保持一致
                const textY = y - 5; // 文本标记的位置（下划线上方）

                // Rotate text labels for organ names by 45 degrees
                const angle = -45 * Math.PI / 180; // Convert 45 degrees to radians

                const labels = ['Adrenal Gland', 'Bone Marrow', 'Brain', 'ESC', 'Fore Stomach', 'Heart', 'Ineuron', 'Kidney', 'Large Intestine', 'Liver', 'Lung','MEF','Muscle',  'Neural Precursor','Ovary', 'Placenta',  'Skin', 'Small Intestine', 'Spleen','Stomach', 'Testis', 'Thymus',  'Vesicular Gland', ];

                for (let i = 0; i <= 22; i++) {
                    const x = xAxis.getPixelForTick(i);
                    ctx.save(); // Save the current state of the canvas
                    ctx.translate(x, textY-10); // Move the canvas origin to the text position
                    ctx.rotate(angle); // Rotate the canvas
                    ctx.textAlign = 'right'; // Align the text to the top after rotation
                    ctx.fillText(labels[i], 0, 0); // Draw the text at the new origin
                    ctx.restore(); // Restore the canvas state to avoid affecting other drawings
                }

                // 绘制第一个和第二个柱状图下的下划线和标签
                const x23 = xAxis.getPixelForTick(23); // 第一个标签的X坐标
                const x24 = xAxis.getPixelForTick(24); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x23, y); // 起点是第一个标签的下方
                ctx.lineTo(x24, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x23, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('Z8', x24, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "Het" 文本标记在下划线下方
                const middleX23 = (x23 + x24) / 2;
                const HetTextWidth = ctx.measureText('Het').width;
                const HetX = middleX23 - HetTextWidth / 2;
                ctx.fillText('Het', HetX+10, y + 20); // 在调整后的位置绘制 "Het"

                // 绘制第三、第四和第五个柱状图下的下划线和标签
                const x25 = xAxis.getPixelForTick(25); // 第一个标签的X坐标
                const x26 = xAxis.getPixelForTick(26); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x25, y); // 起点是第一个标签的下方
                ctx.lineTo(x26, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x25, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('Z8', x26, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "Het" 文本标记在下划线下方
                const middleX25 = (x25 + x26) / 2;
                const HomoTextWidth = ctx.measureText('Homo').width;
                const HomoX = middleX25 - HomoTextWidth / 2;
                ctx.fillText('Homo', HomoX+10, y + 20); // 在调整后的位置绘制 "Het"

                // 绘制从x23到x26的下划线
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x23, y + 25); // 设置线条起点坐标, y + 40为线条的纵向位置
                ctx.lineTo(x26, y + 25); // 设置线条终点坐标
                ctx.stroke();

                // 在新绘制的线条下面添加文本 "Striatal Cell"
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                const StriatalCellX = (x23 + x26) / 2; // 文本居中显示
                ctx.fillText('Striatal Cell', StriatalCellX, y + 40); // y + 60 为文本的纵向位置

                ctx.fillText('Data Source: GSE252281, GSE222026, GSE239373, PRJEB27315, PRJNA375882', 300,  y+70);

                // 在图表右上角添加标注
                const annotationX = chart.width - 120; // 右上角距离
                const annotationY = 40; // 从顶部开始的 Y 轴位置
                ctx.textAlign = 'left'; // 文本左对齐
                ctx.font = '14px Arial';
                ctx.fillText('sgNT: Non-target', annotationX-20, annotationY );
                ctx.fillText('Z8: Zswim8 Knockout', annotationX-20, annotationY + 20);

                ctx.restore();

            }
        }]
    });
}

function createGeneChart_celegans(data, geneName) {
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
                    bottom: 40 // 增加底部边距，为文本和下划线腾出空间
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
                const y = yAxis.bottom + 30; // 在 x 轴下方绘制下划线，所有下划线和标签的Y轴位置保持一致
                const textY = y - 5; // 文本标记的位置（下划线上方）

                // Rotate text labels for organ names by 45 degrees
                const angle = 0 * Math.PI / 180; // Convert 45 degrees to radians

                const labels = ['embryos', 'L1', 'L1 ebax null', 'L2', 'L3', 'L4', 'Adult', 'Adult ebax null'];

                for (let i = 0; i <= 7; i++) {
                    const x = xAxis.getPixelForTick(i);
                    ctx.save(); // Save the current state of the canvas
                    ctx.translate(x, textY); // Move the canvas origin to the text position
                    ctx.rotate(angle); // Rotate the canvas
                    ctx.textAlign = 'center'; // Align the text to the top after rotation
                    ctx.fillText(labels[i], 0, 0); // Draw the text at the new origin
                    ctx.restore(); // Restore the canvas state to avoid affecting other drawings
                }

                ctx.fillText('Data Source: PRJNA922944, PRJNA684142, GSE266398, GSE68588, GSE262626, GSE267368', 20,  y+10);
                ctx.restore();

            }
        }]
    });
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
                    bottom: 70 // 增加底部边距，为文本和下划线腾出空间
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
                const angle = -0 * Math.PI / 180; // Convert 45 degrees to radians

                const labels = ['sgNT', 'WT', 'Dora', '2-4h WT', 'WT', 'Dora',
                    'WT', 'Dora', 'WT', 'Dora', 'Adult'];

                for (let i = 0; i <= 10; i++) {
                    const x = xAxis.getPixelForTick(i)+15;
                    ctx.save(); // Save the current state of the canvas
                    // Add special translation when i == 3
                    if (i === 3) {
                        ctx.translate(x + 20, textY - 10); // Special translation for i == 3, 主要是”2-4h WT“ 字符较长
                    } else {
                        ctx.translate(x, textY - 10); // Regular translation for other cases
                    }
                    ctx.rotate(angle); // Rotate the canvas
                    ctx.textAlign = 'right'; // Align the text to the top after rotation
                    ctx.fillText(labels[i], 0, 0); // Draw the text at the new origin
                    ctx.restore(); // Restore the canvas state to avoid affecting other drawings
                }

                // 画 Embryos
                const x3 = xAxis.getPixelForTick(3); // 第一个标签的X坐标
                const x9 = xAxis.getPixelForTick(9); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x3, y+ 5); // 起点是第一个标签的下方
                ctx.lineTo(x9, y+ 5); // 终点是第二个标签的下方
                ctx.stroke();

                const middleX3 = (x3 + x9) / 2;
                const EmbryosTextWidth = ctx.measureText('Embryos').width;
                const EmbryosX = middleX3 - EmbryosTextWidth / 2;
                ctx.fillText('Embryos', EmbryosX+10, y + 20); //

                // 画 S2 cell
                const x0 = xAxis.getPixelForTick(0); // 第一个标签的X坐标
                const x2 = xAxis.getPixelForTick(2); // 第一个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x0, y-15); // 起点是第一个标签的下方
                ctx.lineTo(x2, y-15); // 终点是第二个标签的下方
                ctx.stroke();

                const middleX0 = (x0 + x2) / 2;
                const S2TextWidth = ctx.measureText('S2 cell').width;
                const S2X = middleX0 - S2TextWidth / 2;
                ctx.fillText('S2 cell', S2X, y); 


                // 画 8-12h
                const x4 = xAxis.getPixelForTick(4); // 第一个标签的X坐标
                const x5 = xAxis.getPixelForTick(5); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x4, y-15); // 起点是第一个标签的下方
                ctx.lineTo(x5, y-15); // 终点是第二个标签的下方
                ctx.stroke();

                const middleX4 = (x4 + x5) / 2;
                const From8to12hTextWidth = ctx.measureText('8-12h').width;
                const From8to12hX = middleX4 - From8to12hTextWidth / 2;
                ctx.fillText('8-12h', From8to12hX, y); 

                // 画 12-16h
                const x6 = xAxis.getPixelForTick(6); // 第一个标签的X坐标
                const x7 = xAxis.getPixelForTick(7); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x6, y-15); // 起点是第一个标签的下方
                ctx.lineTo(x7, y-15); // 终点是第二个标签的下方
                ctx.stroke();

                const middleX6 = (x6 + x7) / 2;
                const From12to16hTextWidth = ctx.measureText('12-16h').width;
                const From12to16hX = middleX6 - From12to16hTextWidth / 2;
                ctx.fillText('12-16h', From12to16hX, y); 

                 // 画 16-20h
                 const x8 = xAxis.getPixelForTick(8); // 第一个标签的X坐标
 
                 ctx.save();
                 ctx.strokeStyle = 'black';
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 ctx.moveTo(x8, y-15); // 起点是第一个标签的下方
                 ctx.lineTo(x9, y-15); // 终点是第二个标签的下方
                 ctx.stroke();
 
                 const middleX8 = (x8 + x9) / 2;
                 const From16to20hTextWidth = ctx.measureText('16-20h').width;
                 const From16to20hX = middleX8 - From16to20hTextWidth / 2;
                 ctx.fillText('16-20h', From16to20hX, y); 
                                
                ctx.font = '14px Arial'; // 设置字体大小为10px
                ctx.fillText('Data Source: PRJNA896239, GSE196837', 20,  y+30);
                
                // 在图表右上角添加标注
                const annotationX = chart.width - 120; // 右上角距离
                const annotationY = 20; // 从顶部开始的 Y 轴位置
                ctx.textAlign = 'left'; // 文本左对齐
                ctx.font = '14px Arial';
                ctx.fillText('sgNT: Non-target', annotationX-20, annotationY );
                ctx.fillText('WT: Wild Type', annotationX-20, annotationY + 20);
                ctx.fillText('Dora: Dora Knockout', annotationX-20, annotationY + 40);               
                ctx.restore();

            }
        }]
    });
}