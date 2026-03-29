export const generateReceipt = (data: {
  type: 'package' | 'exact';
  price: number;
  discount: number;
  time: string;
  isFast: boolean;
  modsCount: number;
  totalWords: number;
  modsList?: { name: string; words: number; tags: string[] }[];
}) => {
  const date = new Date().toLocaleString('ru-RU');
  
  const modsHtml = data.modsList ? `
    <div class="section">
      <h2>Выбранные моды (${data.modsCount})</h2>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Слова</th>
            <th>Теги</th>
          </tr>
        </thead>
        <tbody>
          ${data.modsList.map(m => `
            <tr>
              <td><strong>${m.name}</strong></td>
              <td>${m.words.toLocaleString('ru-RU')}</td>
              <td>${m.tags.join(', ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  ` : `
    <div class="section">
      <h2>Пакетный заказ</h2>
      <p>Количество модов: <strong>${data.modsCount}</strong></p>
    </div>
  `;

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Заказ на перевод KTT4 - ${date}</title>
  <style>
    :root {
      --bg: #0a0a0c;
      --surface: #141418;
      --primary: #00f0ff;
      --secondary: #7000ff;
      --text: #ffffff;
      --text-muted: #888888;
      --border: #222222;
    }
    body {
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      color: var(--primary);
      margin: 0 0 10px 0;
      font-size: 32px;
    }
    .date {
      color: var(--text-muted);
      font-size: 14px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .summary-card .label {
      color: var(--text-muted);
      font-size: 14px;
      margin-bottom: 8px;
    }
    .summary-card .value {
      font-size: 24px;
      font-weight: bold;
      color: var(--text);
    }
    .summary-card .value.price {
      color: var(--primary);
      font-size: 32px;
    }
    .section {
      margin-bottom: 40px;
    }
    h2 {
      color: var(--secondary);
      font-size: 20px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    th {
      color: var(--text-muted);
      font-weight: normal;
      font-size: 14px;
    }
    tr:hover {
      background: rgba(255,255,255,0.02);
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      background: rgba(0, 240, 255, 0.1);
      color: var(--primary);
      border: 1px solid rgba(0, 240, 255, 0.2);
    }
    .badge.fast {
      background: rgba(112, 0, 255, 0.1);
      color: #b070ff;
      border-color: rgba(112, 0, 255, 0.3);
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid var(--border);
      color: var(--text-muted);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Заказ на перевод KTT4</h1>
      <div class="date">Сформировано: ${date}</div>
    </div>

    <div class="summary-grid">
      <div class="summary-card">
        <div class="label">Итоговая стоимость</div>
        <div class="value price">${Math.round(data.price).toLocaleString('ru-RU')} ₽</div>
      </div>
      <div class="summary-card">
        <div class="label">Всего слов</div>
        <div class="value">${data.totalWords.toLocaleString('ru-RU')}</div>
      </div>
      <div class="summary-card">
        <div class="label">Примерное время</div>
        <div class="value">${data.time}</div>
      </div>
      <div class="summary-card">
        <div class="label">Скорость</div>
        <div class="value">
          ${data.isFast ? '<span class="badge fast">Высокая (x8)</span>' : '<span class="badge">Обычная</span>'}
        </div>
      </div>
    </div>

    ${modsHtml}

    <div class="footer">
      <p>Пожалуйста, отправьте этот файл в наш Discord канал для оформления заказа.</p>
      <p>Скидка за объем: <strong>${data.discount}%</strong></p>
    </div>
  </div>
</body>
</html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `KTT4_Order_${new Date().getTime()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Open Discord link
  window.open('https://discord.gg/ktt4', '_blank');
};
