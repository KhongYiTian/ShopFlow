const uiStrings = {
  // Navigation Bar (Shared across all HTML files)
  navHomeText: "Home",
  navProductsText: "Products",
  navCartText: "Shopping Cart",
  navTrackingText: "Track Order",
  navStockText: "Stock",
  navOrdersText: "Orders",
  navLoginText: "Login",

  // index.html
  heroTitle: "ShopFlow E-Commerce",
  heroDesc: "Simple online shopping with order fulfilment and stock tracking.",
  btnShopNow: "Shop Now",

  // login.html
  loginTitle: "Account Login",
  lblLanguage: "Select Preferred Language:",
  lblCurrency: "Select Region & Currency:",
  lblUser: "Username",
  lblPass: "Password",
  btnLogin: "Login",
  phUsername: "Enter username",
  phPassword: "Enter password",

  // Registration Form Translations
  regTitle: "Register New Account",
  lblRegUser: "Username",
  lblRegPass: "Password",
  lblRegRole: "Account Type",
  optRoleUser: "Customer (Standard User)",
  optRoleAdmin: "Administrator",
  btnRegister: "Register Account",
  phRegUsername: "Choose a username",
  phRegPassword: "Choose a password (min 6 chars)",

  // Account Overview / Logout Card Translations
  sessionTitle: "Account Overview",
  lblLoggedInAs: "Logged in as",
  btnLogout: "Logout Account",

  // products.html
  productsTitle: "Products",
  lblSearch: "Search Products:",
  lblCategory: "Filter by Category:",
  optAllCategories: "All Categories",
  btnGoCartText: "Go to Shopping Cart",
  phSearchProducts: "Search products by name...",
  btnAddToCart: "Add to Cart",
  btnOutOfStock: "Out of Stock",

  // shoppingCart.html
  cartTitle: "Shopping Cart",
  lblCustomerName: "Name",
  lblCustomerEmail: "Email",
  lblShippingAddress: "Shipping Address",
  btnPlaceOrder: "Place Order",
  msgEmptyCart: "Your shopping cart is empty.",
  phCustomerName: "Enter full name",
  phCustomerEmail: "Enter email address",
  phShippingAddress: "Enter shipping address",

  // tracking.html
  trackingTitle: "Live Order Tracking",
  lblTrackingInput: "Enter Order ID or Tracking Number:",
  btnSearchTracking: "Track",

  // stock.html
  stockTitle: "Stock Management",
  stockDesc: "Products with stock below 5 are highlighted as low stock.",
  lblProductId: "Product ID (Required for Read/Update/Delete)",
  lblProductName: "Product name",
  lblProductCategory: "Category",
  lblPrice: "Price",
  lblStockQty: "Stock",
  lblImageUrl: "Image File Name / URL",
  createBtn: "Create Product",
  readBtn: "Read Product",
  updateBtn: "Update Product",
  deleteBtn: "Delete Product",
  cancelEdit: "Cancel",
  phProductId: "Enter Product ID to Search/Update",
  phProductName: "Enter product name",
  phPrice: "e.g. 19.99",
  phStock: "e.g. 10",
  phImageUrl: "e.g. Headphones.jpg",
  optSelectCategory: "Select Category",
  catElectronics: "Electronics",
  catFashion: "Fashion",
  catAccessories: "Accessories",
  catSports: "Sports",

  // orders.html
  ordersTitle: "Orders Management"
};

const inputPlaceholderMap = {
  search: "phSearchProducts",
  customerName: "phCustomerName",
  customerEmail: "phCustomerEmail",
  shippingAddress: "phShippingAddress",
  productId: "phProductId",
  productName: "phProductName",
  price: "phPrice",
  stock: "phStock",
  imageUrl: "phImageUrl",
  username: "phUsername",
  password: "phPassword",
  // Added Registration Placeholders
  regUsername: "phRegUsername",
  regPassword: "phRegPassword"
};

const currencySymbols = {
  USD: "$",
  MYR: "RM",
  EUR: "€",
  CNY: "¥"
};

let currentLang = localStorage.getItem("userLang") || "en";
let currentCurrency = localStorage.getItem("userCurrency") || "USD";
let activeTranslations = { ...uiStrings };
let leafletMap = null;

// ==========================================
// User Session Management & Role Enforcement
// ==========================================

function getCurrentUser() {
  const stored = localStorage.getItem("currentUser");
  return stored ? JSON.parse(stored) : { role: "user", username: "Guest" };
}

