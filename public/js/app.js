// Global State for Showroom Catalog
let currentFilters = {
  brand: '',
  search: '',
  sortByPrice: ''
};

// DOM Elements & Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Theme (Dark Mode is Default)
  initTheme();

  // Load Initial Product Catalog
  fetchCatalog();

  // Highlight Active Link in Navbar based on scroll position
  window.addEventListener('scroll', handleNavbarActiveState);
});

// Theme Toggle System
function initTheme() {
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme') || 'dark';

  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
  } else {
    document.body.classList.remove('light-theme');
    themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  themeToggleBtn.addEventListener('click', () => {
    if (document.body.classList.contains('light-theme')) {
      document.body.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
      themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun text-warning"></i>';
    }
  });
}

// Navbar Active state scroll indicator
function handleNavbarActiveState() {
  const sections = document.querySelectorAll('section, header');
  const navLinks = document.querySelectorAll('.nav-link-premium');
  let currentSec = 'home';

  sections.forEach(sec => {
    const sectionTop = sec.offsetTop;
    if (pageYOffset >= sectionTop - 150) {
      currentSec = sec.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentSec}`) {
      link.classList.add('active');
    }
  });
}

// -------------------------------------------------------------
// SHOWROOM CATALOG LOGIC
// -------------------------------------------------------------

// Fetch catalog with active filters
async function fetchCatalog() {
  const grid = document.getElementById('products-grid');
  let url = '/api/products';
  
  const queryParams = [];
  if (currentFilters.brand) queryParams.push(`brand=${encodeURIComponent(currentFilters.brand)}`);
  if (currentFilters.search) queryParams.push(`search=${encodeURIComponent(currentFilters.search)}`);
  if (currentFilters.sortByPrice) queryParams.push(`sortByPrice=${currentFilters.sortByPrice}`);

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&');
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load products');
    const products = await response.json();
    renderProducts(products);
  } catch (err) {
    console.error(err);
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fa-solid fa-circle-exclamation text-danger fs-1 mb-3"></i>
        <p class="text-danger fw-bold">Error loading showroom products. Please try again later.</p>
      </div>
    `;
  }
}

// Render products dynamically
function renderProducts(products) {
  const grid = document.getElementById('products-grid');
  
  if (products.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <i class="fa-solid fa-magnifying-glass-minus text-muted fs-2 mb-3"></i>
        <p class="text-muted">No mobile models match your criteria.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => {
    // EMI logic (mock: product pricing above ₹10,000 is eligible)
    const isEmiAvailable = product.selling_price >= 10000;
    const discountPercent = product.purchase_price > 0 && product.selling_price < product.purchase_price
      ? Math.round(((product.purchase_price - product.selling_price) / product.purchase_price) * 100)
      : 0;

    // Format Prices
    const sellingPriceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(product.selling_price);
    const retailPriceFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(product.purchase_price * 1.15 || product.selling_price + 2000);

    const waMessage = `Hello Priyam Mobiles! I am interested in purchasing:
Product: ${product.brand} ${product.model}
Specs: ${product.ram} RAM / ${product.storage} Storage
Showroom Price: ${sellingPriceFormatted}
Please confirm availability.`;

    const encodedMsg = encodeURIComponent(waMessage);

    // Stock level badge logic
    let stockBadge = '';
    if (product.quantity === 0) {
      stockBadge = '<span class="badge bg-danger position-absolute top-12 left-12" style="top: 12px; left: 12px; z-index: 10;">OUT OF STOCK</span>';
    } else if (product.quantity <= 3) {
      stockBadge = `<span class="badge bg-warning text-dark position-absolute" style="top: 12px; left: 12px; z-index: 10;">LOW STOCK (${product.quantity} LEFT)</span>`;
    }

    // Default image if placeholder URL
    const imageUrl = product.image_url.startsWith('http') || product.image_url.startsWith('/uploads') || product.image_url.startsWith('/assets') 
      ? product.image_url 
      : 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=60';

    return `
      <div class="col-sm-6 col-md-4 col-lg-3">
        <div class="glass-card product-card position-relative">
          ${stockBadge}
          ${discountPercent > 0 ? `<div class="product-discount-badge">${discountPercent}% OFF</div>` : ''}
          
          <div class="product-img-wrapper">
            <img src="${imageUrl}" alt="${product.brand} ${product.model}" class="product-img">
          </div>
          
          <div class="p-3 d-flex flex-column flex-grow-1">
            <span class="text-primary small fw-bold mb-1" style="font-size: 0.78rem;">${product.brand.toUpperCase()}</span>
            <h4 class="h6 fw-bold text-light mb-2 text-truncate" title="${product.brand} ${product.model}">${product.model}</h4>
            
            <div class="product-specs mb-3">
              <span class="spec-item"><i class="fa-solid fa-microchip"></i> ${product.processor}</span>
              <span class="spec-item"><i class="fa-solid fa-memory"></i> ${product.ram} + ${product.storage}</span>
              <span class="spec-item"><i class="fa-solid fa-battery-full"></i> ${product.battery}</span>
              <span class="spec-item"><i class="fa-solid fa-camera"></i> ${product.camera}</span>
            </div>
            
            <div class="mt-auto pt-2 border-top" style="border-color: var(--border-color) !important;">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <div>
                  <span class="fw-bold text-light h5 mb-0">${sellingPriceFormatted}</span>
                  <span class="text-muted text-decoration-line-through small ms-1" style="font-size: 0.75rem;">${retailPriceFormatted}</span>
                </div>
                ${isEmiAvailable ? '<span class="badge bg-success-subtle text-success small px-2 py-1" style="font-size: 0.7rem;">EMI OK</span>' : ''}
              </div>
              
              <a href="https://wa.me/917639568348?text=${encodedMsg}" target="_blank" class="btn-primary-premium btn-sm w-100 py-2 text-center d-flex justify-content-center align-items-center">
                <i class="fa-brands fa-whatsapp me-2"></i> Inquire / Order
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Brand card click callback
function filterByBrand(brand) {
  currentFilters.brand = brand;
  
  // Show UI badge for brand filter
  const banner = document.getElementById('active-brand-banner');
  const badgeName = document.getElementById('active-brand-name');
  banner.classList.remove('d-none');
  badgeName.textContent = brand;

  // Scroll to catalog
  document.getElementById('products').scrollIntoView({ behavior: 'smooth' });
  
  fetchCatalog();
}

function resetBrandFilter() {
  currentFilters.brand = '';
  document.getElementById('active-brand-banner').classList.add('d-none');
  fetchCatalog();
}

// Live typing Search
let searchTimeout;
function searchProducts() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentFilters.search = document.getElementById('product-search').value.trim();
    fetchCatalog();
  }, 300);
}

// Dropdown price sorting
function sortProducts() {
  currentFilters.sortByPrice = document.getElementById('price-sort').value;
  fetchCatalog();
}

// -------------------------------------------------------------
// MOBILE REPAIR SERVICE TRACKING
// -------------------------------------------------------------

async function trackServiceRequest() {
  const trackingIdInput = document.getElementById('tracking-id-input');
  const trackingId = trackingIdInput.value.trim();
  
  const resultBox = document.getElementById('tracking-result-box');
  const errorMsg = document.getElementById('tracking-error-msg');

  // Clear previous outputs
  resultBox.classList.add('d-none');
  errorMsg.classList.add('d-none');

  if (!trackingId) {
    alert('Please enter a valid Service Request ID.');
    return;
  }

  try {
    const response = await fetch(`/api/services/track/${encodeURIComponent(trackingId)}`);
    if (!response.ok) throw new Error('Request not found');
    const data = await response.json();

    // Fill results in box
    document.getElementById('track-ticket-id').textContent = data.id;
    document.getElementById('track-device-name').textContent = data.device_model;
    document.getElementById('track-issue-desc').textContent = data.issue_description;
    
    // Cost display
    const costFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(data.actual_cost || data.estimated_cost);
    document.getElementById('track-cost').textContent = costFormatted;
    
    // Date formatting
    const updatedDate = new Date(data.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    document.getElementById('track-date').textContent = updatedDate;

    // Status Badge text
    const badge = document.getElementById('track-status-badge');
    badge.textContent = data.status;
    badge.className = 'badge-status ' + data.status.toLowerCase().replace(' ', '_');

    // Notes
    document.getElementById('track-notes').textContent = data.comments || 'Technician has not provided additional updates yet.';

    // Manage status timeline steps
    updateTrackingTimeline(data.status);

    resultBox.classList.remove('d-none');
  } catch (err) {
    errorMsg.classList.remove('d-none');
  }
}

// Helper to configure timeline active items
function updateTrackingTimeline(status) {
  const steps = {
    pending: document.getElementById('step-pending'),
    repair: document.getElementById('step-repair'),
    ready: document.getElementById('step-ready'),
    delivered: document.getElementById('step-delivered')
  };

  // Reset classes
  Object.values(steps).forEach(step => {
    step.classList.remove('active', 'completed');
  });

  const statLower = status.toLowerCase();

  if (statLower === 'pending') {
    steps.pending.classList.add('active');
  } else if (statLower === 'under repair') {
    steps.pending.classList.add('completed');
    steps.repair.classList.add('active');
  } else if (statLower === 'ready for collection') {
    steps.pending.classList.add('completed');
    steps.repair.classList.add('completed');
    steps.ready.classList.add('active');
  } else if (statLower === 'delivered') {
    steps.pending.classList.add('completed');
    steps.repair.classList.add('completed');
    steps.ready.classList.add('completed');
    steps.delivered.classList.add('completed');
  }
}

// -------------------------------------------------------------
// CONTACT FORM SUBMISSION & WHATSAPP INTEGRATION
// -------------------------------------------------------------

function submitContactForm(event) {
  event.preventDefault();

  const name = document.getElementById('contact-name').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const subject = document.getElementById('contact-subject').value;
  const message = document.getElementById('contact-message').value.trim();

  // Show success alert
  const alertBox = document.getElementById('contact-success-alert');
  alertBox.classList.remove('d-none');

  // Trigger WhatsApp redirection containing subject and details
  const waMsgText = `Hello Priyam Mobiles!
I have submitted a contact inquiry:
Name: ${name}
Phone: ${phone}
Subject: ${subject}
Message: ${message}`;

  const encodedMsg = encodeURIComponent(waMsgText);
  
  setTimeout(() => {
    // Reset Form
    document.getElementById('contact-form').reset();
    alertBox.classList.add('d-none');
    
    // Redirect to whatsapp URL in a new tab
    window.open(`https://wa.me/917639568348?text=${encodedMsg}`, '_blank');
  }, 1500);
}
