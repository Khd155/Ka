const ADMIN_PASSWORD = 'khd2024';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // Initialize database on first request
    if (!env.DB) {
      return new Response('Database not configured', { status: 500 });
    }

    // Initialize tables if needed
    try {
      await initDB(env.DB);
    } catch (e) {
      // Tables might already exist
    }

    // Route: Track page view
    if (path === '/api/track-view' && request.method === 'POST') {
      return trackPageView(env.DB);
    }

    // Route: Submit quiz result
    if (path === '/api/submit-result' && request.method === 'POST') {
      const data = await request.json();
      return submitResult(env.DB, data);
    }

    // Route: Admin dashboard
    if (path === '/khd') {
      const password = url.searchParams.get('p');
      if (password !== ADMIN_PASSWORD) {
        return loginPage();
      }
      return adminDashboard(env.DB);
    }

    // Route: API - Get stats (with password)
    if (path === '/api/stats' && request.method === 'GET') {
      const password = url.searchParams.get('p');
      if (password !== ADMIN_PASSWORD) {
        return new Response('Unauthorized', { status: 401 });
      }
      return getStats(env.DB);
    }

    // Serve the main app
    return serveApp();
  },
};

async function initDB(db) {
  try {
    // Create tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip TEXT
      );

      CREATE TABLE IF NOT EXISTS quiz_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        quiz_mode TEXT,
        chapter TEXT,
        correct INTEGER,
        wrong INTEGER,
        total INTEGER,
        percent INTEGER,
        ip TEXT
      );
    `);
  } catch (e) {
    console.error('Database init error:', e);
  }
}

async function trackPageView(db) {
  const ip = 'unknown'; // Would need request.cf.clientIp in real scenario
  try {
    await db.prepare(`
      INSERT INTO page_views (ip) VALUES (?)
    `).bind(ip).run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function submitResult(db, data) {
  const ip = 'unknown';
  const { quizMode, chapter, correct, wrong, total, percent } = data;

  try {
    await db.prepare(`
      INSERT INTO quiz_results (quiz_mode, chapter, correct, wrong, total, percent, ip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(quizMode, chapter, correct, wrong, total, percent, ip).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS }
    });
  }
}

async function getStats(db) {
  try {
    const views = await db.prepare(`
      SELECT COUNT(*) as count FROM page_views
    `).first();

    const completed = await db.prepare(`
      SELECT COUNT(*) as count FROM quiz_results
    `).first();

    const results = await db.prepare(`
      SELECT * FROM quiz_results ORDER BY timestamp DESC LIMIT 100
    `).all();

    const avgPercent = await db.prepare(`
      SELECT AVG(percent) as avg FROM quiz_results
    `).first();

    return new Response(JSON.stringify({
      pageViews: views?.count || 0,
      completedQuizzes: completed?.count || 0,
      averageScore: Math.round(avgPercent?.avg || 0),
      results: results?.results || []
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

function loginPage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>لوحة التحكم - اختبار الكيمياء</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Cairo', sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .login-card {
          background: white;
          border-radius: 10px;
          padding: 3rem;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          max-width: 400px;
          width: 90%;
        }
        h1 {
          text-align: center;
          margin-bottom: 2rem;
          color: #333;
        }
        .form-group {
          margin-bottom: 1.5rem;
        }
        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #555;
          font-weight: 600;
        }
        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 1rem;
        }
        button {
          width: 100%;
          padding: 0.75rem;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }
        button:hover {
          background: #764ba2;
        }
      </style>
    </head>
    <body>
      <div class="login-card">
        <h1>🔐 لوحة التحكم</h1>
        <form>
          <div class="form-group">
            <label for="password">كلمة المرور:</label>
            <input type="password" id="password" name="p" required>
          </div>
          <button type="submit">دخول</button>
        </form>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

async function adminDashboard(db) {
  const stats = await getStats(db).then(r => r.json());

  const resultsHTML = stats.results.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.chapter || 'كامل'}</td>
      <td>${r.correct}/${r.total}</td>
      <td>${r.percent}%</td>
      <td>${new Date(r.timestamp).toLocaleString('ar')}</td>
    </tr>
  `).join('');

  return new Response(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>الإحصائيات - اختبار الكيمياء</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Cairo', sans-serif;
          background: #f5f5f5;
          padding: 2rem;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        header {
          background: white;
          padding: 2rem;
          border-radius: 10px;
          margin-bottom: 2rem;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        h1 { color: #333; }
        .logout {
          background: #e74c3c;
          color: white;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          text-decoration: none;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .stat-card h3 {
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 0.5rem;
        }
        .stat-card .number {
          font-size: 2.5rem;
          font-weight: bold;
          color: #667eea;
        }
        .results-table {
          background: white;
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        thead {
          background: #667eea;
          color: white;
        }
        th, td {
          padding: 1rem;
          text-align: right;
          border-bottom: 1px solid #eee;
        }
        tr:hover {
          background: #f9f9f9;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>📊 الإحصائيات</h1>
          <a href="/" class="logout">الرجوع للاختبار</a>
        </header>

        <div class="stats">
          <div class="stat-card">
            <h3>👥 زيارات الصفحة</h3>
            <div class="number">${stats.pageViews}</div>
          </div>
          <div class="stat-card">
            <h3>✅ اختبارات مكتملة</h3>
            <div class="number">${stats.completedQuizzes}</div>
          </div>
          <div class="stat-card">
            <h3>📈 متوسط النتيجة</h3>
            <div class="number">${stats.averageScore}%</div>
          </div>
        </div>

        <div class="results-table">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>الفصل/الاختبار</th>
                <th>النتيجة</th>
                <th>النسبة</th>
                <th>الوقت</th>
              </tr>
            </thead>
            <tbody>
              ${resultsHTML || '<tr><td colspan="5" style="text-align: center;">لا توجد نتائج حتى الآن</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function serveApp() {
  // Serve the main quiz app
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>اختبار الكيمياء</title>
      <meta http-equiv="refresh" content="0;url=/">
    </head>
    <body>
      <p>جاري التحويل...</p>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}