function setCurrentUser(user) {
  localStorage.setItem("currentUser", JSON.stringify(user));
  applyRolePermissions();
}

async function logoutUser() {
  try {
    await fetch("/api/logout", { method: "POST" });
  } catch (err) {
    console.error("Logout API request error:", err);
  }

  localStorage.removeItem("currentUser");
  applyRolePermissions();
  alert("You have been logged out successfully.");
  window.location.reload();
}

// Controls UI display based on user status (Without overriding standard navbar clicks)
function applyRolePermissions() {
  const user = getCurrentUser();
  const adminElements = document.querySelectorAll(".admin-only");
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const userSessionCard = document.getElementById("userSessionCard");

  // Show or hide admin links in navigation
  adminElements.forEach(el => {
    el.style.display = user.role === "admin" ? "inline-block" : "none";
  });

  // Restrict admin pages from non-admin users
  const path = window.location.pathname.toLowerCase();
  if ((path.includes("stock.html") || path.includes("orders.html")) && user.role !== "admin") {
    alert("Access restricted to Administrators only.");
    window.location.href = "index.html";
  }

  // Handle Login/Register Forms vs User Session Card on login.html
  if (user.username !== "Guest") {
    if (loginForm) loginForm.style.display = "none";
    if (registerForm) registerForm.style.display = "none";
    if (userSessionCard) {
      userSessionCard.style.display = "block";
      const usernameEl = document.getElementById("loggedInUsername");
      const roleEl = document.getElementById("loggedInRole");
      if (usernameEl) usernameEl.textContent = user.username;
      if (roleEl) roleEl.textContent = user.role.toUpperCase();
    }
  } else {
    if (loginForm) loginForm.style.display = "block";
    if (registerForm) registerForm.style.display = "block";
    if (userSessionCard) userSessionCard.style.display = "none";
  }

  // Update navigation Login link text dynamically (No click hijacking)
  const loginNavText = document.getElementById("navLoginText");
  if (loginNavText) {
    loginNavText.textContent = user.username !== "Guest" ? `Account (${user.username})` : (activeTranslations.navLoginText || "Login");
  }
}

// ==========================================
// Translation & Currency Helpers
// ==========================================

function updateStockPriceLabel() {
  const lblPrice = document.getElementById("lblPrice");
  if (lblPrice) {
    const symbol = currencySymbols[currentCurrency] || currentCurrency;
    const baseText = activeTranslations.lblPrice || "Price";
    lblPrice.innerText = `${baseText} (${symbol})`;
  }
}

async function translateUI(lang) {
  if (lang === "en") {
    activeTranslations = { ...uiStrings };
  } else {
    try {
      const res = await fetch("/api/translate/ui", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang, strings: uiStrings })
      });

      if (!res.ok) throw new Error("UI Translation failed");
      activeTranslations = await res.json();
    } catch (err) {
      console.error("Error applying UI translations:", err);
      activeTranslations = { ...uiStrings };
    }
  }

  for (const [id, translatedText] of Object.entries(activeTranslations)) {
    const el = document.getElementById(id);
    if (el && !inputPlaceholderMap[id]) {
      el.innerText = translatedText;
    }
  }

  for (const [inputId, stringKey] of Object.entries(inputPlaceholderMap)) {
    const el = document.getElementById(inputId);
    if (el && activeTranslations[stringKey]) {
      el.placeholder = activeTranslations[stringKey];
    }
  }

  updateStockPriceLabel();
}

async function applyLanguageAndCurrency(lang, currency) {
  currentLang = lang;
  currentCurrency = currency;

  localStorage.setItem("userLang", lang);
  localStorage.setItem("userCurrency", currency);

  await translateUI(lang);

  if (document.getElementById("productList")) fetchProducts();
  if (document.getElementById("cartItems")) renderCart();
  if (document.getElementById("ordersTable")) renderOrders();
}

// ==========================================
// Cart Management
// ==========================================

function getCart() { return JSON.parse(localStorage.getItem("cartItems") || "[]"); }
function saveCart(cart) { localStorage.setItem("cartItems", JSON.stringify(cart)); updateCartBadge(); }

function updateCartBadge() {
  const badge = document.getElementById("cartCount");
  if (badge) {
    const cart = getCart();
    badge.innerText = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

function addToCart(product) {
  const cart = getCart();
  const existing = cart.find(i => i.id === product.id);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });
  saveCart(cart);
  alert(`${product.name} added to cart!`);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  renderCart();
}

