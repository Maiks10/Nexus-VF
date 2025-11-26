const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'crm_db',
    password: 'MaikSystem1',
    port: 5432,
});

(async () => {
    try {
        const hash = await bcrypt.hash('123456', 10);
        console.log('Generated Hash:', hash);
        const res = await pool.query("UPDATE users SET password_hash = $1 WHERE email = 'admin@nexusflow.com' RETURNING *", [hash]);
        console.log('Update Result:', res.rows[0]);
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
})();
