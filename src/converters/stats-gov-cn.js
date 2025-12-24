/**
 * 国家统计局时间序列数据转换器
 * 数据格式：行为指标，列为时间段（如"2025年11月"）
 * 输出格式：按指标分组，每个指标下按时间排序的数据
 */
module.exports = function convert(csvContent) {
  const lines = csvContent.trim().split('\n');

  // 跳过元数据行，找到包含"指标"的行作为表头
  let headerLineIndex = -1;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].includes('指标')) {
      headerLineIndex = i;
      break;
    }
  }

  if (headerLineIndex === -1) {
    return [];
  }

  // 解析表头获取时间列
  const headerCells = parseCSVLine(lines[headerLineIndex]);
  const timeColumns = [];

  for (let i = 1; i < headerCells.length; i++) {
    const cell = headerCells[i].trim();
    const match = cell.match(/(\d{4})年(\d{1,2})月/);
    if (match) {
      timeColumns.push({
        index: i,
        year: parseInt(match[1], 10),
        month: parseInt(match[2], 10)
      });
    }
  }

  // 按时间排序（从早到晚）
  timeColumns.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });

  // 解析数据行，按指标分组
  const result = [];

  for (let i = headerLineIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.includes('数据来源')) continue;

    const cells = parseCSVLine(line);
    const indicator = cells[0]?.trim();

    if (!indicator) continue;

    // 为每个指标创建一个对象，包含时间序列数据
    const indicatorData = {
      indicator: indicator,
      data: []
    };

    // 按时间顺序添加数据点
    for (const tc of timeColumns) {
      const valueStr = cells[tc.index]?.trim();
      const value = valueStr ? parseFloat(valueStr) : null;

      if (value !== null && !isNaN(value)) {
        indicatorData.data.push({
          year: tc.year,
          month: tc.month,
          value: value
        });
      }
    }

    result.push(indicatorData);
  }

  return result;
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