// ==========================================
// Product & Catalog Display
// ==========================================

async function fetchProducts() {
  const container = document.getElementById("productList");
  if (!container) return;

  try {
    const res = await fetch(`/api/products/translated?lang=${currentLang}`);
    const products = await res.json();

    const searchVal = (document.getElementById("search")?.value || "").toLowerCase();
    const catVal = document.getElementById("categoryFilter")?.value || "";

    const filtered = products.filter(p => 
      p.name.toLowerCase().includes(searchVal) && (!catVal || p.category === catVal)
    );

    const btnAddText = activeTranslations.btnAddToCart || "Add to Cart";
    const btnOutText = activeTranslations.btnOutOfStock || "Out of Stock";

    container.innerHTML = "";
    for (const p of filtered) {
      let displayPrice = Number(p.price).toFixed(2);
      let displayCurr = "USD";

      if (currentCurrency !== "USD") {
        const rateRes = await fetch(`/api/currency/convert?amount=${p.price}&currency=${currentCurrency}`);
        if (rateRes.ok) {
          const rateData = await rateRes.json();
          displayPrice = rateData.convertedAmount;
          displayCurr = rateData.currency;
        }
      }

      container.innerHTML += `
        <div class="card product-card">
          <img src="${p.image_url}" alt="${p.name}" class="product-image" onerror="this.src='default.jpg'">
          <h3>${p.name}</h3>
          <p class="category">${p.category}</p>
          <p class="price"><strong>${displayPrice} ${displayCurr}</strong></p>
          <p>Stock: ${p.stock}</p>
          <button onclick='addToCart(${JSON.stringify(p)})' ${p.stock < 1 ? 'disabled' : ''}>
            ${p.stock < 1 ? btnOutText : btnAddText}
          </button>
        </div>
      `;
    }
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

async function renderCart() {
  const container = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  if (!container) return;

  const cart = getCart();
  if (!cart.length) {
    const emptyMsg = activeTranslations.msgEmptyCart || "Your shopping cart is empty.";
    container.innerHTML = `<p>${emptyMsg}</p>`;
    if (totalEl) totalEl.innerHTML = `<strong>Total: 0.00 ${currentCurrency}</strong>`;
    return;
  }

  let totalUSD = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let displayTotal = totalUSD.toFixed(2);
  let displayCurrency = "USD";

  try {
    const res = await fetch(`/api/currency/convert?amount=${totalUSD}&currency=${currentCurrency}`);
    if (res.ok) {
      const data = await res.json();
      displayTotal = data.convertedAmount;
      displayCurrency = data.currency;
    }
  } catch (err) { console.error("Currency error:", err); }

  container.innerHTML = cart.map((item, idx) => `
    <div class="card cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
      <div>
        <h4>${item.name}</h4>
        <p>Quantity: ${item.quantity} x $${Number(item.price).toFixed(2)} USD</p>
      </div>
      <button onclick="removeFromCart(${idx})" style="background:#e74c3c; color:#fff; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">Remove</button>
    </div>
  `).join('');

  if (totalEl) totalEl.innerHTML = `<strong>Total: ${displayTotal} ${displayCurrency}</strong>`;
}

// ==========================================
// Order Placement & Orders Table View
// ==========================================

async function handlePlaceOrder(e) {
  e.preventDefault();

  const customerName = document.getElementById("customerName")?.value?.trim();
  const customerEmail = document.getElementById("customerEmail")?.value?.trim();
  const shippingAddress = document.getElementById("shippingAddress")?.value?.trim();
  const cart = getCart();

  if (!customerName || !customerEmail || !shippingAddress || !cart.length) {
    alert("Please fill in all fields and ensure your cart is not empty.");
    return;
  }

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerName,
        customerEmail,
        shippingAddress,
        items: cart,
        currency: currentCurrency
      })
    });

    const data = await res.json();

    if (res.ok) {
      alert(`Order placed successfully!\nTracking Number: ${data.trackingNumber}`);
      localStorage.removeItem("cartItems");
      updateCartBadge();
      window.location.href = "index.html";
    } else {
      alert(data.error || "Failed to place order.");
    }
  } catch (err) {
    console.error("Order submit error:", err);
    alert("An error occurred while placing the order.");
  }
}

