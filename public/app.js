const API = '';
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let currentPage = 'dashboard';

//* Calls the backend API, server reads/writes MySQL and returns JSON. Throws error if HTTP fails or body has error msg.
async function apiJson(url, method = 'GET', body = null) {
  const opts = { method, headers: {} };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const r = await fetch(API + url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data.error || data.message || `HTTP ${r.status}`);
  }
  return data;
}

//* Need this for app to work -> its a safe check for text for the HTML (names/addresses can include <>&).
function escapeHtml(s) {
  if (s == null) return '';
  const d = document.createElement('div');
  d.textContent = String(s);
  return d.innerHTML;
}

//* Short popup message after CRUD.
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3200);
}

//* Loading thing while each page takes data from the API.
function showLoading() {
  $('#content').innerHTML = '<div class="card"><p class="empty-state">Loading...</p></div>';
}

//* Fail when fetch/API errors (maybe DB not configured).
function renderError(message, page) {
  const p = page || currentPage;
  $('#content').innerHTML = `
    <div class="card error-card">
      <h3>Could not load data</h3>
      <p>${escapeHtml(message)}</p>
      <p class="hint">Run <code>npm start</code> in the project folder, run MySQL, import <code>RENTTRUCK(ddl).sql</code>, and set <code>.env</code> (host, user, password, database name).</p>
      <button type="button" class="btn btn-primary" id="retry-page">Retry</button>
    </div>`;
  $('#retry-page').onclick = () => navigate(p);
}


