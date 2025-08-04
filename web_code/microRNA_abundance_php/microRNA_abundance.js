const urlParams = new URLSearchParams(window.location.search);
const miRNAName = urlParams.get('mirnaAbundance_name');
const species = urlParams.get('mirna_species_hidden');  // 获取 species 参数
console.log('miRNA Name from URL:', miRNAName);
const canvas = document.getElementById('miRNAChart');
const ctx = canvas.getContext('2d');

document.getElementById('downloadCSV').addEventListener('click', function() {
    if (miRNAName && species) {
        fetchMiRNAData(miRNAName, species)
            .then(data => downloadCSV(data, miRNAName))
            .catch(error => console.error('Error downloading CSV:', error));
    } else {
        console.error('miRNA name or species not specified');
    }
});

function downloadCSV(data, miRNAName) {
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
    link.setAttribute('download', `${miRNAName}_expression_data.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.addEventListener('DOMContentLoaded', function() {
    if (miRNAName && species) {
        fetchMiRNAData(miRNAName, species).then(data => {
            console.log('Fetched Data:', data.data);
            
            // Call the appropriate function based on the species
            switch (species) {
                case 'Mouse':
                    createMiRNAChart_mouse(data, miRNAName);
                    break;
                case 'Human':
                    createMiRNAChart_human(data, miRNAName);
                    break;
                case 'D.melanogaster':
                    createMiRNAChart_dmelanogaster(data, miRNAName);
                    break;
                case 'C.elegans':
                    createMiRNAChart_celegans(data, miRNAName);
                    break;
                default:
                    console.error('Species not supported:', species);
            }
        }).catch(error => {
            console.error('Error fetching miRNA data:', error);
        });
    } else {
        console.error('No mirnaAbundance_name or species parameter found in URL');
    }
});

function fetchMiRNAData(miRNAName, species) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'microRNA_abundance_php/microRNA_abundance.php',
            method: 'GET',
            data: { 
                mirnaAbundance_name: miRNAName,
                species: species  // 传递 species 参数
            },
            success: function(response) {
                try {
                    const data = (typeof response === 'string') ? JSON.parse(response) : response;

                    if (data.error) {
                        reject(data.error);
                    } else if (!data.geneFound) {
                        reject('miRNA not found: ' + miRNAName);
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

function createMiRNAChart_mouse(data, miRNAName) {
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
        const tissueLabels = data.tissues[label] || [];
    
        if (values.length !== tissueLabels.length) {
            console.warn(`Mismatch in lengths for ${label}: values(${values.length}) vs tissueLabels(${tissueLabels.length})`);
        }
    
        values.forEach((value, index) => {
            scatterData.push({ x: label, y: value, tissueLabel: tissueLabels[index] || 'N/A' });
        });
    });    

    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 99, 132, 0.5)',

        'rgba(54, 162, 235, 0.5)',
        'rgba(54, 162, 235, 0.5)',

        'rgba(255, 206, 86, 0.5)',
        'rgba(255, 206, 86, 0.5)',

        'rgba(75, 192, 192, 0.5)',
        'rgba(75, 192, 192, 0.5)',

        'rgba(153, 102, 255, 0.5)',
        'rgba(153, 102, 255, 0.5)',

        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 159, 64, 0.5)',

        'rgba(199, 199, 199, 0.5)',
        'rgba(199, 199, 199, 0.5)',

        'rgba(83, 102, 255, 0.5)',
        'rgba(83, 102, 255, 0.5)',

        'rgba(120, 159, 64, 0.5)',
        'rgba(120, 159, 64, 0.5)',

        'rgba(255, 99, 255, 0.5)',
        'rgba(255, 99, 255, 0.5)',

        'rgba(0, 100, 132, 0.5)',
        'rgba(0, 100, 132, 0.5)',

        'rgba(200, 200, 132, 0.5)',
        'rgba(200, 200, 132, 0.5)'

    ]; // 添加不同的颜色

    const borderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(255, 99, 132, 1)',

        'rgba(54, 162, 235, 1)',
        'rgba(54, 162, 235, 1)',

        'rgba(255, 206, 86, 1)',
        'rgba(255, 206, 86, 1)',

        'rgba(75, 192, 192, 1)',
        'rgba(75, 192, 192, 1)',

        'rgba(153, 102, 255, 1)',
        'rgba(153, 102, 255, 1)',

        'rgba(255, 159, 64, 1)',
        'rgba(255, 159, 64, 1)',

        'rgba(199, 199, 199, 1)',
        'rgba(199, 199, 199, 1)',

        'rgba(83, 102, 255, 1)',
        'rgba(83, 102, 255, 1)',

        'rgba(120, 159, 64, 1)',
        'rgba(120, 159, 64, 1)',

        'rgba(255, 99, 255, 1)',
        'rgba(255, 99, 255, 1)',

        'rgba(0, 100, 132, 1)',
        'rgba(0, 100, 132, 1)',

        'rgba(200, 200, 132, 1)',
        'rgba(200, 200, 132, 1)'
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
                    top: 50,
                    bottom: 70 // 增加底部边距，为文本和下划线腾出空间
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: miRNAName,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false, // 不显示图例
                },
                tooltip: { 
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
                    title: {
                        display: false,//不显示GSE
                        text: 'Data Source: GSE231447',
                        font: {
                            size: 14
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'CPM (Count Per Million)',
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

                // 绘制第1个和第2个柱状图下的下划线和标签, stomach
                const x1 = xAxis.getPixelForTick(0); // 第一个标签的X坐标
                const x2 = xAxis.getPixelForTick(1); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x1, y); // 起点是第一个标签的下方
                ctx.lineTo(x2, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x1, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('Z8', x2, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "stomach" 文本标记在下划线下方
                const StomachTextWidth = ctx.measureText('Stomach').width;
                const StomachX = ((x1 + x2) / 2) - StomachTextWidth / 2;
                ctx.fillText('Stomach', StomachX+25, y + 20); // 在调整后的位置绘制 "Stomach"

                // 绘制第3个和第4个柱状图下的下划线和标签, Skin
                const x3 = xAxis.getPixelForTick(2); // 第2个标签的X坐标
                const x4 = xAxis.getPixelForTick(3); // 第3个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x3, y); // 起点是第一个标签的下方
                ctx.lineTo(x4, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x3, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('Z8', x4, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "Skin" 文本标记在下划线下方
                const SkinTextWidth = ctx.measureText('Skin').width;
                const SkinX = ((x3 + x4) / 2) - SkinTextWidth / 2;
                ctx.fillText('Skin', SkinX+15, y + 20); // 在调整后的位置绘制 "Skin"

                // 绘制Lung柱状图下的下划线和标签
                const x5 = xAxis.getPixelForTick(4); // 第3个标签的X坐标
                const x6 = xAxis.getPixelForTick(5); // 第4个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x5, y); // 起点是第一个标签的下方
                ctx.lineTo(x6, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x5, textY); // 在第一个柱状图上方标记 "WT"
                ctx.fillText('Z8', x6, textY); // 在第二个柱状图上方标记 "Z8"

                // 绘制 "Lung" 文本标记在下划线下方
                const LungTextWidth = ctx.measureText('Lung').width;
                const LungX = ((x5 + x6) / 2) - LungTextWidth / 2;
                ctx.fillText('Lung', LungX+15, y + 20); // 在调整后的位置绘制 "Lung"

                // 继续为其他组织绘制
                // 绘制Liver柱状图下的下划线和标签
                const x7 = xAxis.getPixelForTick(6);
                const x8 = xAxis.getPixelForTick(7);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x7, y);
                ctx.lineTo(x8, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x7, textY);
                ctx.fillText('Z8', x8, textY);

                const LiverTextWidth = ctx.measureText('Liver').width;
                const LiverX = ((x7 + x8) / 2) - LiverTextWidth / 2;
                ctx.fillText('Liver', LiverX+15, y + 20);

                // 绘制Kidney柱状图下的下划线和标签
                const x9 = xAxis.getPixelForTick(8);
                const x10 = xAxis.getPixelForTick(9);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x9, y);
                ctx.lineTo(x10, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x9, textY);
                ctx.fillText('Z8', x10, textY);

                const KidneyTextWidth = ctx.measureText('Kidney').width;
                const KidneyX = ((x9 + x10) / 2) - KidneyTextWidth / 2;
                ctx.fillText('Kidney', KidneyX+22, y + 20);

                // 绘制Intestine柱状图下的下划线和标签
                const x11 = xAxis.getPixelForTick(10);
                const x12 = xAxis.getPixelForTick(11);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x11, y);
                ctx.lineTo(x12, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x11, textY);
                ctx.fillText('Z8', x12, textY);

                const IntestineTextWidth = ctx.measureText('Intestine').width;
                const IntestineX = ((x11 + x12) / 2) - IntestineTextWidth / 2;
                ctx.fillText('Intestine', IntestineX+25, y + 20);

                // 绘制Heart柱状图下的下划线和标签
                const x13 = xAxis.getPixelForTick(12);
                const x14 = xAxis.getPixelForTick(13);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x13, y);
                ctx.lineTo(x14, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x13, textY);
                ctx.fillText('Z8', x14, textY);

                const HeartTextWidth = ctx.measureText('Heart').width;
                const HeartX = ((x13 + x14) / 2) - HeartTextWidth / 2;
                ctx.fillText('Heart', HeartX+15, y + 20);

                // 绘制Brain柱状图下的下划线和标签
                const x15 = xAxis.getPixelForTick(14);
                const x16 = xAxis.getPixelForTick(15);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x15, y);
                ctx.lineTo(x16, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x15, textY);
                ctx.fillText('Z8', x16, textY);

                const BrainTextWidth = ctx.measureText('Brain').width;
                const BrainX = ((x15 + x16) / 2) - BrainTextWidth / 2;
                ctx.fillText('Brain', BrainX+15, y + 20);

                // 绘制Neuron柱状图下的下划线和标签
                const x17 = xAxis.getPixelForTick(16);
                const x18 = xAxis.getPixelForTick(17);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x17, y);
                ctx.lineTo(x18, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x17, textY);
                ctx.fillText('Z8', x18, textY);

                const NeuronTextWidth = ctx.measureText('Neuron').width;
                const NeuronX = ((x17 + x18) / 2) - NeuronTextWidth / 2;
                ctx.fillText('iNeuron cell', NeuronX+25, y + 20);

                // 绘制MEF柱状图下的下划线和标签
                const x19 = xAxis.getPixelForTick(18);
                const x20 = xAxis.getPixelForTick(19);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x19, y);
                ctx.lineTo(x20, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x19, textY);
                ctx.fillText('Z8', x20, textY);

                const MEFTextWidth = ctx.measureText('MEF').width;
                const MEFX = ((x19 + x20) / 2) - MEFTextWidth / 2;
                ctx.fillText('MEF cell', MEFX+15, y + 20);


                // 绘制StriatalCellHet柱状图下的下划线和标签
                const x21 = xAxis.getPixelForTick(20);
                const x22 = xAxis.getPixelForTick(21);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x21, y);
                ctx.lineTo(x22, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x21, textY);
                ctx.fillText('Z8', x22, textY);

                const StriatalCellHetTextWidth = ctx.measureText('StriatalCellHet').width;
                const StriatalCellHetX = ((x21 + x22) / 2) - StriatalCellHetTextWidth / 2;
                ctx.fillText('Het', StriatalCellHetX+40, y + 20);

                // 绘制StriatalCellHomo柱状图下的下划线和标签
                const x23 = xAxis.getPixelForTick(22);
                const x24 = xAxis.getPixelForTick(23);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x23, y);
                ctx.lineTo(x24, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('sgNT', x23, textY);
                ctx.fillText('Z8', x24, textY);

                const StriatalCellHomoTextWidth = ctx.measureText('StriatalCellHomo').width;
                const StriatalCellHomoX = ((x23 + x24) / 2) - StriatalCellHomoTextWidth / 2;
                ctx.fillText('Homo', StriatalCellHomoX+50, y + 20);

                // 绘制从x21到x24的下划线
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x21, y + 25); // 设置线条起点坐标, y + 40为线条的纵向位置
                ctx.lineTo(x24, y + 25); // 设置线条终点坐标
                ctx.stroke();

                // 在新绘制的线条下面添加文本 "Striatal Cell"
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                const StriatalCellX = (x21 + x24) / 2; // 文本居中显示
                ctx.fillText('Striatal Cell', StriatalCellX, y + 40); // y + 60 为文本的纵向位置
                
                // 在图表右上角添加标注
                const annotationX = chart.width - 200; // 右上角距离
                const annotationY = 50; // 从顶部开始的 Y 轴位置
                ctx.textAlign = 'left'; // 文本左对齐
                ctx.font = '14px Arial';
                ctx.fillText('WT: Wild Type', annotationX, annotationY);
                ctx.fillText('NT: Non-target', annotationX, annotationY + 20);
                ctx.fillText('Z8: Zswim8 Knockout', annotationX, annotationY + 40);

                // 绘制 "Data Source: GSE231447" 在最底部
                ctx.font = '12px Arial';
                ctx.fillText('Data Source: GSE235065, GSE158025, GSE160304, GSE148687, GSE231448',  0,  y+40); // 绘制普通文本
                
                ctx.restore();

            }
        }]
    });
}

function createMiRNAChart_celegans(data, miRNAName) {
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
        const tissueLabels = data.tissues[label] || [];
    
        if (values.length !== tissueLabels.length) {
            console.warn(`Mismatch in lengths for ${label}: values(${values.length}) vs tissueLabels(${tissueLabels.length})`);
        }
    
        values.forEach((value, index) => {
            scatterData.push({ x: label, y: value, tissueLabel: tissueLabels[index] || 'N/A' });
        });
    });    

    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 99, 132, 0.5)',

        'rgba(54, 162, 235, 0.5)',
        'rgba(54, 162, 235, 0.5)',

        'rgba(255, 206, 86, 0.5)',
        'rgba(255, 206, 86, 0.5)',

        'rgba(75, 192, 192, 0.5)',
        'rgba(75, 192, 192, 0.5)',

        'rgba(153, 102, 255, 0.5)',
        'rgba(153, 102, 255, 0.5)',

        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 159, 64, 0.5)',

        'rgba(199, 199, 199, 0.5)',
        'rgba(199, 199, 199, 0.5)',

        'rgba(83, 102, 255, 0.5)',
        'rgba(83, 102, 255, 0.5)',

        'rgba(120, 159, 64, 0.5)',
        'rgba(120, 159, 64, 0.5)',

        'rgba(255, 99, 255, 0.5)',
        'rgba(255, 99, 255, 0.5)',

        'rgba(0, 100, 132, 0.5)',
        'rgba(0, 100, 132, 0.5)',

        'rgba(200, 200, 132, 0.5)',
        'rgba(200, 200, 132, 0.5)'

    ]; // 添加不同的颜色

    const borderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(255, 99, 132, 1)',

        'rgba(54, 162, 235, 1)',
        'rgba(54, 162, 235, 1)',

        'rgba(255, 206, 86, 1)',
        'rgba(255, 206, 86, 1)',

        'rgba(75, 192, 192, 1)',
        'rgba(75, 192, 192, 1)',

        'rgba(153, 102, 255, 1)',
        'rgba(153, 102, 255, 1)',

        'rgba(255, 159, 64, 1)',
        'rgba(255, 159, 64, 1)',

        'rgba(199, 199, 199, 1)',
        'rgba(199, 199, 199, 1)',

        'rgba(83, 102, 255, 1)',
        'rgba(83, 102, 255, 1)',

        'rgba(120, 159, 64, 1)',
        'rgba(120, 159, 64, 1)',

        'rgba(255, 99, 255, 1)',
        'rgba(255, 99, 255, 1)',

        'rgba(0, 100, 132, 1)',
        'rgba(0, 100, 132, 1)',

        'rgba(200, 200, 132, 1)',
        'rgba(200, 200, 132, 1)'
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
                    top: 50,
                    bottom: 70 // 增加底部边距，为文本和下划线腾出空间
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: miRNAName,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false, // 不显示图例
                },
                tooltip: { 
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
                        text: 'CPM (Count Per Million)',
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

                // 绘制第1个和第2个柱状图下的下划线和标签, stomach
                const x1 = xAxis.getPixelForTick(0); // 第一个标签的X坐标
                const x2 = xAxis.getPixelForTick(1); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x1, y); // 起点是第一个标签的下方
                ctx.lineTo(x2, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x1, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('ex', x2, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "EE" 文本标记在下划线下方
                const EETextWidth = ctx.measureText('EE').width;
                const EEX = ((x1 + x2) / 2) - EETextWidth / 2;
                ctx.fillText('EE', EEX + 25, y + 20); // 在调整后的位置绘制 "EE"

                // 绘制第3个和第4个柱状图下的下划线和标签, Skin
                const x3 = xAxis.getPixelForTick(2); // 第2个标签的X坐标
                const x4 = xAxis.getPixelForTick(3); // 第3个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x3, y); // 起点是第一个标签的下方
                ctx.lineTo(x4, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x3, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('ex', x4, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "LE" 文本标记在下划线下方
                const LETextWidth = ctx.measureText('LE').width;
                const LEX = ((x3 + x4) / 2) - LETextWidth / 2;
                ctx.fillText('LE', LEX + 15, y + 20); // 在调整后的位置绘制 "LE"

                // 绘制第5个和第6个柱状图下的下划线和标签, L1
                const x5 = xAxis.getPixelForTick(4); // 第3个标签的X坐标
                const x6 = xAxis.getPixelForTick(5); // 第4个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x5, y); // 起点是第一个标签的下方
                ctx.lineTo(x6, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x5, textY); // 在第一个柱状图上方标记 "WT"
                ctx.fillText('ex', x6, textY); // 在第二个柱状图上方标记 "Z8"

                // 绘制 "L1" 文本标记在下划线下方
                const L1TextWidth = ctx.measureText('L1').width;
                const L1X = ((x5 + x6) / 2) - L1TextWidth / 2;
                ctx.fillText('L1', L1X + 15, y + 20); // 在调整后的位置绘制 "L1"

                // 绘制第7个和第8个柱状图下的下划线和标签, L2
                const x7 = xAxis.getPixelForTick(6);
                const x8 = xAxis.getPixelForTick(7);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x7, y);
                ctx.lineTo(x8, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x7, textY);
                ctx.fillText('ex', x8, textY);

                const L2TextWidth = ctx.measureText('L2').width;
                const L2X = ((x7 + x8) / 2) - L2TextWidth / 2;
                ctx.fillText('L2', L2X + 15, y + 20);

                // 绘制第9个和第10个柱状图下的下划线和标签, L3
                const x9 = xAxis.getPixelForTick(8);
                const x10 = xAxis.getPixelForTick(9);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x9, y);
                ctx.lineTo(x10, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x9, textY);
                ctx.fillText('ex', x10, textY);

                const L3TextWidth = ctx.measureText('L3').width;
                const L3X = ((x9 + x10) / 2) - L3TextWidth / 2;
                ctx.fillText('L3', L3X + 22, y + 20);

                // 绘制第11个和第12个柱状图下的下划线和标签, L4
                const x11 = xAxis.getPixelForTick(10);
                const x12 = xAxis.getPixelForTick(11);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x11, y);
                ctx.lineTo(x12, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x11, textY);
                ctx.fillText('ex', x12, textY);

                const L4TextWidth = ctx.measureText('L4').width;
                const L4X = ((x11 + x12) / 2) - L4TextWidth / 2;
                ctx.fillText('L4', L4X + 25, y + 20);


                // 绘制第13个和第14个柱状图下的下划线和标签, Ad
                const x13 = xAxis.getPixelForTick(12);
                const x14 = xAxis.getPixelForTick(13);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x13, y);
                ctx.lineTo(x14, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x13, textY);
                ctx.fillText('ex', x14, textY);

                const AdTextWidth = ctx.measureText('Ad').width;
                const AdX = ((x13 + x14) / 2) - AdTextWidth / 2;
                ctx.fillText('Ad', AdX + 15, y + 20);

                // 绘制第15个和第16个柱状图下的下划线和标签, glp4
                const x15 = xAxis.getPixelForTick(14);
                const x16 = xAxis.getPixelForTick(15);

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x15, y);
                ctx.lineTo(x16, y);
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x15, textY);
                ctx.fillText('ex', x16, textY);

                const glp4TextWidth = ctx.measureText('glp4').width;
                const glp4X = ((x15 + x16) / 2) - glp4TextWidth / 2;
                ctx.fillText('glp4', glp4X + 15, y + 20);
                
                // 在图表右上角添加标注
                const annotationX = chart.width - 200; // 右上角距离
                const annotationY = 50; // 从顶部开始的 Y 轴位置
                ctx.textAlign = 'left'; // 文本左对齐
                ctx.font = '14px Arial';
                ctx.fillText('WT: Wild Type', annotationX, annotationY + 20);
                ctx.fillText('ex: Ebax Knockout', annotationX, annotationY + 40);

                // 绘制 "Data Source: GSE231447" 在最底部
                ctx.font = '12px Arial';
                ctx.fillText('Data Source: Michael W. Stubna et al. (2024) in bioRxiv.',  0,  y+40); // 绘制普通文本
                
                ctx.restore();

            }
        }]
    });
}

function createMiRNAChart_human(data, miRNAName) {
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
        const tissueLabels = data.tissues[label] || [];
    
        if (values.length !== tissueLabels.length) {
            console.warn(`Mismatch in lengths for ${label}: values(${values.length}) vs tissueLabels(${tissueLabels.length})`);
        }
    
        values.forEach((value, index) => {
            scatterData.push({ x: label, y: value, tissueLabel: tissueLabels[index] || 'N/A' });
        });
    });    

    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(255, 99, 132, 0.5)',

        'rgba(54, 162, 235, 0.5)',
        'rgba(54, 162, 235, 0.5)',

        'rgba(255, 206, 86, 0.5)',
        'rgba(255, 206, 86, 0.5)',

        'rgba(75, 192, 192, 0.5)',
        'rgba(75, 192, 192, 0.5)',

        'rgba(153, 102, 255, 0.5)',
        'rgba(153, 102, 255, 0.5)',

        'rgba(255, 159, 64, 0.5)',
        'rgba(255, 159, 64, 0.5)',

        'rgba(199, 199, 199, 0.5)',
        'rgba(199, 199, 199, 0.5)',

        'rgba(83, 102, 255, 0.5)',
        'rgba(83, 102, 255, 0.5)',

        'rgba(120, 159, 64, 0.5)',
        'rgba(120, 159, 64, 0.5)',

        'rgba(255, 99, 255, 0.5)',
        'rgba(255, 99, 255, 0.5)',

        'rgba(0, 100, 132, 0.5)',
        'rgba(0, 100, 132, 0.5)',

        'rgba(200, 200, 132, 0.5)',
        'rgba(200, 200, 132, 0.5)'

    ]; // 添加不同的颜色

    const borderColors = [
        'rgba(255, 99, 132, 1)',
        'rgba(255, 99, 132, 1)',

        'rgba(54, 162, 235, 1)',
        'rgba(54, 162, 235, 1)',

        'rgba(255, 206, 86, 1)',
        'rgba(255, 206, 86, 1)',

        'rgba(75, 192, 192, 1)',
        'rgba(75, 192, 192, 1)',

        'rgba(153, 102, 255, 1)',
        'rgba(153, 102, 255, 1)',

        'rgba(255, 159, 64, 1)',
        'rgba(255, 159, 64, 1)',

        'rgba(199, 199, 199, 1)',
        'rgba(199, 199, 199, 1)',

        'rgba(83, 102, 255, 1)',
        'rgba(83, 102, 255, 1)',

        'rgba(120, 159, 64, 1)',
        'rgba(120, 159, 64, 1)',

        'rgba(255, 99, 255, 1)',
        'rgba(255, 99, 255, 1)',

        'rgba(0, 100, 132, 1)',
        'rgba(0, 100, 132, 1)',

        'rgba(200, 200, 132, 1)',
        'rgba(200, 200, 132, 1)'
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
                    top: 50,
                    bottom: 70 // 增加底部边距，为文本和下划线腾出空间
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: miRNAName,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false, // 不显示图例
                },
                tooltip: { 
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
                        text: 'CPM (Count Per Million)',
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
            
                // 绘制第1个和第2个柱状图下的下划线和标签, K562
                const x1 = xAxis.getPixelForTick(0); // 第一个标签的X坐标
                const x2 = xAxis.getPixelForTick(1); // 第二个标签的X坐标
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x1, y); // 起点是第一个标签的下方
                ctx.lineTo(x2, y); // 终点是第二个标签的下方
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('WT', x1, textY); // 在第一个柱状图上方标记 "K562wt"
                ctx.fillText('Z8', x2, textY); // 在第二个柱状图上方标记 "K562zs8"
            
                // 绘制 "K562" 文本标记在下划线下方
                const K562TextWidth = ctx.measureText('K562').width;
                const K562X = ((x1 + x2) / 2) - K562TextWidth / 2;
                ctx.fillText('K562 (NextSeq, HiSeq)', K562X + 25, y + 20); // 在调整后的位置绘制 "K562"
            
                // 绘制第3个和第4个柱状图下的下划线和标签, HeLa
                const x3 = xAxis.getPixelForTick(2); // 第3个标签的X坐标
                const x4 = xAxis.getPixelForTick(3); // 第4个标签的X坐标
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x3, y); // 起点是第一个标签的下方
                ctx.lineTo(x4, y); // 终点是第二个标签的下方
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('SgNT', x3, textY); // 在第一个柱状图上方标记 "HeLaSgNT"
                ctx.fillText('Z8', x4, textY); // 在第二个柱状图上方标记 "HeLaZs8"
            
                // 绘制 "HeLa" 文本标记在下划线下方
                const HeLaTextWidth = ctx.measureText('HeLa').width;
                const HeLaX = ((x3 + x4) / 2) - HeLaTextWidth / 2;
                ctx.fillText('HeLa (HiSeq)', HeLaX + 15, y + 20); // 在调整后的位置绘制 "HeLa"
            
                // 绘制A549柱状图下的下划线和标签
                const x5 = xAxis.getPixelForTick(4); // 第5个标签的X坐标
                const x6 = xAxis.getPixelForTick(5); // 第6个标签的X坐标
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x5, y); // 起点是第一个标签的下方
                ctx.lineTo(x6, y); // 终点是第二个标签的下方
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('SgNT', x5, textY); // 在第一个柱状图上方标记 "A549sgNT"
                ctx.fillText('Z8', x6, textY); // 在第二个柱状图上方标记 "A549zs8"
            
                // 绘制 "A549" 文本标记在下划线下方
                const A549TextWidth = ctx.measureText('A549').width;
                const A549X = ((x5 + x6) / 2) - A549TextWidth / 2;
                ctx.fillText('A549 (HiSeq)', A549X + 15, y + 20); // 在调整后的位置绘制 "A549"
            
                // 继续为其他组织绘制
                // 绘制MCF7柱状图下的下划线和标签
                const x7 = xAxis.getPixelForTick(6);
                const x8 = xAxis.getPixelForTick(7);
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x7, y);
                ctx.lineTo(x8, y);
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('SgNT', x7, textY);
                ctx.fillText('Z8', x8, textY);
            
                const MCF7TextWidth = ctx.measureText('MCF7').width;
                const MCF7X = ((x7 + x8) / 2) - MCF7TextWidth / 2;
                ctx.fillText('MCF7 (HiSeq)', MCF7X + 15, y + 20);
            
                // 绘制HEK293T柱状图下的下划线和标签
                const x9 = xAxis.getPixelForTick(8);
                const x10 = xAxis.getPixelForTick(9);
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x9, y);
                ctx.lineTo(x10, y);
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('SgNT', x9, textY);
                ctx.fillText('Z8', x10, textY);
            
                const HEK293TTextWidth = ctx.measureText('HEK293T').width;
                const HEK293TX = ((x9 + x10) / 2) - HEK293TTextWidth / 2;
                ctx.fillText('HEK293T (NextSeq)', HEK293TX + 22, y + 20);
            
                // 绘制HelaWT柱状图下的下划线和标签
                const x11 = xAxis.getPixelForTick(10);
                const x12 = xAxis.getPixelForTick(11);
            
                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x11, y);
                ctx.lineTo(x12, y);
                ctx.stroke();
            
                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('HeLa', x11, textY);
                ctx.fillText('HEK239T', x12, textY);
            
                const HelaWTTextWidth = ctx.measureText('Hela').width;
                const HelaWTX = ((x11 + x12) / 2) - HelaWTTextWidth / 2;
                ctx.fillText('WT (HiSeq)', HelaWTX + 25, y + 20);
            
                // 在图表右上角添加标注
                const annotationX = chart.width - 200; // 右上角距离
                const annotationY = 50; // 从顶部开始的 Y 轴位置
                ctx.textAlign = 'left'; // 文本左对齐
                ctx.font = '14px Arial';
                ctx.fillText('WT: Wild Type', annotationX, annotationY);
                ctx.fillText('SgNT: Non-target', annotationX, annotationY + 20);
                ctx.fillText('Z8: ZSWIM8 Knockout', annotationX, annotationY + 40);
            
                // 绘制 "Data Source: GSE231447" 在最底部
                ctx.font = '12px Arial';
                ctx.fillText('Data Source: GSE158025, GSE160304, GSE148687', 0, y + 40); // 绘制普通文本
            
                ctx.restore();
            }
            
        }]
    });
}

function createMiRNAChart_dmelanogaster(data, miRNAName) {
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
        const tissueLabels = data.tissues[label] || [];
    
        if (values.length !== tissueLabels.length) {
            console.warn(`Mismatch in lengths for ${label}: values(${values.length}) vs tissueLabels(${tissueLabels.length})`);
        }
    
        values.forEach((value, index) => {
            scatterData.push({ x: label, y: value, tissueLabel: tissueLabels[index] || 'N/A' });
        });
    });    

    const backgroundColors = [
        'rgba(255, 99, 132, 0.5)',

        'rgba(54, 162, 235, 0.5)'

    ]; // 添加不同的颜色

    const borderColors = [
        'rgba(255, 99, 132, 1)',
     
        'rgba(54, 162, 235, 1)'
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
                    top: 50,
                    bottom: 70 // 增加底部边距，为文本和下划线腾出空间
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: miRNAName,
                    font: {
                        size: 20
                    }
                },
                legend: {
                    display: false, // 不显示图例
                },
                tooltip: { 
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
                        text: 'CPM (Count Per Million)',
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

                // 绘制第1个和第2个柱状图下的下划线和标签, stomach
                const x1 = xAxis.getPixelForTick(0); // 第一个标签的X坐标
                const x2 = xAxis.getPixelForTick(1); // 第二个标签的X坐标

                ctx.save();
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x1, y); // 起点是第一个标签的下方
                ctx.lineTo(x2, y); // 终点是第二个标签的下方
                ctx.stroke();

                ctx.fillStyle = 'black';
                ctx.textAlign = 'center';
                ctx.font = '14px Arial';
                ctx.fillText('Wild type', x1, textY); // 在第一个柱状图上方标记 "Wt"
                ctx.fillText('Dora Knock out', x2, textY); // 在第二个柱状图上方标记 "Nt"

                // 绘制 "stomach" 文本标记在下划线下方
                const StomachTextWidth = ctx.measureText('S2 cell').width;
                const StomachX = ((x1 + x2) / 2) - StomachTextWidth / 2;
                ctx.fillText('S2 cell', StomachX+25, y + 20); // 在调整后的位置绘制 "Stomach"


                // 绘制 "Data Source: GSE231447" 在最底部
                ctx.font = '12px Arial';
                ctx.fillText('Data Source: GSE160304, GSE148687',  150,  y+40); // 绘制普通文本
                
                ctx.restore();

            }
        }]
    });
}