const API = '';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// State
let currentPage = 'dashboard';

// API helpers
const api = {
  get: (url) => fetch(API + url).then(r => r.json()),
  post: (url, data) => fetch(API + url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  put: (url, data) => fetch(API + url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  del: (url) => fetch(API + url, { method: 'DELETE' }).then(r => r.json()),
};

// Toast
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2500);
}

// Modal
function openModal(title, fields, onSave) {
  $('#modal-title').textContent = title;
  const form = $('#modal-form');
  form.innerHTML = fields.map(f => {
    if (f.type === 'select') {
      const opts = f.options.map(o => `<option value="${o.value}" ${o.value == f.value ? 'selected' : ''}>${o.label}</option>`).join('');
      return `<div class="form-group"><label>${f.label}</label><select name="${f.name}">${opts}</select></div>`;
    }
    const val = f.value !== undefined && f.value !== null ? f.value : '';
    return `<div class="form-group"><label>${f.label}</label><input type="${f.type || 'text'}" name="${f.name}" value="${val}" ${f.required ? 'required' : ''} ${f.step ? `step="${f.step}"` : ''}></div>`;
  }).join('');

  $('#modal-overlay').classList.remove('hidden');
  $('#modal-save').onclick = () => {
    const data = {};
    form.querySelectorAll('input, select').forEach(el => {
      data[el.name] = el.value === '' ? null : el.value;
    });
    onSave(data);
    closeModal();
  };
}

function closeModal() { $('#modal-overlay').classList.add('hidden'); }
$('#modal-close').onclick = closeModal;
$('#modal-cancel').onclick = closeModal;
$('#modal-overlay').onclick = (e) => { if (e.target === $('#modal-overlay')) closeModal(); };

// Badge helper
function badge(val) {
  const cls = {
    Active: 'badge-active', Completed: 'badge-completed', Paid: 'badge-paid',
    Cancelled: 'badge-cancelled', Unpaid: 'badge-unpaid',
    Scheduled: 'badge-scheduled', Ongoing: 'badge-ongoing'
  };
  return `<span class="badge ${cls[val] || ''}">${val}</span>`;
}

// Format helpers
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '-'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : '-'; }
function fmtMoney(v) { return v != null ? `$${Number(v).toFixed(2)}` : '-'; }

// ========================= PAGES =========================