//* show form and saves on submit
function openModal(title, fields, onSave) {
  $('#modal-title').textContent = title;
  const form = $('#modal-form');
  form.innerHTML = fields.map(f => {
    if (f.type === 'select') {
      const opts = (f.options || []).map(o =>
        `<option value="${escapeHtml(o.value)}" ${String(o.value) == String(f.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
      ).join('');
      return `<div class="form-group"><label>${escapeHtml(f.label)}</label><select name="${escapeHtml(f.name)}" ${f.required ? 'required' : ''}>${opts}</select></div>`;
    }
    const val = f.value !== undefined && f.value !== null ? String(f.value) : '';
    const req = f.required ? 'required' : '';
    return `<div class="form-group"><label>${escapeHtml(f.label)}</label><input type="${f.type || 'text'}" name="${escapeHtml(f.name)}" value="${escapeHtml(val)}" ${req} ${f.step ? `step="${escapeHtml(f.step)}"` : ''}></div>`;
  }).join('');

  form.onsubmit = (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = {};
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      data[el.name] = el.value === '' ? null : el.value;
    });
    onSave(data);
    closeModal();
  };

  $('#modal-overlay').classList.remove('hidden');
}

function closeModal() {
  $('#modal-overlay').classList.add('hidden');
}

$('#modal-close').onclick = closeModal;
$('#modal-cancel').onclick = closeModal;
$('#modal-overlay').onclick = (e) => {
  if (e.target === $('#modal-overlay')) closeModal();
};

//* status badges for the data values (like mission status, payment, license type).
function badge(val) {
  const cls = {
    Active: 'badge-active', Completed: 'badge-completed', Paid: 'badge-paid',
    Cancelled: 'badge-cancelled', Unpaid: 'badge-unpaid',
    Scheduled: 'badge-scheduled', Ongoing: 'badge-ongoing',
    Business: 'badge-active', Individual: 'badge-scheduled',
    Tourism: 'badge-scheduled', Heavyweight: 'badge-ongoing', 'Super Heavyweight': 'badge-active'
  };
  return `<span class="badge ${cls[val] || ''}">${escapeHtml(val)}</span>`;
}

//* Display for dates and money.
function fmtDate(d) { return d ? new Date(d).toLocaleDateString() : '-'; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString() : '-'; }
function fmtMoney(v) { return v != null ? `$${Number(v).toFixed(2)}` : '-'; }

function truncLoc(s, n) {
  if (!s) return '-';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function fmtDT(d) {
  if (!d) return '';
  try {
    const x = new Date(d);
    if (Number.isNaN(x.getTime())) return '';
    const pad = (z) => String(z).padStart(2, '0');
    return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
  } catch {
    return '';
  }
}

//* Empty form fields transformed to null for optional values.
function toNumOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

//? ========================= PAGES =========================

//* Dashboard get the counts from all tables + last few missions.
async function renderDashboard() {
  showLoading();
  try {
    const [customers, drivers, trucks, missions, invoices] = await Promise.all([
      apiJson('/api/customers'),
      apiJson('/api/drivers'),
      apiJson('/api/trucks'),
      apiJson('/api/missions'),
      apiJson('/api/invoices')
    ]);
    if (!Array.isArray(customers)) throw new Error('Invalid API response');
    const active = missions.filter(m => m.status === 'Scheduled' || m.status === 'Ongoing').length;
    const unpaid = invoices.filter(i => i.payment_status === 'Unpaid').length;
    const recent = [...missions].sort((a, b) => b.mission_id - a.mission_id).slice(0, 5);

    $('#content').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${customers.length}</div><div class="stat-label">Customers</div></div>
        <div class="stat-card"><div class="stat-value">${drivers.length}</div><div class="stat-label">Drivers</div></div>
        <div class="stat-card"><div class="stat-value">${trucks.length}</div><div class="stat-label">Trucks</div></div>
        <div class="stat-card"><div class="stat-value">${missions.length}</div><div class="stat-label">Missions</div></div>
        <div class="stat-card"><div class="stat-value">${active}</div><div class="stat-label">Active missions</div></div>
        <div class="stat-card"><div class="stat-value">${unpaid}</div><div class="stat-label">Unpaid invoices</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent missions</h3></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Driver</th><th>Truck</th><th>Start</th><th>End</th><th>Status</th></tr></thead>
          <tbody>${recent.length ? recent.map(m => `
            <tr><td>${m.mission_id}</td><td>${escapeHtml(m.driver_name)}</td><td>${escapeHtml(m.truck_name)}</td>
            <td>${fmtDateTime(m.planned_start)}</td><td>${fmtDateTime(m.planned_end)}</td><td>${badge(m.status)}</td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">No missions yet</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  } catch (e) {
    renderError(e.message);
  }
}

//* Customers list -> add/edit/delete frontend -> backend calls /api/customers.
async function renderCustomers() {
  showLoading();
  try {
    const rows = await apiJson('/api/customers');
    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Customers</h3><button type="button" class="btn btn-primary btn-sm" id="add-customer">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Type</th><th>Name</th><th>Address</th><th>Contact</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(c => `
            <tr>
              <td>${c.customer_id}</td><td>${badge(c.customer_type)}</td>
              <td>${escapeHtml(c.business_name || c.first_name + ' ' + c.last_name)}</td>
              <td>${escapeHtml(c.address)}</td><td>${escapeHtml(c.contact)}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm edit-customer" data-id="${c.customer_id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm del-customer" data-id="${c.customer_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="6" class="empty-state">No customers — add one or import SQL</td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $('#add-customer').onclick = () => customerForm();
    $$('.edit-customer').forEach(b => b.onclick = () => customerForm(rows.find(c => c.customer_id == b.dataset.id)));
    $$('.del-customer').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this customer?')) return;
      try {
        const res = await apiJson('/api/customers/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderCustomers();
      } catch (err) { toast(err.message); }
    });
  } catch (e) {
    renderError(e.message);
  }
}

//* Create or update a customer row.
function customerForm(c = null) {
  openModal(c ? 'Edit customer' : 'New customer', [
    { name: 'customer_type', label: 'Type', type: 'select', value: c?.customer_type || 'Individual',
      options: [{ value: 'Individual', label: 'Individual' }, { value: 'Business', label: 'Business' }] },
    { name: 'business_name', label: 'Business name', value: c?.business_name },
    { name: 'first_name', label: 'First name', value: c?.first_name },
    { name: 'last_name', label: 'Last name', value: c?.last_name },
    { name: 'address', label: 'Address', value: c?.address, required: true },
    { name: 'contact', label: 'Contact', value: c?.contact, required: true },
  ], async (data) => {
    try {
      const res = c
        ? await apiJson('/api/customers/' + c.customer_id, 'PUT', data)
        : await apiJson('/api/customers', 'POST', data);
      toast(res.message || 'Saved');
      renderCustomers();
    } catch (err) { toast(err.message); }
  });
}

//* Drivers CRUD calling /api/drivers.
async function renderDrivers() {
  showLoading();
  try {
    const rows = await apiJson('/api/drivers');
    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Drivers</h3><button type="button" class="btn btn-primary btn-sm" id="add-driver">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Name</th><th>License</th><th>Contact</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(d => `
            <tr>
              <td>${d.driver_id}</td><td>${escapeHtml(d.first_name + ' ' + d.last_name)}</td>
              <td>${badge(d.license_type)}</td><td>${escapeHtml(d.contact_driver)}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm edit-driver" data-id="${d.driver_id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm del-driver" data-id="${d.driver_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="5" class="empty-state">No drivers</td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $('#add-driver').onclick = () => driverForm();
    $$('.edit-driver').forEach(b => b.onclick = () => driverForm(rows.find(d => d.driver_id == b.dataset.id)));
    $$('.del-driver').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this driver?')) return;
      try {
        const res = await apiJson('/api/drivers/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderDrivers();
      } catch (err) { toast(err.message); }
    });
  } catch (e) {
    renderError(e.message);
  }
}

//* new/edit driver calling POST or PUT /api/drivers.
function driverForm(d = null) {
  openModal(d ? 'Edit driver' : 'New driver', [
    { name: 'first_name', label: 'First name', value: d?.first_name, required: true },
    { name: 'last_name', label: 'Last name', value: d?.last_name, required: true },
    { name: 'license_type', label: 'License type', type: 'select', value: d?.license_type || 'Tourism',
      options: [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }] },
    { name: 'contact_driver', label: 'Contact', value: d?.contact_driver, required: true },
  ], async (data) => {
    try {
      const res = d
        ? await apiJson('/api/drivers/' + d.driver_id, 'PUT', data)
        : await apiJson('/api/drivers', 'POST', data);
      toast(res.message || 'Saved');
      renderDrivers();
    } catch (err) { toast(err.message); }
  });
}

//* Trucks CRUD calling /api/trucks.
async function renderTrucks() {
  showLoading();
  try {
    const rows = await apiJson('/api/trucks');
    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Trucks</h3><button type="button" class="btn btn-primary btn-sm" id="add-truck">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Brand</th><th>Model</th><th>Type</th><th>Plate</th><th>$/hr</th><th>$/km</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(t => `
            <tr>
              <td>${t.truck_id}</td><td>${escapeHtml(t.brand)}</td><td>${escapeHtml(t.model)}</td>
              <td>${badge(t.truck_type)}</td><td>${escapeHtml(t.license_plate)}</td>
              <td>${fmtMoney(t.rate_per_hour)}</td><td>${fmtMoney(t.rate_per_km)}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm edit-truck" data-id="${t.truck_id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm del-truck" data-id="${t.truck_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="8" class="empty-state">No trucks</td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $('#add-truck').onclick = () => truckForm();
    $$('.edit-truck').forEach(b => b.onclick = () => truckForm(rows.find(t => t.truck_id == b.dataset.id)));
    $$('.del-truck').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this truck?')) return;
      try {
        const res = await apiJson('/api/trucks/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderTrucks();
      } catch (err) { toast(err.message); }
    });
  } catch (e) {
    renderError(e.message);
  }
}

//* new/edit truck calling POST or PUT /api/trucks.
function truckForm(t = null) {
  openModal(t ? 'Edit truck' : 'New truck', [
    { name: 'brand', label: 'Brand', value: t?.brand, required: true },
    { name: 'model', label: 'Model', value: t?.model, required: true },
    { name: 'truck_type', label: 'Type', type: 'select', value: t?.truck_type || 'Tourism',
      options: [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }] },
    { name: 'license_plate', label: 'License plate', value: t?.license_plate, required: true },
  ], async (data) => {
    try {
      const res = t
        ? await apiJson('/api/trucks/' + t.truck_id, 'PUT', data)
        : await apiJson('/api/trucks', 'POST', data);
      toast(res.message || 'Saved');
      renderTrucks();
    } catch (err) { toast(err.message); }
  });
}

//* Reservations needs customers -> so API joins customer name on list -> frontend displays.
async function renderReservations() {
  showLoading();
  try {
    const [rows, customers] = await Promise.all([
      apiJson('/api/reservations'),
      apiJson('/api/customers')
    ]);
    const custOpts = customers.map(c => ({ value: c.customer_id, label: c.business_name || (c.first_name + ' ' + c.last_name) }));

    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Reservations</h3><button type="button" class="btn btn-primary btn-sm" id="add-res">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Status</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(r => `
            <tr>
              <td>${r.reservation_id}</td><td>${escapeHtml(r.customer_name)}</td><td>${fmtDate(r.reservation_date)}</td><td>${badge(r.status)}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm edit-res" data-id="${r.reservation_id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm del-res" data-id="${r.reservation_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="5" class="empty-state">No reservations</td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $('#add-res').onclick = () => resForm(null, custOpts);
    $$('.edit-res').forEach(b => b.onclick = () => resForm(rows.find(r => r.reservation_id == b.dataset.id), custOpts));
    $$('.del-res').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this reservation?')) return;
      try {
        const res = await apiJson('/api/reservations/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderReservations();
      } catch (err) { toast(err.message); }
    });
  } catch (e) {
    renderError(e.message);
  }
}

//* Book reservation (customer + date + status).
function resForm(r = null, custOpts) {
  if (!custOpts.length) {
    toast('Add a customer first');
    return;
  }
  const dateVal = r?.reservation_date ? new Date(r.reservation_date).toISOString().split('T')[0] : '';
  openModal(r ? 'Edit reservation' : 'New reservation', [
    { name: 'customer_id', label: 'Customer', type: 'select', value: r?.customer_id, options: custOpts, required: true },
    { name: 'reservation_date', label: 'Date', type: 'date', value: dateVal, required: true },
    { name: 'status', label: 'Status', type: 'select', value: r?.status || 'Active',
      options: [{ value: 'Active', label: 'Active' }, { value: 'Cancelled', label: 'Cancelled' }] },
  ], async (data) => {
    try {
      const res = r
        ? await apiJson('/api/reservations/' + r.reservation_id, 'PUT', data)
        : await apiJson('/api/reservations', 'POST', data);
      toast(res.message || 'Saved');
      renderReservations();
    } catch (err) { toast(err.message); }
  });
}

//* Joined mission data -> frontend displays.
async function renderMissions() {
  showLoading();
  try {
    const [rows, reservations, trucks, drivers] = await Promise.all([
      apiJson('/api/missions'),
      apiJson('/api/reservations'),
      apiJson('/api/trucks'),
      apiJson('/api/drivers')
    ]);

    const resOpts = reservations.map(r => ({ value: r.reservation_id, label: `#${r.reservation_id} — ${r.customer_name}` }));
    const truckOpts = trucks.map(t => ({ value: t.truck_id, label: `${t.brand} ${t.model} (${t.license_plate})` }));
    const driverOpts = drivers.map(d => ({ value: d.driver_id, label: `${d.first_name} ${d.last_name} [${d.license_type}]` }));

    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Missions</h3><button type="button" class="btn btn-primary btn-sm" id="add-mission">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Res#</th><th>Driver</th><th>Truck</th><th>Location</th><th>Start</th><th>End</th><th>Status</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(m => `
            <tr>
              <td>${m.mission_id}</td><td>${m.reservation_id}</td><td>${escapeHtml(m.driver_name)}</td><td>${escapeHtml(m.truck_name)}</td>
              <td>${escapeHtml(truncLoc(m.rendezvous_place, 40))}</td>
              <td>${fmtDateTime(m.planned_start)}</td><td>${fmtDateTime(m.planned_end)}</td><td>${badge(m.status)}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm edit-mission" data-id="${m.mission_id}">Edit</button>
                ${m.status !== 'Cancelled' ? `<button type="button" class="btn btn-warn btn-sm cancel-mission" data-id="${m.mission_id}">Cancel</button>` : ''}
                <button type="button" class="btn btn-danger btn-sm del-mission" data-id="${m.mission_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="9" class="empty-state">No missions</td></tr>'}
          </tbody>
        </table></div>
      </div>`;

    $('#add-mission').onclick = () => {
      if (!resOpts.length || !truckOpts.length || !driverOpts.length) {
        toast('Need reservations, trucks, and drivers first');
        return;
      }
      missionForm(null, resOpts, truckOpts, driverOpts);
    };
    $$('.edit-mission').forEach(b => b.onclick = () => missionForm(rows.find(m => m.mission_id == b.dataset.id), resOpts, truckOpts, driverOpts));
    $$('.cancel-mission').forEach(b => b.onclick = async () => {
      if (!confirm('Cancel this mission?')) return;
      try {
        const res = await apiJson('/api/missions/' + b.dataset.id + '/cancel', 'PUT');
        toast(res.message || 'Cancelled');
        renderMissions();
      } catch (err) { toast(err.message); }
    });
    $$('.del-mission').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this mission?')) return;
      try {
        const res = await apiJson('/api/missions/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderMissions();
      } catch (err) { toast(err.message); }
    });
  } catch (e) {
    renderError(e.message);
  }
}

//* reservation, truck, driver, times, odometer, status -> calling /api/missions.
function missionForm(m = null, resOpts, truckOpts, driverOpts) {
  const typeOpts = [{ value: 'Tourism', label: 'Tourism' }, { value: 'Heavyweight', label: 'Heavyweight' }, { value: 'Super Heavyweight', label: 'Super Heavyweight' }];
  const statusOpts = [{ value: 'Scheduled', label: 'Scheduled' }, { value: 'Ongoing', label: 'Ongoing' }, { value: 'Completed', label: 'Completed' }, { value: 'Cancelled', label: 'Cancelled' }];

  openModal(m ? 'Edit mission' : 'New mission', [
    { name: 'reservation_id', label: 'Reservation', type: 'select', value: m?.reservation_id, options: resOpts, required: true },
    { name: 'truck_id', label: 'Truck', type: 'select', value: m?.truck_id, options: truckOpts, required: true },
    { name: 'driver_id', label: 'Driver', type: 'select', value: m?.driver_id, options: driverOpts, required: true },
    { name: 'rendezvous_place', label: 'Location', value: m?.rendezvous_place, required: true },
    { name: 'req_truck_type', label: 'Required type', type: 'select', value: m?.req_truck_type, options: typeOpts },
    { name: 'planned_start', label: 'Planned start', type: 'datetime-local', value: fmtDT(m?.planned_start), required: true },
    { name: 'planned_end', label: 'Planned end', type: 'datetime-local', value: fmtDT(m?.planned_end), required: true },
    { name: 'actual_start', label: 'Actual start', type: 'datetime-local', value: fmtDT(m?.actual_start) },
    { name: 'actual_end', label: 'Actual end', type: 'datetime-local', value: fmtDT(m?.actual_end) },
    { name: 'odometer_before', label: 'Odometer before', type: 'number', value: m?.odometer_before },
    { name: 'odometer_after', label: 'Odometer after', type: 'number', value: m?.odometer_after },
    { name: 'status', label: 'Status', type: 'select', value: m?.status || 'Scheduled', options: statusOpts },
  ], async (data) => {
    const payload = {
      ...data,
      reservation_id: Number(data.reservation_id),
      truck_id: Number(data.truck_id),
      driver_id: Number(data.driver_id),
      odometer_before: toNumOrNull(data.odometer_before),
      odometer_after: toNumOrNull(data.odometer_after)
    };
    try {
      const res = m
        ? await apiJson('/api/missions/' + m.mission_id, 'PUT', payload)
        : await apiJson('/api/missions', 'POST', payload);
      toast(res.message || 'Saved');
      renderMissions();
    } catch (err) { toast(err.message); }
  });
}

//* Invoices table + Pay (extra calls per invoice to the backend API).
async function renderInvoices() {
  showLoading();
  try {
    const [rows, customers] = await Promise.all([
      apiJson('/api/invoices'),
      apiJson('/api/customers')
    ]);
    const custOpts = customers.map(c => ({ value: c.customer_id, label: c.business_name || (c.first_name + ' ' + c.last_name) }));

    $('#content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Invoices</h3><button type="button" class="btn btn-primary btn-sm" id="add-invoice">+ Add</button></div>
        <div class="table-wrap"><table>
          <thead><tr><th>ID</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Method</th><th class="actions">Actions</th></tr></thead>
          <tbody>${rows.length ? rows.map(i => `
            <tr>
              <td>${i.invoice_id}</td><td>${escapeHtml(i.customer_name)}</td><td>${fmtDate(i.invoice_date)}</td>
              <td>${fmtMoney(i.total_amount)}</td><td>${badge(i.payment_status)}</td><td>${escapeHtml(i.payment_method || '-')}</td>
              <td class="actions"><div class="actions-inner">
                <button type="button" class="btn btn-secondary btn-sm view-lines" data-id="${i.invoice_id}">Lines</button>
                ${i.payment_status === 'Unpaid' ? `<button type="button" class="btn btn-success btn-sm pay-inv" data-id="${i.invoice_id}">Pay</button>` : ''}
                <button type="button" class="btn btn-secondary btn-sm edit-invoice" data-id="${i.invoice_id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm del-invoice" data-id="${i.invoice_id}">Delete</button>
              </div></td>
            </tr>`).join('') : '<tr><td colspan="7" class="empty-state">No invoices</td></tr>'}
          </tbody>
        </table></div>
      </div>
      <div id="invoice-lines"></div>`;

    $('#add-invoice').onclick = () => invoiceForm(null, custOpts);
    $$('.edit-invoice').forEach(b => b.onclick = () => invoiceForm(rows.find(i => i.invoice_id == b.dataset.id), custOpts));
    $$('.del-invoice').forEach(b => b.onclick = async () => {
      if (!confirm('Delete this invoice?')) return;
      try {
        const res = await apiJson('/api/invoices/' + b.dataset.id, 'DELETE');
        toast(res.message || 'Deleted');
        renderInvoices();
      } catch (err) { toast(err.message); }
    });
    $$('.pay-inv').forEach(b => b.onclick = () => payInvoice(b.dataset.id));
    $$('.view-lines').forEach(b => b.onclick = () => viewLines(b.dataset.id));
  } catch (e) {
    renderError(e.message);
  }
}

//* invoice header (customer, amounts, payment fields).
function invoiceForm(i = null, custOpts) {
  if (!custOpts.length) {
    toast('Add a customer first');
    return;
  }
  const dateVal = i?.invoice_date ? new Date(i.invoice_date).toISOString().split('T')[0] : '';
  const payDate = i?.payment_date ? new Date(i.payment_date).toISOString().split('T')[0] : '';
  openModal(i ? 'Edit invoice' : 'New invoice', [
    { name: 'customer_id', label: 'Customer', type: 'select', value: i?.customer_id, options: custOpts, required: true },
    { name: 'invoice_date', label: 'Date', type: 'date', value: dateVal, required: true },
    { name: 'total_amount', label: 'Total', type: 'number', value: i?.total_amount ?? 0, step: '0.01' },
    { name: 'payment_status', label: 'Status', type: 'select', value: i?.payment_status || 'Unpaid',
      options: [{ value: 'Unpaid', label: 'Unpaid' }, { value: 'Paid', label: 'Paid' }] },
    { name: 'payment_method', label: 'Method', type: 'select', value: i?.payment_method || '',
      options: [{ value: '', label: '—' }, { value: 'Credit Card', label: 'Credit Card' }, { value: 'Cash', label: 'Cash' }, { value: 'Check', label: 'Check' }] },
    { name: 'payment_date', label: 'Payment date', type: 'date', value: payDate },
  ], async (data) => {
    const payload = {
      ...data,
      customer_id: Number(data.customer_id),
      total_amount: data.total_amount === '' || data.total_amount == null ? 0 : Number(data.total_amount)
    };
    try {
      const res = i
        ? await apiJson('/api/invoices/' + i.invoice_id, 'PUT', payload)
        : await apiJson('/api/invoices', 'POST', payload);
      toast(res.message || 'Saved');
      renderInvoices();
    } catch (err) { toast(err.message); }
  });
}

//* Quick pay flow -> PUT /api/invoices/:id/pay sets paid status.
function payInvoice(id) {
  openModal('Pay invoice #' + id, [
    { name: 'payment_method', label: 'Payment method', type: 'select', value: 'Credit Card',
      options: [{ value: 'Credit Card', label: 'Credit Card' }, { value: 'Cash', label: 'Cash' }, { value: 'Check', label: 'Check' }] },
  ], async (data) => {
    try {
      const res = await apiJson('/api/invoices/' + id + '/pay', 'PUT', data);
      toast(res.message || 'Paid');
      renderInvoices();
    } catch (err) { toast(err.message); }
  });
}

//* Fetch invoice line parts (missions/charges) and adds a second card below the table.
async function viewLines(invoiceId) {
  const el = $('#invoice-lines');
  try {
    const lines = await apiJson('/api/invoices/' + invoiceId + '/lines');
    if (!Array.isArray(lines) || !lines.length) {
      el.innerHTML = `<div class="card"><div class="card-header"><h3>Invoice #${invoiceId} lines</h3></div><p class="empty-state">No lines</p></div>`;
      return;
    }
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Invoice #${invoiceId} lines</h3></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Mission</th><th>Truck</th><th>Hours</th><th>Km</th><th>Duration</th><th>Km cost</th><th>Line total</th></tr></thead>
          <tbody>${lines.map(l => `
            <tr><td>${l.mission_id}</td><td>${escapeHtml(l.truck_name)}</td><td>${l.duration_hours}</td><td>${l.km_traveled}</td>
            <td>${fmtMoney(l.duration_cost)}</td><td>${fmtMoney(l.km_cost)}</td><td>${fmtMoney(l.line_total)}</td></tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (e) {
    el.innerHTML = `<div class="card"><p class="empty-state">${escapeHtml(e.message)}</p></div>`;
  }
}

//* demo SQL queries -> read-only.
const QUERIES = [
  { id: 'a', title: 'Business customers', desc: 'Business-type customers' },
  { id: 'b', title: 'Reservations > 1', desc: 'Reservation id greater than 1' },
  { id: 'c', title: 'Drivers & vehicles', desc: 'Pairs in at least one mission' },
  { id: 'd', title: 'Missions Mar 11–18', desc: 'Missions overlapping Mar 11–18, 2026' },
  { id: 'e', title: 'Unpaid invoices', desc: 'Customers with unpaid invoices' },
  { id: 'f', title: 'GMC drivers', desc: 'Drivers who drove GMC trucks' },
  { id: 'g', title: 'Invoices > $1000', desc: 'Customers with invoice total over $1000' },
  { id: 'h', title: 'Invoice counts', desc: 'Customers and invoice count' },
  { id: 'i', title: 'High mileage', desc: 'Feb–Mar 2026, km > 7000' },
  { id: 'j', title: 'Update mission (transaction)', desc: 'Use Edit on Missions' },
  { id: 'k', title: 'Cancel mission (transaction)', desc: 'Use Cancel on Missions' },
];

//* UI to pick one of the many queries we have -> running a query fetches rows and builds the table itself.
function renderQueries() {
  $('#content').innerHTML = `
    <div class="query-grid">
      ${QUERIES.map(q => `
        <button type="button" class="query-card" data-qid="${q.id}">
          <h4><span>${q.id.toUpperCase()}</span> ${escapeHtml(q.title)}</h4>
          <p>${escapeHtml(q.desc)}</p>
        </button>`).join('')}
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

//* redirect to Missions for assignment demo -> others hit /api/queries/:id.
async function runQuery(id) {
  const el = $('#query-result');
  if (id === 'j') {
    el.innerHTML = `<div class="card"><p class="hint">Use <strong>Missions → Edit</strong> (transaction).</p></div>`;
    setTimeout(() => navigate('missions'), 800);
    return;
  }
  if (id === 'k') {
    el.innerHTML = `<div class="card"><p class="hint">Use <strong>Missions → Cancel</strong> (transaction).</p></div>`;
    setTimeout(() => navigate('missions'), 800);
    return;
  }

  el.innerHTML = '<div class="card"><p class="empty-state">Loading...</p></div>';
  try {
    const rows = await apiJson('/api/queries/' + id);
    if (!Array.isArray(rows) || !rows.length) {
      el.innerHTML = '<div class="card"><p class="empty-state">No results</p></div>';
      return;
    }
    const cols = Object.keys(rows[0]);
    el.innerHTML = `
      <div class="card">
        <div class="card-header"><h3>Query ${id.toUpperCase()} (${rows.length} rows)</h3></div>
        <div class="table-wrap"><table>
          <thead><tr>${cols.map(c => `<th>${escapeHtml(c.replace(/_/g, ' '))}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${cols.map(c => {
            let v = r[c];
            if (v != null && (c.includes('date') || c.includes('start') || c.includes('end'))) v = fmtDateTime(v);
            else if (v != null && (c.includes('amount') || c.includes('cost') || c.includes('total'))) v = fmtMoney(v);
            else if (v === null || v === undefined) v = '-';
            return `<td>${escapeHtml(String(v))}</td>`;
          }).join('')}</tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="card"><p class="empty-state err-text">${escapeHtml(e.message)}</p></div>`;
  }
}

//* Sidebar routes
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
  pingHealth();
}

$$('.nav-link').forEach(link => {
  link.onclick = (e) => {
    e.preventDefault();
    navigate(link.dataset.page);
  };
});

navigate('dashboard');