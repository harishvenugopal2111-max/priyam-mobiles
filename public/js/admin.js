// Global State for Admin App
let currentUser = null;
let token = null;

// Active views tracking
let activeTab = 'analytics';

// Chart.js instances (saved globally to destroy/re-render)
let salesChartInstance = null;
let paymentsChartInstance = null;
let brandsChartInstance = null;

// POS Billing Local State
let posCart = [];
let selectedPosCustomer = null;

// Modals instances
let productModal = null;
let customerModal = null;
let repairModal = null;
let historyModal = null;
let invoiceModal = null;

// DOM Load Setup
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap Modals
  productModal = new bootstrap.Modal(document.getElementById('productModal'));
  customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
  repairModal = new bootstrap.Modal(document.getElementById('repairModal'));
  historyModal = new bootstrap.Modal(document.getElementById('historyModal'));
  invoiceModal = new bootstrap.Modal(document.getElementById('invoiceModal'));

  // Initialize Dark/Light Mode Theme for Admin
  initAdminTheme();

  // Validate Authentication
  checkAuth();
});

// Admin theme toggle
function initAdminTheme() {
  const toggleBtn = document.getElementById('admin-theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    toggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
  } else {
    document.body.classList.remove('light-theme');
    toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  toggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
      toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
      toggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
    }
  });
}

// -------------------------------------------------------------
// AUTHENTICATION LOGIC
// -------------------------------------------------------------

async function checkAuth() {
  token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  const loginBox = document.getElementById('login-container');
  const dashBox = document.getElementById('dashboard-container');

  if (!token || !userStr) {
    showLoginScreen();
    return;
  }

  try {
    const response = await fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('Session expired');

    const data = await response.json();
    currentUser = data.user;
    
    // Apply Role-based constraints
    setupRoleUI();

    loginBox.classList.add('d-none');
    dashBox.classList.remove('d-none');
    
    // Default Tab
    switchTab(activeTab);
  } catch (err) {
    console.error(err);
    handleLogout();
  }
}

function showLoginScreen() {
  document.getElementById('login-container').classList.remove('d-none');
  document.getElementById('dashboard-container').classList.add('d-none');
}

async function handleLogin(event) {
  event.preventDefault();
  const userField = document.getElementById('login-username').value.trim();
  const passField = document.getElementById('login-password').value;
  const errorAlert = document.getElementById('login-error-alert');

  errorAlert.classList.add('d-none');

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userField, password: passField })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Clear forms
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';

    checkAuth();
  } catch (err) {
    errorAlert.textContent = err.message;
    errorAlert.classList.remove('d-none');
  }
}

function handleLogout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  currentUser = null;
  token = null;
  showLoginScreen();
}

function setupRoleUI() {
  document.getElementById('user-display-name').textContent = currentUser.fullName;
  document.getElementById('user-display-role').textContent = currentUser.role;

  const roleBadge = document.getElementById('user-display-role');
  if (currentUser.role === 'admin') {
    roleBadge.className = 'badge bg-primary text-uppercase';
  } else {
    roleBadge.className = 'badge bg-secondary text-uppercase';
  }

  // Adjust sidebar access
  const links = document.querySelectorAll('.sidebar-menu li');
  if (currentUser.role !== 'admin') {
    // Hide stats and reports for standard employees
    links[0].style.display = 'none'; // Dashboard Stats
    links[6].style.display = 'none'; // Reports
    activeTab = 'inventory'; // Default to Inventory instead
  } else {
    links[0].style.display = 'block';
    links[6].style.display = 'block';
    activeTab = 'analytics';
  }
}

// -------------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------------

function switchTab(tabId) {
  activeTab = tabId;

  // Toggle active class on sidebar menu items
  const menuLinks = document.querySelectorAll('.menu-item-link');
  menuLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('onclick').includes(tabId)) {
      link.classList.add('active');
    }
  });

  // Toggle visible tab panel
  const tabViews = document.querySelectorAll('.admin-tab-view');
  tabViews.forEach(view => {
    view.classList.add('d-none');
  });

  const activeView = document.getElementById(`tab-${tabId}`);
  if (activeView) activeView.classList.remove('d-none');

  // Trigger specific tab loading routines
  if (tabId === 'analytics') {
    loadAnalyticsData();
  } else if (tabId === 'inventory') {
    loadInventoryData();
  } else if (tabId === 'customers') {
    loadCustomerData();
  } else if (tabId === 'billing') {
    initPOSBilling();
  } else if (tabId === 'services') {
    loadServicesData();
  }
}