async function renderOrders() {
  const container = document.getElementById("ordersTable");
  if (!container) return;

  try {
    const res = await fetch("/api/orders");
    const orders = await res.json();

    if (!orders.length) {
      container.innerHTML = "<p>No orders found.</p>";
      return;
    }

    let html = `
      <table border="1" cellpadding="8" style="width:100%; border-collapse:collapse; margin-top:10px;">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer Name</th>
            <th>Email</th>
            <th>Total Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const o of orders) {
      html += `
        <tr>
          <td>#${o.id}</td>
          <td>${o.customer_name}</td>
          <td>${o.customer_email}</td>
          <td>${o.total} ${o.currency}</td>
          <td>${o.status}</td>
          <td>${new Date(o.created_at).toLocaleString()}</td>
        </tr>
      `;
    }

    html += "</tbody></table>";
    container.innerHTML = html;
  } catch (err) {
    console.error("Error fetching orders:", err);
  }
}

// ==========================================
// Tracking & Leaflet Map
// ==========================================

function renderMap(lat, lon, address) {
  const mapContainer = document.getElementById("trackingContainer");
  if (mapContainer) mapContainer.style.display = "block";

  if (!leafletMap) {
    leafletMap = L.map('map').setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);
  } else {
    leafletMap.setView([lat, lon], 13);
  }

  L.marker([lat, lon]).addTo(leafletMap)
    .bindPopup(`<b>Shipment Destination</b><br>${address}`)
    .openPopup();
}

// ==========================================
// Initialization & Event Listeners
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  applyRolePermissions();

  const langSelect = document.getElementById("languageSelect");
  const currSelect = document.getElementById("currencySelect");

  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener("change", (e) => applyLanguageAndCurrency(e.target.value, currentCurrency));
  }

  if (currSelect) {
    currSelect.value = currentCurrency;
    currSelect.addEventListener("change", (e) => applyLanguageAndCurrency(currentLang, e.target.value));
  }

  // Bind Logout Button inside userSessionCard on login.html
  document.getElementById("btnLogout")?.addEventListener("click", logoutUser);

  // Handle Login Form Submission
  document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;
    const msg = document.getElementById("message");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        alert(`Logged in as ${data.user.role.toUpperCase()}: ${data.user.username}`);
        window.location.href = data.user.role === "admin" ? "stock.html" : "index.html";
      } else {
        if (msg) { msg.style.color = "red"; msg.innerText = data.error || "Login failed."; }
      }
    } catch (err) {
      if (msg) { msg.style.color = "red"; msg.innerText = "Error connecting to server."; }
    }
  });

  // Handle Registration Form Submission
  document.getElementById("registerForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("regUsername").value.trim();
    const password = document.getElementById("regPassword").value;
    const role = document.getElementById("regRole").value;
    const msg = document.getElementById("message");

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
      });

      const data = await res.json();
      if (res.ok) {
        if (msg) { msg.style.color = "green"; msg.innerText = "Account registered! Logging in..."; }
        setCurrentUser(data.user);
        setTimeout(() => {
          window.location.href = data.user.role === "admin" ? "stock.html" : "index.html";
        }, 1000);
      } else {
        if (msg) { msg.style.color = "red"; msg.innerText = data.error || "Registration failed."; }
      }
    } catch (err) {
      if (msg) { msg.style.color = "red"; msg.innerText = "Error connecting to server."; }
    }
  });

  const checkoutForm = document.getElementById("checkoutForm") || document.getElementById("cartForm");
  checkoutForm?.addEventListener("submit", handlePlaceOrder);

  document.getElementById("btnSearchTracking")?.addEventListener("click", async () => {
    const query = document.getElementById("trackingSearchInput")?.value?.trim();
    const msg = document.getElementById("message");
    if (!query) return;

    try {
      const res = await fetch(`/api/tracking/${encodeURIComponent(query)}`);
      const data = await res.json();

      if (res.ok) {
        if (msg) msg.innerText = "";
        const detailsEl = document.getElementById("trackingDetails");
        if (detailsEl) {
          detailsEl.innerText = `Tracking No: ${data.tracking_number} | Customer: ${data.customer_name} | Address: ${data.shipping_address}`;
        }
        renderMap(data.latitude, data.longitude, data.shipping_address);
      } else {
        if (msg) { msg.style.color = "red"; msg.innerText = data.error || "Tracking number not found."; }
      }
    } catch (err) {
      if (msg) { msg.style.color = "red"; msg.innerText = "Error searching for tracking details."; }
    }
  });

  updateCartBadge();
  applyLanguageAndCurrency(currentLang, currentCurrency);
});