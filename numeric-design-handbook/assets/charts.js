(function () {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: true,
      securityLevel: 'loose',
      theme: 'base',
      themeVariables: {
        darkMode: true,
        background: '#0d0a14',
        primaryColor: '#161221',
        primaryTextColor: '#e9e4f2',
        primaryBorderColor: '#4a9eff',
        lineColor: '#9c93b0',
        secondaryColor: '#1d1830',
        secondaryTextColor: '#e9e4f2',
        tertiaryColor: '#120f1c',
        tertiaryTextColor: '#e9e4f2',
        textColor: '#e9e4f2',
        clusterBkg: '#120f1c',
        clusterBorder: '#2b2440',
        edgeLabelBackground: '#0d0a14',
        fontSize: '13px'
      }
    });
  }

  // --- Chart 1: 代表公司门槛画像（雷达） ---
  var radarEl = document.getElementById('chart-company-radar');
  if (radarEl && window.echarts) {
    var radar = echarts.init(radarEl, null, { renderer: 'svg' });
    radar.setOption({
      animation: false,
      color: [accent, accent2, '#ef5350', '#81c784'],
      tooltip: { appendToBody: true },
      legend: { bottom: 0, textStyle: { color: muted, fontSize: 12 } },
      radar: {
        indicator: [
          { name: '逻辑推理', max: 100 },
          { name: '口头表达', max: 100 },
          { name: '结构化思维', max: 100 },
          { name: '外语能力', max: 100 },
          { name: '建筑专业力', max: 100 },
          { name: '人脉资源', max: 100 }
        ],
        axisName: { color: muted, fontSize: 12 },
        splitLine: { lineStyle: { color: rule } },
        splitArea: { show: false },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'radar',
        symbolSize: 4,
        data: [
          { name: '腾讯（互联网大厂）', value: [75, 70, 70, null, null, null], areaStyle: { opacity: 0.08 } },
          { name: 'Goldman Sachs（投行）', value: [88, null, 85, 85, null, null], areaStyle: { opacity: 0.08 } },
          { name: 'McKinsey（咨询）', value: [83, 77, 83, 73, null, null], areaStyle: { opacity: 0.08 } },
          { name: '中国院（传统路径）', value: [null, null, null, null, 70, null], areaStyle: { opacity: 0.08 } }
        ],
        lineStyle: { width: 2 }
      }]
    });
    window.addEventListener('resize', function () { radar.resize(); });
  }

  // --- Chart 2: 17 项主行动心理负荷净值（横向发散条形） ---
  var stressEl = document.getElementById('chart-action-load');
  if (stressEl && window.echarts) {
    // 心理负荷净值 = -Δstress + ΔselfDoubt + ΔageAnxiety（区间值取中点）
    var rawData = [
      ['旅行', -25.0],
      ['运动', -13.0],
      ['给导师送礼', -10.0],
      ['模拟群面演练', -2.0],
      ['参加校招', -1.0],
      ['重构跨界作品集', 0],
      ['产品 PRD 实战', 0],
      ['行研与商业建模', 0],
      ['做副业', 0],
      ['校友猎头局', 0],
      ['刷算法与代码', 2.0],
      ['SQL 与数据分析', 2.0],
      ['撰写学位论文', 3.0],
      ['准备雅思', 3.0],
      ['潜水挖内推', 3.0],
      ['投实习', 5.0],
      ['课题改图', 11.0]
    ];
    rawData.sort(function (a, b) { return b[1] - a[1]; });
    var categories = rawData.map(function (d) { return d[0]; });
    var values = rawData.map(function (d) { return d[1]; });
    var loadChart = echarts.init(stressEl, null, { renderer: 'svg' });
    loadChart.setOption({
      animation: false,
      tooltip: {
        appendToBody: true,
        formatter: function (p) {
          return p.name + '<br/>心理负荷净值：' + (p.value > 0 ? '+' : '') + p.value;
        }
      },
      grid: { left: 130, right: 40, top: 10, bottom: 30 },
      xAxis: {
        type: 'value',
        axisLabel: { color: muted, fontSize: 11 },
        splitLine: { lineStyle: { color: rule } }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: { color: ink, fontSize: 12 },
        axisLine: { lineStyle: { color: rule } }
      },
      series: [{
        type: 'bar',
        data: values.map(function (v) {
          return {
            value: v,
            itemStyle: { color: v >= 0 ? accent2 : accent, borderRadius: v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3] }
          };
        }),
        barWidth: 13,
        label: {
          show: true,
          position: 'right',
          color: muted,
          fontSize: 11,
          formatter: function (p) { return p.value > 0 ? '+' + p.value : (p.value < 0 ? '' + p.value : '0'); }
        }
      }]
    });
    window.addEventListener('resize', function () { loadChart.resize(); });
  }
})();