// Dashboard
async function renderDashboard() {
  const [customers, drivers, trucks, missions, invoices] = await Promise.all([
    api.get('/api/customers'), api.get('/api/drivers'), api.get('/api/trucks'),
    api.get('/api/missions'), api.get('/api/invoices')
  ]);
  const active = missions.filter(m => m.status === 'Scheduled' || m.status === 'Ongoing').length;
  const unpaid = invoices.filter(i => i.payment_status === 'Unpaid').length;

  $('#content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-value">${customers.length}</div><div class="stat-label">Customers</div></div>
      <div class="stat-card"><div class="stat-value">${drivers.length}</div><div class="stat-label">Drivers</div></div>
      <div class="stat-card"><div class="stat-value">${trucks.length}</div><div class="stat-label">Trucks</div></div>
      <div class="stat-card"><div class="stat-value">${missions.length}</div><div class="stat-label">Missions</div></div>
      <div class="stat-card"><div class="stat-value">${active}</div><div class="stat-label">Active Missions</div></div>
      <div class="stat-card"><div class="stat-value">${unpaid}</div><div class="stat-label">Unpaid Invoices</div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>Recent Missions</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Driver</th><th>Truck</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
        <tbody>${missions.slice(-5).reverse().map(m => `
          <tr><td>${m.mission_id}</td><td>${m.driver_name}</td><td>${m.truck_name}</td>
          <td>${fmtDateTime(m.planned_start)}</td><td>${fmtDateTime(m.planned_end)}</td><td>${badge(m.status)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

// Customers
async function renderCustomers() {
  const rows = await api.get('/api/customers');
  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Customers</h3><button class="btn btn-primary btn-sm" id="add-customer">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Address</th><th>Contact</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(c => `
          <tr>
            <td>${c.customer_id}</td><td>${badge(c.customer_type === 'Business' ? 'Active' : 'Scheduled').replace(/Active|Scheduled/, c.customer_type)}</td>
            <td>${c.business_name || (c.first_name + ' ' + c.last_name)}</td><td>${c.address}</td><td>${c.contact}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm edit-customer" data-id="${c.customer_id}">Edit</button>
              <button class="btn btn-danger btn-sm del-customer" data-id="${c.customer_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  $('#add-customer').onclick = () => customerForm();
  $$('.edit-customer').forEach(b => b.onclick = () => customerForm(rows.find(c => c.customer_id == b.dataset.id)));
  $$('.del-customer').forEach(b => b.onclick = async () => {
    if (confirm('Delete this customer?')) {
      const res = await api.del('/api/customers/' + b.dataset.id);
      toast(res.message || res.error);
      renderCustomers();
    }
  });
}

function customerForm(c = null) {
  openModal(c ? 'Edit Customer' : 'New Customer', [
    { name: 'customer_type', label: 'Type', type: 'select', value: c?.customer_type || 'Individual',
      options: [{ value: 'Individual', label: 'Individual' }, { value: 'Business', label: 'Business' }] },
    { name: 'business_name', label: 'Business Name', value: c?.business_name },
    { name: 'first_name', label: 'First Name', value: c?.first_name },
    { name: 'last_name', label: 'Last Name', value: c?.last_name },
    { name: 'address', label: 'Address', value: c?.address, required: true },
    { name: 'contact', label: 'Contact', value: c?.contact, required: true },
  ], async (data) => {
    const res = c
      ? await api.put('/api/customers/' + c.customer_id, data)
      : await api.post('/api/customers', data);
    toast(res.message || res.error);
    renderCustomers();
  });
}

// Drivers
async function renderDrivers() {
  const rows = await api.get('/api/drivers');
  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Drivers</h3><button class="btn btn-primary btn-sm" id="add-driver">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Name</th><th>License</th><th>Contact</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(d => `
          <tr>
            <td>${d.driver_id}</td><td>${d.first_name} ${d.last_name}</td><td>${d.license_type}</td><td>${d.contact_driver}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm edit-driver" data-id="${d.driver_id}">Edit</button>
              <button class="btn btn-danger btn-sm del-driver" data-id="${d.driver_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  $('#add-driver').onclick = () => driverForm();
  $$('.edit-driver').forEach(b => b.onclick = () => driverForm(rows.find(d => d.driver_id == b.dataset.id)));
  $$('.del-driver').forEach(b => b.onclick = async () => {
    if (confirm('Delete this driver?')) {
      const res = await api.del('/api/drivers/' + b.dataset.id);
      toast(res.message || res.error);
      renderDrivers();
    }
  });
}

function driverForm(d = null) {
  openModal(d ? 'Edit Driver' : 'New Driver', [
    { name: 'first_name', label: 'First Name', value: d?.first_name, required: true },
    { name: 'last_name', label: 'Last Name', value: d?.last_name, required: true },
    { name: 'license_type', label: 'License Type', type: 'select', value: d?.license_type || 'Tourism',
      options: [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }] },
    { name: 'contact_driver', label: 'Contact', value: d?.contact_driver, required: true },
  ], async (data) => {
    const res = d
      ? await api.put('/api/drivers/' + d.driver_id, data)
      : await api.post('/api/drivers', data);
    toast(res.message || res.error);
    renderDrivers();
  });
}

// Trucks
async function renderTrucks() {
  const rows = await api.get('/api/trucks');
  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Trucks</h3><button class="btn btn-primary btn-sm" id="add-truck">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Brand</th><th>Model</th><th>Type</th><th>Plate</th><th>$/hr</th><th>$/km</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(t => `
          <tr>
            <td>${t.truck_id}</td><td>${t.brand}</td><td>${t.model}</td><td>${t.truck_type}</td>
            <td>${t.license_plate}</td><td>${fmtMoney(t.rate_per_hour)}</td><td>${fmtMoney(t.rate_per_km)}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm edit-truck" data-id="${t.truck_id}">Edit</button>
              <button class="btn btn-danger btn-sm del-truck" data-id="${t.truck_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  $('#add-truck').onclick = () => truckForm();
  $$('.edit-truck').forEach(b => b.onclick = () => truckForm(rows.find(t => t.truck_id == b.dataset.id)));
  $$('.del-truck').forEach(b => b.onclick = async () => {
    if (confirm('Delete this truck?')) {
      const res = await api.del('/api/trucks/' + b.dataset.id);
      toast(res.message || res.error);
      renderTrucks();
    }
  });
}

function truckForm(t = null) {
  openModal(t ? 'Edit Truck' : 'New Truck', [
    { name: 'brand', label: 'Brand', value: t?.brand, required: true },
    { name: 'model', label: 'Model', value: t?.model, required: true },
    { name: 'truck_type', label: 'Type', type: 'select', value: t?.truck_type || 'Tourism',
      options: [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }] },
    { name: 'license_plate', label: 'License Plate', value: t?.license_plate, required: true },
  ], async (data) => {
    const res = t
      ? await api.put('/api/trucks/' + t.truck_id, data)
      : await api.post('/api/trucks', data);
    toast(res.message || res.error);
    renderTrucks();
  });
}

// Reservations
async function renderReservations() {
  const [rows, customers] = await Promise.all([
    api.get('/api/reservations'), api.get('/api/customers')
  ]);
  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Reservations</h3><button class="btn btn-primary btn-sm" id="add-res">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(r => `
          <tr>
            <td>${r.reservation_id}</td><td>${r.customer_name}</td><td>${fmtDate(r.reservation_date)}</td><td>${badge(r.status)}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm edit-res" data-id="${r.reservation_id}">Edit</button>
              <button class="btn btn-danger btn-sm del-res" data-id="${r.reservation_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  const custOpts = customers.map(c => ({ value: c.customer_id, label: c.business_name || (c.first_name + ' ' + c.last_name) }));

  $('#add-res').onclick = () => resForm(null, custOpts);
  $$('.edit-res').forEach(b => b.onclick = () => resForm(rows.find(r => r.reservation_id == b.dataset.id), custOpts));
  $$('.del-res').forEach(b => b.onclick = async () => {
    if (confirm('Delete this reservation?')) {
      const res = await api.del('/api/reservations/' + b.dataset.id);
      toast(res.message || res.error);
      renderReservations();
    }
  });
}

function resForm(r = null, custOpts) {
  const dateVal = r?.reservation_date ? new Date(r.reservation_date).toISOString().split('T')[0] : '';
  openModal(r ? 'Edit Reservation' : 'New Reservation', [
    { name: 'customer_id', label: 'Customer', type: 'select', value: r?.customer_id, options: custOpts },
    { name: 'reservation_date', label: 'Date', type: 'date', value: dateVal, required: true },
    { name: 'status', label: 'Status', type: 'select', value: r?.status || 'Active',
      options: [{ value: 'Active', label: 'Active' }, { value: 'Cancelled', label: 'Cancelled' }] },
  ], async (data) => {
    const res = r
      ? await api.put('/api/reservations/' + r.reservation_id, data)
      : await api.post('/api/reservations', data);
    toast(res.message || res.error);
    renderReservations();
  });
}

// Missions
async function renderMissions() {
  const [rows, reservations, trucks, drivers] = await Promise.all([
    api.get('/api/missions'), api.get('/api/reservations'), api.get('/api/trucks'), api.get('/api/drivers')
  ]);

  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Missions</h3><button class="btn btn-primary btn-sm" id="add-mission">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Res#</th><th>Driver</th><th>Truck</th><th>Location</th><th>Start</th><th>End</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(m => `
          <tr>
            <td>${m.mission_id}</td><td>${m.reservation_id}</td><td>${m.driver_name}</td><td>${m.truck_name}</td>
            <td>${m.rendezvous_place.substring(0, 30)}...</td>
            <td>${fmtDateTime(m.planned_start)}</td><td>${fmtDateTime(m.planned_end)}</td><td>${badge(m.status)}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm edit-mission" data-id="${m.mission_id}">Edit</button>
              ${m.status !== 'Cancelled' ? `<button class="btn btn-warn btn-sm cancel-mission" data-id="${m.mission_id}">Cancel</button>` : ''}
              <button class="btn btn-danger btn-sm del-mission" data-id="${m.mission_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;

  const resOpts = reservations.map(r => ({ value: r.reservation_id, label: `#${r.reservation_id} - ${r.customer_name}` }));
  const truckOpts = trucks.map(t => ({ value: t.truck_id, label: `${t.brand} ${t.model} (${t.license_plate})` }));
  const driverOpts = drivers.map(d => ({ value: d.driver_id, label: `${d.first_name} ${d.last_name} [${d.license_type}]` }));

  $('#add-mission').onclick = () => missionForm(null, resOpts, truckOpts, driverOpts);
  $$('.edit-mission').forEach(b => b.onclick = () => missionForm(rows.find(m => m.mission_id == b.dataset.id), resOpts, truckOpts, driverOpts));
  $$('.cancel-mission').forEach(b => b.onclick = async () => {
    if (confirm('Cancel this mission?')) {
      const res = await api.put('/api/missions/' + b.dataset.id + '/cancel');
      toast(res.message || res.error);
      renderMissions();
    }
  });
  $$('.del-mission').forEach(b => b.onclick = async () => {
    if (confirm('Delete this mission?')) {
      const res = await api.del('/api/missions/' + b.dataset.id);
      toast(res.message || res.error);
      renderMissions();
    }
  });
}

function fmtDT(d) { return d ? new Date(d).toISOString().slice(0, 16) : ''; }

function missionForm(m = null, resOpts, truckOpts, driverOpts) {
  const typeOpts = [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }];
  const statusOpts = [{ value: 'Scheduled', label: 'Scheduled' }, { value: 'Ongoing', label: 'Ongoing' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }];

  openModal(m ? 'Edit Mission (Query J)' : 'New Mission', [
    { name: 'reservation_id', label: 'Reservation', type: 'select', value: m?.reservation_id, options: resOpts },
    { name: 'truck_id', label: 'Truck', type: 'select', value: m?.truck_id, options: truckOpts },
    { name: 'driver_id', label: 'Driver', type: 'select', value: m?.driver_id, options: driverOpts },
    { name: 'rendezvous_place', label: 'Location', value: m?.rendezvous_place, required: true },
    { name: 'req_truck_type', label: 'Required Type', type: 'select', value: m?.req_truck_type, options: typeOpts },
    { name: 'planned_start', label: 'Planned Start', type: 'datetime-local', value: fmtDT(m?.planned_start), required: true },
    { name: 'planned_end', label: 'Planned End', type: 'datetime-local', value: fmtDT(m?.planned_end), required: true },
    { name: 'actual_start', label: 'Actual Start', type: 'datetime-local', value: fmtDT(m?.actual_start) },
    { name: 'actual_end', label: 'Actual End', type: 'datetime-local', value: fmtDT(m?.actual_end) },
    { name: 'odometer_before', label: 'Odometer Before', type: 'number', value: m?.odometer_before },
    { name: 'odometer_after', label: 'Odometer After', type: 'number', value: m?.odometer_after },
    { name: 'status', label: 'Status', type: 'select', value: m?.status || 'Scheduled', options: statusOpts },
  ], async (data) => {
    const res = m
      ? await api.put('/api/missions/' + m.mission_id, data)
      : await api.post('/api/missions', data);
    toast(res.message || res.error);
    renderMissions();
  });
}

// Invoices
async function renderInvoices() {
  const [rows, customers] = await Promise.all([
    api.get('/api/invoices'), api.get('/api/customers')
  ]);

  $('#content').innerHTML = `
    <div class="card">
      <div class="card-header"><h3>All Invoices</h3><button class="btn btn-primary btn-sm" id="add-invoice">+ Add</button></div>
      <div class="table-wrap"><table>
        <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Method</th><th>Actions</th></tr></thead>
        <tbody>${rows.map(i => `
          <tr>
            <td>${i.invoice_id}</td><td>${i.customer_name}</td><td>${fmtDate(i.invoice_date)}</td>
            <td>${fmtMoney(i.total_amount)}</td><td>${badge(i.payment_status)}</td><td>${i.payment_method || '-'}</td>
            <td class="actions">
              <button class="btn btn-secondary btn-sm view-lines" data-id="${i.invoice_id}">Lines</button>
              ${i.payment_status === 'Unpaid' ? `<button class="btn btn-success btn-sm pay-inv" data-id="${i.invoice_id}">Pay</button>` : ''}
              <button class="btn btn-secondary btn-sm edit-invoice" data-id="${i.invoice_id}">Edit</button>
              <button class="btn btn-danger btn-sm del-invoice" data-id="${i.invoice_id}">Del</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>
    <div id="invoice-lines"></div>`;

  const custOpts = customers.map(c => ({ value: c.customer_id, label: c.business_name || (c.first_name + ' ' + c.last_name) }));

  $('#add-invoice').onclick = () => invoiceForm(null, custOpts);
  $$('.edit-invoice').forEach(b => b.onclick = () => invoiceForm(rows.find(i => i.invoice_id == b.dataset.id), custOpts));
  $$('.del-invoice').forEach(b => b.onclick = async () => {
    if (confirm('Delete this invoice?')) {
      const res = await api.del('/api/invoices/' + b.dataset.id);
      toast(res.message || res.error);
      renderInvoices();
    }
  });
  $$('.pay-inv').forEach(b => b.onclick = () => payInvoice(b.dataset.id));
  $$('.view-lines').forEach(b => b.onclick = () => viewLines(b.dataset.id));
}

function invoiceForm(i = null, custOpts) {
  const dateVal = i?.invoice_date ? new Date(i.invoice_date).toISOString().split('T')[0] : '';
  openModal(i ? 'Edit Invoice' : 'New Invoice', [
    { name: 'customer_id', label: 'Customer', type: 'select', value: i?.customer_id, options: custOpts },
    { name: 'invoice_date', label: 'Date', type: 'date', value: dateVal, required: true },
    { name: 'total_amount', label: 'Total', type: 'number', value: i?.total_amount || 0, step: '0.01' },
    { name: 'payment_status', label: 'Status', type: 'select', value: i?.payment_status || 'Unpaid',
      options: [{ value: 'Unpaid', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }] },
    { name: 'payment_method', label: 'Method', type: 'select', value: i?.payment_method || '',
      options: [{ value: '', label: '- None -' }, { value: 'Credit Card', label: 'Credit Card' }, { value: 'Cash', label: 'Cash' }, { value: 'Check', label: 'Check' }] },
    { name: 'payment_date', label: 'Payment Date', type: 'date', value: i?.payment_date ? new Date(i.payment_date).toISOString().split('T')[0] : '' },
  ], async (data) => {
    const res = i
      ? await api.put('/api/invoices/' + i.invoice_id, data)
      : await api.post('/api/invoices', data);
    toast(res.message || res.error);
    renderInvoices();
  });
}

function payInvoice(id) {
  openModal('Pay Invoice #' + id, [
    { name: 'payment_method', label: 'Payment Method', type: 'select', value: 'Credit Card',
      options: [{ value: 'Credit Card', label: 'Credit Card' }, { value: 'Cash', label: 'Cash' }, { value: 'Check', label: 'Check' }] },
  ], async (data) => {
    const res = await api.put('/api/invoices/' + id + '/pay', data);
    toast(res.message || res.error);
    renderInvoices();
  });
}

async function viewLines(invoiceId) {
  const lines = await api.get('/api/invoices/' + invoiceId + '/lines');
  const el = $('#invoice-lines');
  if (!lines.length) {
    el.innerHTML = `<div class="card"><div class="card-header"><h3>Invoice #${invoiceId} Lines</h3></div><p class="empty-state">No lines</p></div>`;
    return;
  }
  el.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>Invoice #${invoiceId} Lines</h3></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Mission</th><th>Truck</th><th>Hours</th><th>Km</th><th>Duration Cost</th><th>Km Cost</th><th>Line Total</th></tr></thead>
        <tbody>${lines.map(l => `
          <tr><td>${l.mission_id}</td><td>${l.truck_name}</td><td>${l.duration_hours}</td><td>${l.km_traveled}</td>
          <td>${fmtMoney(l.duration_cost)}</td><td>${fmtMoney(l.km_cost)}</td><td>${fmtMoney(l.line_total)}</td></tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
}

// ========================= QUERIES =========================

const QUERIES = [
  { id: 'a', title: 'Business Customers', desc: 'Customers that are businesses' },
  { id: 'b', title: 'Reservations > 1', desc: 'Reservations with ID greater than 1' },
  { id: 'c', title: 'Drivers & Vehicles in Missions', desc: 'Drivers and vehicles in at least one mission' },
  { id: 'd', title: 'Missions Mar 11-18', desc: 'Missions between March 11-18, 2026 with drivers/vehicles' },
  { id: 'e', title: 'Unpaid Invoices', desc: 'Customers who have not paid invoices' },
  { id: 'f', title: 'GMC Drivers', desc: 'Drivers who drove GMC brand vehicles' },
  { id: 'g', title: 'Invoices > $1000', desc: 'Customers with invoices greater than $1000' },
  { id: 'h', title: 'Invoice Counts', desc: 'Customers with their number of invoices' },
  { id: 'i', title: 'High Mileage Drivers', desc: 'Drivers with missions Feb-Mar 2026, mileage > 7000 km' },
  { id: 'j', title: 'Update Mission (Transaction)', desc: 'Edit mission details via transaction' },
  { id: 'k', title: 'Cancel Mission (Transaction)', desc: 'Cancel a mission or part of a mission' },
];

function renderQueries() {
  $('#content').innerHTML = `
    <div class="query-grid">
      ${QUERIES.map(q => `
        <div class="query-card" data-qid="${q.id}">
          <h4><span>${q.id.toUpperCase()}</span> ${q.title}</h4>
          <p>${q.desc}</p>
        </div>`).join('')}
    </div>
    <div id="query-result"></div>`;

  $$('.query-card').forEach(card => {
    card.onclick = () => {
      $$('.query-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      runQuery(card.dataset.qid);
    };
  });
}

async function runQuery(id) {
  const el = $('#query-result');

  // j and k redirect to missions page
  if (id === 'j') {
    el.innerHTML = `<div class="card"><p style="padding:12px;">Query J: Update mission details — redirecting to Missions page. Use <strong>Edit</strong> on any mission (uses transaction).</p></div>`;
    setTimeout(() => navigate('missions'), 1200);
    return;
  }
  if (id === 'k') {
    el.innerHTML = `<div class="card"><p style="padding:12px;">Query K: Cancel mission — redirecting to Missions page. Use <strong>Cancel</strong> on any mission (uses transaction).</p></div>`;
    setTimeout(() => navigate('missions'), 1200);
    return;
  }

  el.innerHTML = '<div class="card"><p class="empty-state">Loading...</p></div>';

  try {
    const rows = await api.get('/api/queries/' + id);
    if (!rows.length) {
      el.innerHTML = '<div class="card"><p class="empty-state">No results</p></div>';
      return;
    }
    const cols = Object.keys(rows[0]);
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Query ${id.toUpperCase()} Results (${rows.length} rows)</h3></div>
        <div class="table-wrap"><table>
          <thead><tr>${cols.map(c => `<th>${c.replace(/_/g, ' ')}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${cols.map(c => {
            let v = r[c];
            if (c.includes('date') || c.includes('start') || c.includes('end')) v = fmtDateTime(v);
            else if (c.includes('amount') || c.includes('cost') || c.includes('total')) v = fmtMoney(v);
            else if (v === null || v === undefined) v = '-';
            return `<td>${v}</td>`;
          }).join('')}</tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="card"><p class="empty-state" style="color:var(--danger)">Error: ${e.message}</p></div>`;
  }
}

// ========================= ROUTING =========================

const pages = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  customers: { title: 'Customers', render: renderCustomers },
  drivers: { title: 'Drivers', render: renderDrivers },
  trucks: { title: 'Trucks', render: renderTrucks },
  reservations: { title: 'Reservations', render: renderReservations },
  missions: { title: 'Missions', render: renderMissions },
  invoices: { title: 'Invoices', render: renderInvoices },
  queries: { title: 'Queries', render: renderQueries },
};

function navigate(page) {
  currentPage = page;
  $('#page-title').textContent = pages[page].title;
  $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  pages[page].render();
}

// Nav clicks
$$('.nav-link').forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    navigate(link.dataset.page);
  };
});

// Init
navigate('dashboard');