// Helper fetch headers
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// -------------------------------------------------------------
// TAB A: ANALYTICS DASHBOARD
// -------------------------------------------------------------

async function loadAnalyticsData() {
  if (currentUser.role !== 'admin') return;

  try {
    const response = await fetch('/api/analytics', { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    const data = await response.json();

    // 1. Render Summary Widgets
    const curFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('stat-revenue').textContent = curFormatter.format(data.summary.totalRevenue);
    document.getElementById('stat-profit').textContent = curFormatter.format(data.summary.totalProfit);
    document.getElementById('stat-today').textContent = curFormatter.format(data.summary.todaySales);
    document.getElementById('stat-alerts').textContent = `${data.summary.outOfStock} / ${data.summary.lowStock}`;

    // 2. Render Charts
    renderSalesTrend(data.charts.salesTrend);
    renderPaymentChart(data.charts.paymentMethods);
    renderBrandPopularityChart(data.charts.brandPopularity);

    // 3. Low stock alert rows
    loadLowStockWidget();

  } catch (err) {
    console.error(err);
  }
}

async function loadLowStockWidget() {
  try {
    const response = await fetch('/api/products', { headers: getHeaders() });
    const products = await response.json();
    
    const tbody = document.getElementById('stat-low-stock-table');
    tbody.innerHTML = '';

    const alertItems = products.filter(p => p.quantity <= 3);
    if (alertItems.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">All stock levels normal.</td></tr>';
      return;
    }

    alertItems.forEach(p => {
      const badgeClass = p.quantity === 0 ? 'bg-danger' : 'bg-warning text-dark';
      const badgeText = p.quantity === 0 ? 'Out of Stock' : 'Low Stock';
      
      tbody.innerHTML += `
        <tr>
          <td><strong>${p.model}</strong></td>
          <td>${p.brand}</td>
          <td class="fw-bold">${p.quantity}</td>
          <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// Chart Renderings
function renderSalesTrend(chartData) {
  const ctx = document.getElementById('salesTrendChart').getContext('2d');
  if (salesChartInstance) salesChartInstance.destroy();

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Sales Revenue (₹)',
        data: chartData.data,
        borderColor: '#0A4DFF',
        backgroundColor: 'rgba(10, 77, 255, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 3,
        pointBackgroundColor: '#F5B800',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  });
}

function renderPaymentChart(chartData) {
  const ctx = document.getElementById('paymentsChart').getContext('2d');
  if (paymentsChartInstance) paymentsChartInstance.destroy();

  paymentsChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartData.labels,
      datasets: [{
        data: chartData.data,
        backgroundColor: ['#0A4DFF', '#F5B800', '#10b981', '#a855f7', '#ef4444'],
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#9ca3af', font: { size: 10 } }
        }
      }
    }
  });
}

function renderBrandPopularityChart(chartData) {
  const ctx = document.getElementById('brandsChart').getContext('2d');
  if (brandsChartInstance) brandsChartInstance.destroy();

  brandsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Units Sold',
        data: chartData.data,
        backgroundColor: 'rgba(10, 77, 255, 0.75)',
        borderColor: '#0A4DFF',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#9ca3af', stepSize: 1 }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af' }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// TAB B: INVENTORY MANAGEMENT
// -------------------------------------------------------------

async function loadInventoryData(query = '') {
  try {
    const brandSel = document.getElementById('inv-brand-filter').value;
    let url = '/api/products';
    
    const params = [];
    if (brandSel) params.push(`brand=${encodeURIComponent(brandSel)}`);
    if (query) params.push(`search=${encodeURIComponent(query)}`);
    if (params.length > 0) url += '?' + params.join('&');

    const response = await fetch(url, { headers: getHeaders() });
    const products = await response.json();

    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';

    if (products.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No products found. Add a model now!</td></tr>';
      return;
    }

    products.forEach(p => {
      const isLowStock = p.quantity <= 3;
      const isOut = p.quantity === 0;
      const rowClass = isOut ? 'low-stock-row border-danger' : (isLowStock ? 'low-stock-row border-warning' : '');
      const stockBadge = isOut ? '<span class="badge bg-danger">OUT</span>' : (isLowStock ? `<span class="badge bg-warning text-dark">${p.quantity} LOW</span>` : p.quantity);

      const purchaseCost = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.purchase_price);
      const sellingCost = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(p.selling_price);

      tbody.innerHTML += `
        <tr class="${rowClass}">
          <td><strong>PM-P-${1000 + p.id}</strong></td>
          <td><strong>${p.model}</strong></td>
          <td>${p.brand}</td>
          <td>${p.ram} / ${p.storage}</td>
          <td>${purchaseCost}</td>
          <td>${sellingCost}</td>
          <td class="fw-bold">${stockBadge}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-info py-0 px-2" onclick="editProduct(${p.id})"><i class="fa-solid fa-pen"></i></button>
              ${currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteProduct(${p.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error(err);
  }
}

function searchInventory() {
  const query = document.getElementById('inv-search-input').value.trim();
  loadInventoryData(query);
}

function filterInventory() {
  loadInventoryData();
}

function showAddProductModal() {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('productModalLabel').textContent = 'Add New Phone Model';
  productModal.show();
}

async function editProduct(id) {
  try {
    const response = await fetch(`/api/products/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Product not found');
    const p = await response.json();

    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-brand').value = p.brand;
    document.getElementById('prod-model').value = p.model;
    document.getElementById('prod-ram').value = p.ram;
    document.getElementById('prod-storage').value = p.storage;
    document.getElementById('prod-battery').value = p.battery;
    document.getElementById('prod-warranty').value = p.warranty;
    document.getElementById('prod-camera').value = p.camera;
    document.getElementById('prod-processor').value = p.processor;
    document.getElementById('prod-imei').value = p.imei || '';
    document.getElementById('prod-image-url').value = p.image_url || '';
    document.getElementById('prod-purchase').value = p.purchase_price;
    document.getElementById('prod-selling').value = p.selling_price;
    document.getElementById('prod-quantity').value = p.quantity;

    document.getElementById('productModalLabel').textContent = 'Modify Phone Model Details';
    productModal.show();
  } catch (err) {
    alert(err.message);
  }
}

async function saveProduct(event) {
  event.preventDefault();

  const id = document.getElementById('prod-id').value;
  const payload = {
    brand: document.getElementById('prod-brand').value.trim(),
    model: document.getElementById('prod-model').value.trim(),
    ram: document.getElementById('prod-ram').value.trim(),
    storage: document.getElementById('prod-storage').value.trim(),
    battery: document.getElementById('prod-battery').value.trim(),
    warranty: document.getElementById('prod-warranty').value.trim(),
    camera: document.getElementById('prod-camera').value.trim(),
    processor: document.getElementById('prod-processor').value.trim(),
    imei: document.getElementById('prod-imei').value.trim(),
    image_url: document.getElementById('prod-image-url').value.trim(),
    purchase_price: parseFloat(document.getElementById('prod-purchase').value),
    selling_price: parseFloat(document.getElementById('prod-selling').value),
    quantity: parseInt(document.getElementById('prod-quantity').value)
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to save product details');

    productModal.hide();
    loadInventoryData();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you absolutely sure you want to remove this product from showroom database?')) return;

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });

    if (!response.ok) throw new Error('Delete failed');
    loadInventoryData();
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// TAB C: CUSTOMERS CRM MANAGEMENT
// -------------------------------------------------------------

async function loadCustomerData(query = '') {
  try {
    let url = '/api/customers';
    const response = await fetch(url, { headers: getHeaders() });
    let customers = await response.json();

    if (query) {
      const q = query.toLowerCase();
      customers = customers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    const tbody = document.getElementById('crm-table-body');
    tbody.innerHTML = '';

    if (customers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No customer records matching query.</td></tr>';
      return;
    }

    customers.forEach(c => {
      const regDate = new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      tbody.innerHTML += `
        <tr>
          <td><strong>PM-C-${100 + c.id}</strong></td>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td>${c.email || 'N/A'}</td>
          <td>${c.address || 'N/A'}</td>
          <td>${regDate}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-outline-warning py-0 px-2" onclick="viewCustomerHistory(${c.id})" title="History"><i class="fa-solid fa-history"></i></button>
              <button class="btn btn-sm btn-outline-info py-0 px-2" onclick="editCustomer(${c.id})"><i class="fa-solid fa-pen"></i></button>
              ${currentUser.role === 'admin' ? `<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteCustomer(${c.id})"><i class="fa-solid fa-trash"></i></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function searchCRM() {
  const query = document.getElementById('crm-search-input').value.trim();
  loadCustomerData(query);
}

function showAddCustomerModal() {
  document.getElementById('customer-form').reset();
  document.getElementById('cust-id').value = '';
  document.getElementById('customerModalLabel').textContent = 'Add New Customer Profile';
  customerModal.show();
}

async function editCustomer(id) {
  try {
    const response = await fetch(`/api/customers/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Customer not found');
    const c = await response.json();

    document.getElementById('cust-id').value = c.id;
    document.getElementById('cust-name').value = c.name;
    document.getElementById('cust-phone').value = c.phone;
    document.getElementById('cust-email').value = c.email || '';
    document.getElementById('cust-address').value = c.address || '';

    document.getElementById('customerModalLabel').textContent = 'Modify Customer Profile';
    customerModal.show();
  } catch (err) {
    alert(err.message);
  }
}

async function saveCustomer(event) {
  event.preventDefault();
  const id = document.getElementById('cust-id').value;
  const payload = {
    name: document.getElementById('cust-name').value.trim(),
    phone: document.getElementById('cust-phone').value.trim(),
    email: document.getElementById('cust-email').value.trim(),
    address: document.getElementById('cust-address').value.trim()
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/customers/${id}` : '/api/customers';

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to save customer account');

    customerModal.hide();
    loadCustomerData();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteCustomer(id) {
  if (!confirm('Are you sure you want to delete this customer account?')) return;
  try {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Delete failed');
    loadCustomerData();
  } catch (err) {
    alert(err.message);
  }
}

async function viewCustomerHistory(customerId) {
  try {
    const response = await fetch(`/api/customers/${customerId}/history`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Unable to get customer log');
    const history = await response.json();

    const tbody = document.getElementById('history-table-body');
    tbody.innerHTML = '';

    if (history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No purchases logged.</td></tr>';
    } else {
      history.forEach(h => {
        const d = new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const costVal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(h.item_total);
        tbody.innerHTML += `
          <tr>
            <td><strong>${h.invoice_number}</strong></td>
            <td>${d}</td>
            <td><strong>${h.brand} ${h.model}</strong></td>
            <td>${h.item_quantity}</td>
            <td>${costVal}</td>
            <td><span class="badge bg-secondary">${h.payment_mode}</span></td>
          </tr>
        `;
      });
    }

    historyModal.show();
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// TAB D: POS BILLING & INVOICING SYSTEM
// -------------------------------------------------------------

function initPOSBilling() {
  posCart = [];
  selectedPosCustomer = null;
  document.getElementById('pos-phone-lookup').value = '';
  document.getElementById('pos-customer-name').value = '';
  document.getElementById('pos-customer-email').value = '';
  document.getElementById('pos-customer-address').value = '';
  document.getElementById('pos-discount').value = 0;
  
  // Close extra contact info fields
  document.getElementById('pos-cust-email-col').classList.add('d-none');
  document.getElementById('pos-cust-address-col').classList.add('d-none');
  document.getElementById('btn-toggle-pos-details').textContent = 'Add More Contact Info';
  
  renderPosCart();
  searchPosProducts();
  togglePosPaymentDetails();
}

function togglePosCustomerDetails() {
  const emailCol = document.getElementById('pos-cust-email-col');
  const addrCol = document.getElementById('pos-cust-address-col');
  const btn = document.getElementById('btn-toggle-pos-details');

  if (emailCol.classList.contains('d-none')) {
    emailCol.classList.remove('d-none');
    addrCol.classList.remove('d-none');
    btn.textContent = 'Hide Extra Details';
  } else {
    emailCol.classList.add('d-none');
    addrCol.classList.add('d-none');
    btn.textContent = 'Add More Contact Info';
  }
}

async function posLookupCustomer() {
  const phone = document.getElementById('pos-phone-lookup').value.trim();
  if (!phone) {
    alert('Please enter a phone number to scan');
    return;
  }

  try {
    const response = await fetch(`/api/customers/search/phone?phone=${encodeURIComponent(phone)}`, { headers: getHeaders() });
    if (!response.ok) {
      alert('Phone number not registered. Enter details below to create new client account.');
      selectedPosCustomer = null;
      document.getElementById('pos-customer-name').value = '';
      return;
    }
    const c = await response.json();
    selectedPosCustomer = c;
    document.getElementById('pos-customer-name').value = c.name;
    document.getElementById('pos-customer-email').value = c.email || '';
    document.getElementById('pos-customer-address').value = c.address || '';
    
    // Automatically reveal email and address if present
    if (c.email || c.address) {
      document.getElementById('pos-cust-email-col').classList.remove('d-none');
      document.getElementById('pos-cust-address-col').classList.remove('d-none');
      document.getElementById('btn-toggle-pos-details').textContent = 'Hide Extra Details';
    }
  } catch (err) {
    console.error(err);
  }
}

async function searchPosProducts() {
  const query = document.getElementById('pos-prod-search').value.trim();
  let url = '/api/products';
  if (query) url += `?search=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, { headers: getHeaders() });
    const products = await response.json();

    const tbody = document.getElementById('pos-product-search-results');
    tbody.innerHTML = '';

    // Only show available/stock items
    products.forEach(p => {
      const priceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(p.selling_price);
      
      tbody.innerHTML += `
        <tr>
          <td>
            <strong>${p.brand}</strong><br>
            <span class="text-muted small">${p.model} (${p.ram}/${p.storage})</span>
          </td>
          <td><strong class="text-warning">${priceFormatted}</strong></td>
          <td>${p.quantity === 0 ? '<span class="badge bg-danger">OUT</span>' : p.quantity}</td>
          <td>
            <button class="btn btn-xs btn-primary-premium py-1 px-2" onclick="posAddToCart(${p.id})" ${p.quantity === 0 ? 'disabled' : ''}>
              <i class="fa-solid fa-cart-plus"></i>
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function posAddToCart(productId) {
  // Check if already in cart
  const existing = posCart.find(item => item.product_id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    // Find product details
    fetch(`/api/products/${productId}`, { headers: getHeaders() })
      .then(res => res.json())
      .then(p => {
        posCart.push({
          product_id: p.id,
          brand: p.brand,
          model: p.model,
          ram: p.ram,
          storage: p.storage,
          unit_price: p.selling_price,
          quantity: 1,
          max_stock: p.quantity
        });
        renderPosCart();
      });
    return;
  }
  renderPosCart();
}

function renderPosCart() {
  const list = document.getElementById('pos-cart-list');
  const emptyMsg = document.getElementById('cart-empty-msg');

  if (posCart.length === 0) {
    list.innerHTML = '';
    emptyMsg.classList.remove('d-none');
    recalculateCartTotals();
    return;
  }

  emptyMsg.classList.add('d-none');
  list.innerHTML = posCart.map((item, index) => {
    const totalItemVal = item.unit_price * item.quantity;
    const formattedItemTotal = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalItemVal);

    return `
      <div class="pos-cart-item text-light">
        <div style="max-width: 60%;">
          <strong class="text-light">${item.brand} ${item.model}</strong><br>
          <span class="text-muted small">${item.ram}/${item.storage} | Unit: ₹${item.unit_price.toLocaleString('en-IN')}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <input type="number" class="form-control form-control-premium py-1 px-2 text-center" style="width: 70px;" value="${item.quantity}" min="1" max="${item.max_stock}" onchange="posUpdateQty(${index}, this.value)">
          <strong class="text-warning small" style="min-width: 80px; text-align: right;">${formattedItemTotal}</strong>
          <button class="btn btn-sm text-danger py-0 px-2" onclick="posRemoveFromCart(${index})"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>
    `;
  }).join('');

  recalculateCartTotals();
}

function posUpdateQty(index, val) {
  const qty = parseInt(val);
  if (qty > posCart[index].max_stock) {
    alert(`Only ${posCart[index].max_stock} units available in showroom stock.`);
    posCart[index].quantity = posCart[index].max_stock;
  } else {
    posCart[index].quantity = qty > 0 ? qty : 1;
  }
  renderPosCart();
}

function posRemoveFromCart(index) {
  posCart.splice(index, 1);
  renderPosCart();
}

function recalculateCartTotals() {
  let subtotal = 0;
  posCart.forEach(item => {
    subtotal += item.unit_price * item.quantity;
  });

  const discount = parseFloat(document.getElementById('pos-discount').value || 0);
  const netBeforeGst = subtotal - discount;
  
  // GST calculation (18% inclusive)
  // GST = NetAmount * 18 / 118
  const gst = netBeforeGst > 0 ? parseFloat((netBeforeGst * 18 / 118).toFixed(2)) : 0;
  const grandTotal = netBeforeGst > 0 ? parseFloat(netBeforeGst.toFixed(2)) : 0;

  const curFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
  document.getElementById('pos-subtotal').textContent = curFormatter.format(subtotal);
  document.getElementById('pos-gst').textContent = curFormatter.format(gst);
  document.getElementById('pos-grand-total').textContent = curFormatter.format(grandTotal);

  // Update Dynamic QR payment code value
  const qrSection = document.getElementById('pos-qr-section');
  if (!qrSection.classList.contains('d-none')) {
    document.getElementById('qr-val-amount').textContent = `Payable Amount: ${curFormatter.format(grandTotal)}`;
    generateUpiQr(grandTotal);
  }
}

function togglePosPaymentDetails() {
  const mode = document.getElementById('pos-payment-mode').value;
  const qrSection = document.getElementById('pos-qr-section');
  const total = parseFloat(document.getElementById('pos-grand-total').textContent.replace(/[^\d.]/g, ''));

  if (mode !== 'Cash') {
    qrSection.classList.remove('d-none');
    document.getElementById('qr-val-amount').textContent = `Payable Amount: ₹${total.toLocaleString('en-IN')}`;
    generateUpiQr(total);
  } else {
    qrSection.classList.add('d-none');
  }
}

function generateUpiQr(amount) {
  const upiId = '7639568348@okbizaxis';
  const merchantName = 'PRIYAM MOBILES';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR`;
  
  // Call free QRserver API
  const qrImg = document.getElementById('dynamic-qr-image');
  qrImg.className = 'd-none'; // Hide fontawesome icon
  
  // Create an image node instead of fontawesome or updates its wrapper background
  const qrBox = document.querySelector('.qr-box');
  qrBox.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}" alt="UPI QR Code" style="width: 100%; height: 100%;">`;
}

async function submitPosInvoice() {
  if (posCart.length === 0) {
    alert('Billing cart is empty.');
    return;
  }

  const custName = document.getElementById('pos-customer-name').value.trim();
  const phone = document.getElementById('pos-phone-lookup').value.trim();
  const email = document.getElementById('pos-customer-email').value.trim();
  const address = document.getElementById('pos-customer-address').value.trim();
  const discount = parseFloat(document.getElementById('pos-discount').value || 0);
  const paymentMode = document.getElementById('pos-payment-mode').value;

  if (phone && !/^\d{10}$/.test(phone)) {
    alert('Please enter a valid 10-digit mobile number.');
    return;
  }

  const payload = {
    customer: {
      id: selectedPosCustomer ? selectedPosCustomer.id : null,
      name: custName || 'Walk-in Customer',
      phone: phone || '0000000000',
      email,
      address
    },
    items: posCart.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity
    })),
    discount,
    payment_mode: paymentMode
  };

  try {
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Transaction failed');
    }

    const data = await response.json();
    alert('POS Billing transaction logged successfully!');
    
    // Load invoice printable preview
    loadInvoicePrint(data.sale.id);
    
    // Reset Cart
    initPOSBilling();
  } catch (err) {
    alert(err.message);
  }
}

async function loadInvoicePrint(saleId) {
  try {
    const response = await fetch(`/api/sales/${saleId}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Failed to find printed invoice details');
    const sale = await response.json();

    document.getElementById('inv-show-cust-name').textContent = sale.customer_name;
    document.getElementById('inv-show-cust-phone').textContent = sale.customer_phone;
    document.getElementById('inv-show-number').textContent = sale.invoice_number;
    
    const dStr = new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('inv-show-date').textContent = dStr;

    // Build items rows
    const tbody = document.getElementById('inv-show-items-body');
    tbody.innerHTML = '';
    
    sale.items.forEach(item => {
      const totalItemCost = item.unit_price * item.quantity;
      tbody.innerHTML += `
        <tr>
          <td>
            <strong>${item.brand} ${item.model}</strong>
          </td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-end">₹${item.unit_price.toLocaleString('en-IN')}</td>
          <td class="text-end">₹${totalItemCost.toLocaleString('en-IN')}</td>
        </tr>
      `;
    });

    const curFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
    document.getElementById('inv-show-subtotal').textContent = curFormatter.format(sale.subtotal);
    document.getElementById('inv-show-discount').textContent = curFormatter.format(sale.discount);
    document.getElementById('inv-show-gst').textContent = curFormatter.format(sale.gst);
    document.getElementById('inv-show-grand').textContent = curFormatter.format(sale.total_amount);
    document.getElementById('inv-show-mode').textContent = sale.payment_mode;

    invoiceModal.show();
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// TAB E: SERVICE BOARD (REPAIRS CRM)
// -------------------------------------------------------------

async function loadServicesData() {
  try {
    const response = await fetch('/api/services', { headers: getHeaders() });
    const repairs = await response.json();

    const tbody = document.getElementById('services-table-body');
    tbody.innerHTML = '';

    if (repairs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No repair work orders pending.</td></tr>';
      return;
    }

    repairs.forEach(sr => {
      const classStatus = sr.status.toLowerCase().replace(/ /g, '_');
      const estFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(sr.actual_cost || sr.estimated_cost);

      tbody.innerHTML += `
        <tr>
          <td><strong class="text-warning">${sr.id}</strong></td>
          <td><strong>${sr.customer_name}</strong></td>
          <td>${sr.customer_phone}</td>
          <td>${sr.device_model}</td>
          <td class="text-truncate" style="max-width: 180px;" title="${sr.issue_description}">${sr.issue_description}</td>
          <td>${estFormatted}</td>
          <td><span class="badge-status ${classStatus}">${sr.status}</span></td>
          <td>
            <button class="btn btn-sm btn-outline-info py-0 px-2" onclick="editRepair('${sr.id}')">
              <i class="fa-solid fa-screwdriver-wrench"></i> Manage
            </button>
          </td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

function showAddRepairModal() {
  document.getElementById('repair-form').reset();
  document.getElementById('repair-id').value = '';
  document.getElementById('repair-id-display-col').classList.add('d-none');
  document.getElementById('repair-actual-cost-col').classList.add('d-none');
  
  // Make inputs editable
  document.getElementById('repair-cust-name').readOnly = false;
  document.getElementById('repair-cust-phone').readOnly = false;
  document.getElementById('repair-device').readOnly = false;
  document.getElementById('repair-issue').readOnly = false;

  document.getElementById('repairModalLabel').textContent = 'Open Repair Request';
  repairModal.show();
}

async function editRepair(id) {
  try {
    const response = await fetch(`/api/services/${id}`, { headers: getHeaders() });
    if (!response.ok) throw new Error('Repair ticket not found');
    const sr = await response.json();

    document.getElementById('repair-id').value = sr.id;
    document.getElementById('repair-id-val').value = sr.id;
    document.getElementById('repair-id-display-col').classList.remove('d-none');
    
    document.getElementById('repair-cust-name').value = sr.customer_name;
    document.getElementById('repair-cust-name').readOnly = true;
    
    document.getElementById('repair-cust-phone').value = sr.customer_phone || 'N/A';
    document.getElementById('repair-cust-phone').readOnly = true;
    
    document.getElementById('repair-device').value = sr.device_model;
    document.getElementById('repair-device').readOnly = true;
    
    document.getElementById('repair-issue').value = sr.issue_description;
    document.getElementById('repair-issue').readOnly = true;
    
    document.getElementById('repair-est-cost').value = sr.estimated_cost;
    document.getElementById('repair-actual-cost').value = sr.actual_cost || sr.estimated_cost;
    
    document.getElementById('repair-status').value = sr.status;
    document.getElementById('repair-comments').value = sr.comments || '';

    // Show/hide actual cost based on status selection
    const actCol = document.getElementById('repair-actual-cost-col');
    if (sr.status === 'Ready for Collection' || sr.status === 'Delivered') {
      actCol.classList.remove('d-none');
    } else {
      actCol.classList.add('d-none');
    }

    // Bind state change to show/reveal actual cost
    document.getElementById('repair-status').onchange = (e) => {
      if (e.target.value === 'Ready for Collection' || e.target.value === 'Delivered') {
        actCol.classList.remove('d-none');
      } else {
        actCol.classList.add('d-none');
      }
    };

    document.getElementById('repairModalLabel').textContent = 'Manage Repair Order';
    repairModal.show();
  } catch (err) {
    alert(err.message);
  }
}

async function saveRepair(event) {
  event.preventDefault();

  const id = document.getElementById('repair-id').value;
  const payload = {
    customer_name: document.getElementById('repair-cust-name').value.trim(),
    customer_phone: document.getElementById('repair-cust-phone').value.trim(),
    device_model: document.getElementById('repair-device').value.trim(),
    issue_description: document.getElementById('repair-issue').value.trim(),
    estimated_cost: parseFloat(document.getElementById('repair-est-cost').value || 0),
    actual_cost: parseFloat(document.getElementById('repair-actual-cost').value || 0),
    status: document.getElementById('repair-status').value,
    comments: document.getElementById('repair-comments').value.trim()
  };

  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/services/${id}` : '/api/services';

  try {
    const response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error('Failed to update service ticket');

    repairModal.hide();
    loadServicesData();
  } catch (err) {
    alert(err.message);
  }
}

// -------------------------------------------------------------
// TAB F: MARKETING CAMPAIGNS SIMULATION
// -------------------------------------------------------------

async function triggerMarketingCampaign(event) {
  event.preventDefault();

  const campaignType = document.getElementById('campaign-type').value;
  const audienceGroup = document.getElementById('campaign-audience').value;
  const messageContent = document.getElementById('campaign-message').value.trim();
  const logBox = document.getElementById('marketing-logs');

  logBox.innerHTML += `\n[${new Date().toLocaleTimeString()}] Initializing Campaign: ${campaignType} to ${audienceGroup}...`;

  try {
    const response = await fetch('/api/marketing/send', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ campaignType, audienceGroup, messageContent })
    });

    if (!response.ok) throw new Error('Campaign execution failed');

    const data = await response.json();
    
    // Log outputs
    logBox.innerHTML += `\n[SUCCESS] Simulated campaign dispatched. Total recipients: ${data.recipient_count}`;
    
    data.recipients.forEach(r => {
      logBox.innerHTML += `\n -> Send sim message to ${r.name} (${r.phone}): "${messageContent.slice(0, 30)}..."`;
    });

    document.getElementById('marketing-campaign-form').reset();
  } catch (err) {
    logBox.innerHTML += `\n[ERROR] ${err.message}`;
  }
}

// -------------------------------------------------------------
// TAB G: DATA CSV REPORT GENERATORS
// -------------------------------------------------------------

async function exportReport(moduleType) {
  let data = [];
  let filename = `priyam_mobiles_${moduleType}_report_${Date.now()}.csv`;
  let csvContent = "data:text/csv;charset=utf-8,";

  try {
    if (moduleType === 'sales') {
      const response = await fetch('/api/sales', { headers: getHeaders() });
      data = await response.json();

      // CSV Headers
      csvContent += "Invoice Number,Date,Customer,Phone,Subtotal,Discount,GST (18%),Total Net Amount,Payment Mode\n";
      
      data.forEach(s => {
        csvContent += `"${s.invoice_number}","${s.date}","${s.customer_name}","${s.customer_phone}",${s.subtotal},${s.discount},${s.gst},${s.total_amount},"${s.payment_mode}"\n`;
      });

    } else if (moduleType === 'inventory') {
      const response = await fetch('/api/products', { headers: getHeaders() });
      data = await response.json();

      csvContent += "Product ID,Brand,Model,Specs,IMEI,Purchase Price,Selling Price,Stock Quantity,Warranty\n";
      
      data.forEach(p => {
        csvContent += `"PM-P-${1000+p.id}","${p.brand}","${p.model}","${p.ram}/${p.storage}","${p.imei || ''}",${p.purchase_price},${p.selling_price},${p.quantity},"${p.warranty}"\n`;
      });

    } else if (moduleType === 'services') {
      const response = await fetch('/api/services', { headers: getHeaders() });
      data = await response.json();

      csvContent += "Service ID,Customer,Phone,Device Model,Issue Details,Est. Cost,Actual Cost,Status,Comments,Last Updated\n";
      
      data.forEach(sr => {
        csvContent += `"${sr.id}","${sr.customer_name}","${sr.customer_phone}","${sr.device_model}","${sr.issue_description}",${sr.estimated_cost},${sr.actual_cost},"${sr.status}","${sr.comments || ''}","${sr.updated_at}"\n`;
      });
    }

    // Dynamic Download Action
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    alert(`Failed to export reports: ${err.message}`);
  }
}
