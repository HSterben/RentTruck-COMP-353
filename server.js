require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'test_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10
});

const query = async (sql, params) => {
  const [rows] = await pool.execute(sql, params || []);
  return rows;
};

// MySQL DATETIME from browser datetime-local or string
function toMysqlDateTime(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (s.includes('T')) {
    const [d, t] = s.split('T');
    const time = t && t.length === 5 ? `${t}:00` : t;
    return `${d} ${time || '00:00:00'}`;
  }
  return s;
}

// DB ping
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1 AS ok');
    res.json({ ok: true, database: process.env.DB_NAME || 'test_db' });
  } catch (e) {
    res.status(503).json({ ok: false, error: e.message });
  }
});

// ==================== CUSTOMERS ====================

app.get('/api/customers', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM Customer ORDER BY customer_id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM Customer WHERE customer_id = ?', [req.params.id]);
    res.json(rows[0] || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { customer_type, business_name, first_name, last_name, address, contact } = req.body;
    const result = await query(
      'INSERT INTO Customer (customer_type, business_name, first_name, last_name, address, contact) VALUES (?,?,?,?,?,?)',
      [customer_type, business_name || null, first_name || null, last_name || null, address, contact]
    );
    res.json({ id: result.insertId, message: 'Customer created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    const { customer_type, business_name, first_name, last_name, address, contact } = req.body;
    await query(
      'UPDATE Customer SET customer_type=?, business_name=?, first_name=?, last_name=?, address=?, contact=? WHERE customer_id=?',
      [customer_type, business_name || null, first_name || null, last_name || null, address, contact, req.params.id]
    );
    res.json({ message: 'Customer updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await query('DELETE FROM Customer WHERE customer_id = ?', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== DRIVERS ====================

app.get('/api/drivers', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM Driver ORDER BY driver_id');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/drivers', async (req, res) => {
  try {
    const { first_name, last_name, license_type, contact_driver } = req.body;
    const result = await query(
      'INSERT INTO Driver (first_name, last_name, license_type, contact_driver) VALUES (?,?,?,?)',
      [first_name, last_name, license_type, contact_driver]
    );
    res.json({ id: result.insertId, message: 'Driver created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/drivers/:id', async (req, res) => {
  try {
    const { first_name, last_name, license_type, contact_driver } = req.body;
    await query(
      'UPDATE Driver SET first_name=?, last_name=?, license_type=?, contact_driver=? WHERE driver_id=?',
      [first_name, last_name, license_type, contact_driver, req.params.id]
    );
    res.json({ message: 'Driver updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/drivers/:id', async (req, res) => {
  try {
    await query('DELETE FROM Driver WHERE driver_id = ?', [req.params.id]);
    res.json({ message: 'Driver deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== TRUCKS ====================

app.get('/api/trucks', async (req, res) => {
  try {
    const rows = await query(
      `SELECT t.*, tt.rate_per_hour, tt.rate_per_km 
       FROM Truck t JOIN TruckType tt ON t.truck_type = tt.truck_type 
       ORDER BY t.truck_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/trucktypes', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM TruckType');
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/trucks', async (req, res) => {
  try {
    const { brand, model, truck_type, license_plate } = req.body;
    const result = await query(
      'INSERT INTO Truck (brand, model, truck_type, license_plate) VALUES (?,?,?,?)',
      [brand, model, truck_type, license_plate]
    );
    res.json({ id: result.insertId, message: 'Truck created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/trucks/:id', async (req, res) => {
  try {
    const { brand, model, truck_type, license_plate } = req.body;
    await query(
      'UPDATE Truck SET brand=?, model=?, truck_type=?, license_plate=? WHERE truck_id=?',
      [brand, model, truck_type, license_plate, req.params.id]
    );
    res.json({ message: 'Truck updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/trucks/:id', async (req, res) => {
  try {
    await query('DELETE FROM Truck WHERE truck_id = ?', [req.params.id]);
    res.json({ message: 'Truck deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== RESERVATIONS ====================

app.get('/api/reservations', async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, 
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name
       FROM Reservation r 
       JOIN Customer c ON r.customer_id = c.customer_id 
       ORDER BY r.reservation_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { customer_id, reservation_date, status } = req.body;
    const result = await query(
      'INSERT INTO Reservation (customer_id, reservation_date, status) VALUES (?,?,?)',
      [customer_id, reservation_date, status || 'Active']
    );
    res.json({ id: result.insertId, message: 'Reservation created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reservations/:id', async (req, res) => {
  try {
    const { customer_id, reservation_date, status } = req.body;
    await query(
      'UPDATE Reservation SET customer_id=?, reservation_date=?, status=? WHERE reservation_id=?',
      [customer_id, reservation_date, status, req.params.id]
    );
    res.json({ message: 'Reservation updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reservations/:id', async (req, res) => {
  try {
    await query('DELETE FROM Reservation WHERE reservation_id = ?', [req.params.id]);
    res.json({ message: 'Reservation deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== MISSIONS ====================

app.get('/api/missions', async (req, res) => {
  try {
    const rows = await query(
      `SELECT m.*, 
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
        CONCAT(t.brand, ' ', t.model) AS truck_name,
        t.license_plate
       FROM Mission m
       JOIN Driver d ON m.driver_id = d.driver_id
       JOIN Truck t ON m.truck_id = t.truck_id
       ORDER BY m.mission_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/missions', async (req, res) => {
  try {
    const b = req.body;
    const planned_start = toMysqlDateTime(b.planned_start);
    const planned_end = toMysqlDateTime(b.planned_end);
    const actual_start = toMysqlDateTime(b.actual_start);
    const actual_end = toMysqlDateTime(b.actual_end);
    const ob = b.odometer_before === '' || b.odometer_before == null ? null : Number(b.odometer_before);
    const oa = b.odometer_after === '' || b.odometer_after == null ? null : Number(b.odometer_after);
    const result = await query(
      `INSERT INTO Mission (reservation_id, truck_id, driver_id, rendezvous_place, req_truck_type,
        planned_start, planned_end, actual_start, actual_end, odometer_before, odometer_after, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [b.reservation_id, b.truck_id, b.driver_id, b.rendezvous_place, b.req_truck_type,
        planned_start, planned_end, actual_start, actual_end,
        ob, oa, b.status || 'Scheduled']
    );
    res.json({ id: result.insertId, message: 'Mission created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/missions/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const b = req.body;
    const planned_start = toMysqlDateTime(b.planned_start);
    const planned_end = toMysqlDateTime(b.planned_end);
    const actual_start = toMysqlDateTime(b.actual_start);
    const actual_end = toMysqlDateTime(b.actual_end);
    const ob = b.odometer_before === '' || b.odometer_before == null ? null : Number(b.odometer_before);
    const oa = b.odometer_after === '' || b.odometer_after == null ? null : Number(b.odometer_after);
    await conn.execute(
      `UPDATE Mission SET reservation_id=?, truck_id=?, driver_id=?, rendezvous_place=?, req_truck_type=?,
        planned_start=?, planned_end=?, actual_start=?, actual_end=?,
        odometer_before=?, odometer_after=?, status=?
       WHERE mission_id=?`,
      [b.reservation_id, b.truck_id, b.driver_id, b.rendezvous_place, b.req_truck_type,
        planned_start, planned_end, actual_start, actual_end,
        ob, oa, b.status, req.params.id]
    );
    await conn.commit();
    res.json({ message: 'Mission updated (transaction committed)' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

app.put('/api/missions/:id/cancel', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "UPDATE Mission SET status = 'Cancelled', actual_start = NULL, actual_end = NULL WHERE mission_id = ?",
      [req.params.id]
    );
    await conn.commit();
    res.json({ message: 'Mission cancelled (transaction committed)' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally { conn.release(); }
});

app.delete('/api/missions/:id', async (req, res) => {
  try {
    await query('DELETE FROM Mission WHERE mission_id = ?', [req.params.id]);
    res.json({ message: 'Mission deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== INVOICES ====================

app.get('/api/invoices', async (req, res) => {
  try {
    const rows = await query(
      `SELECT i.*, 
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name
       FROM Invoice i
       JOIN Customer c ON i.customer_id = c.customer_id
       ORDER BY i.invoice_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/invoices/:id/lines', async (req, res) => {
  try {
    const rows = await query(
      `SELECT mi.*, m.rendezvous_place, m.planned_start, m.planned_end,
        CONCAT(t.brand, ' ', t.model) AS truck_name
       FROM MissionInvoice mi
       JOIN Mission m ON mi.mission_id = m.mission_id
       JOIN Truck t ON m.truck_id = t.truck_id
       WHERE mi.invoice_id = ?`,
      [req.params.id]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { customer_id, invoice_date, total_amount, payment_status, payment_method, payment_date } = req.body;
    const ta = total_amount === '' || total_amount == null ? 0 : Number(total_amount);
    const result = await query(
      `INSERT INTO Invoice (customer_id, invoice_date, total_amount, payment_status, payment_method, payment_date)
       VALUES (?,?,?,?,?,?)`,
      [customer_id, invoice_date, ta, payment_status || 'Unpaid', payment_method || null, payment_date || null]
    );
    res.json({ id: result.insertId, message: 'Invoice created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/invoices/:id/pay', async (req, res) => {
  try {
    const { payment_method } = req.body;
    await query(
      "UPDATE Invoice SET payment_status='Paid', payment_method=?, payment_date=CURDATE() WHERE invoice_id=?",
      [payment_method, req.params.id]
    );
    res.json({ message: 'Invoice paid' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/invoices/:id', async (req, res) => {
  try {
    const { customer_id, invoice_date, total_amount, payment_status, payment_method, payment_date } = req.body;
    const ta = total_amount === '' || total_amount == null ? 0 : Number(total_amount);
    await query(
      `UPDATE Invoice SET customer_id=?, invoice_date=?, total_amount=?, payment_status=?, payment_method=?, payment_date=?
       WHERE invoice_id=?`,
      [customer_id, invoice_date, ta, payment_status, payment_method || null, payment_date || null, req.params.id]
    );
    res.json({ message: 'Invoice updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await query('DELETE FROM Invoice WHERE invoice_id = ?', [req.params.id]);
    res.json({ message: 'Invoice deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/missioninvoice', async (req, res) => {
  try {
    const { invoice_id, mission_id } = req.body;
    await query(
      'INSERT INTO MissionInvoice (invoice_id, mission_id, duration_hours, km_traveled, duration_cost, km_cost, line_total) VALUES (?,?,0,0,0,0,0)',
      [invoice_id, mission_id]
    );
    res.json({ message: 'Invoice line added (auto-calculated by trigger)' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== QUERIES ====================

app.get('/api/queries/a', async (req, res) => {
  try {
    const rows = await query(
      "SELECT customer_id, business_name, address, contact FROM Customer WHERE customer_type = 'Business' ORDER BY customer_id"
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/b', async (req, res) => {
  try {
    const rows = await query(
      `SELECT r.*, COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name
       FROM Reservation r JOIN Customer c ON r.customer_id = c.customer_id
       WHERE r.reservation_id > 1 ORDER BY r.reservation_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/c', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT d.driver_id, d.first_name, d.last_name, d.license_type,
        t.truck_id, t.brand, t.model, t.license_plate
       FROM Mission m
       JOIN Driver d ON m.driver_id = d.driver_id
       JOIN Truck t ON m.truck_id = t.truck_id
       ORDER BY d.driver_id, t.truck_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/d', async (req, res) => {
  try {
    const rows = await query(
      `SELECT m.mission_id, m.planned_start, m.planned_end, m.rendezvous_place, m.status,
        CONCAT(d.first_name, ' ', d.last_name) AS driver_name, d.license_type,
        CONCAT(t.brand, ' ', t.model) AS truck_name, t.license_plate
       FROM Mission m
       JOIN Driver d ON m.driver_id = d.driver_id
       JOIN Truck t ON m.truck_id = t.truck_id
       WHERE m.planned_start <= '2026-03-18 23:59:59' AND m.planned_end >= '2026-03-11 00:00:00'
       ORDER BY m.planned_start`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/e', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT c.customer_id,
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name,
        c.contact, i.invoice_id, i.total_amount, i.invoice_date
       FROM Customer c
       JOIN Invoice i ON c.customer_id = i.customer_id
       WHERE i.payment_status = 'Unpaid'
       ORDER BY c.customer_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/f', async (req, res) => {
  try {
    const rows = await query(
      `SELECT DISTINCT d.driver_id, d.first_name, d.last_name, d.license_type
       FROM Driver d
       JOIN Mission m ON d.driver_id = m.driver_id
       JOIN Truck t ON m.truck_id = t.truck_id
       WHERE t.brand = 'GMC'
       ORDER BY d.driver_id`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/g', async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.customer_id,
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name,
        i.invoice_id, i.total_amount
       FROM Customer c
       JOIN Invoice i ON c.customer_id = i.customer_id
       WHERE i.total_amount > 1000
       ORDER BY i.total_amount DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/h', async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.customer_id,
        COALESCE(c.business_name, CONCAT(c.first_name, ' ', c.last_name)) AS customer_name,
        COUNT(i.invoice_id) AS invoice_count
       FROM Customer c
       LEFT JOIN Invoice i ON c.customer_id = i.customer_id
       GROUP BY c.customer_id
       ORDER BY invoice_count DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/queries/i', async (req, res) => {
  try {
    const rows = await query(
      `SELECT d.first_name, d.last_name,
        (m.odometer_after - m.odometer_before) AS km_traveled,
        m.mission_id, m.planned_start, m.planned_end
       FROM Driver d
       JOIN Mission m ON d.driver_id = m.driver_id
       WHERE m.planned_start >= '2026-02-01' AND m.planned_end <= '2026-03-31 23:59:59'
         AND (m.odometer_after - m.odometer_before) > 7000
       ORDER BY km_traveled DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`RENTRUCK server running on http://localhost:${PORT}`);
});
