/* ---------- Utility Functions ---------- */
function loadData(key) {
  return JSON.parse(localStorage.getItem(key)) || null;
}
function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

/* ---------- Global Variables ---------- */
let transactions = loadData("mkTransactions") || [];
let upiData = loadData("mkUPI") || {};
let monthlyGoal = loadData("mkMonthlyGoal") || 0;
let editingId = null;
let dashboardChart; // For Chart.js chart instance

/* ---------- On DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Common: Apply saved theme and attach theme toggle
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
    if (loadData("mkTheme") === "dark") {
      document.body.classList.add("dark-mode");
    }
  }

  // For transaction forms, default date to today if date element exists
  const txDateInput = document.getElementById("transaction-date");
  if (txDateInput) {
    txDateInput.valueAsDate = new Date();
  }

  // Execute page-specific code based on body id
  const pageId = document.body.id;
  if (pageId === "dashboard") {
    runDashboard();
  } else if (pageId === "transactions") {
    runTransactions();
  } else if (pageId === "upi") {
    runUPIManager();
  } else if (pageId === "recovery-goals") {
    runRecoveryGoals();
  }
});

/* ---------- Theme Toggle ---------- */
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  const theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  saveData("mkTheme", theme);
}

/* ---------- Dashboard Code ---------- */
function runDashboard() {
  updateDashboardCounters();
  renderDashboardChart();
}

// Update Dashboard Counters by reading transactions from LocalStorage
function updateDashboardCounters() {
  transactions = loadData("mkTransactions") || [];
  let totalGiven = 0,
      totalReceived = 0,
      pendingGave = 0,
      pendingReceived = 0;
  
  transactions.forEach(tx => {
    if (tx.type === "gave") {
      totalGiven += tx.amount;
      if (tx.status === "pending") pendingGave += tx.amount;
    } else if (tx.type === "received") {
      totalReceived += tx.amount;
      if (tx.status === "pending") pendingReceived += tx.amount;
    }
  });
  
  // Net pending: money given and not yet cleared minus money received but not yet cleared  
  const netPending = pendingGave - pendingReceived;
  animateCounter("counter-given", totalGiven);
  animateCounter("counter-received", totalReceived);
  animateCounter("counter-pending", netPending);
}

// Animate the counter numbers smoothly
function animateCounter(elementId, endValue) {
  const counterElem = document.querySelector(`#${elementId} p`);
  let startValue = 0;
  const duration = 1000;
  const stepTime = 10;
  const steps = duration / stepTime;
  const increment = endValue / steps;
  let current = 0;
  
  const counterInterval = setInterval(() => {
    current += increment;
    if ((increment > 0 && current >= endValue) || (increment < 0 && current <= endValue)) {
      current = endValue;
      clearInterval(counterInterval);
    }
    counterElem.textContent = "$" + current.toFixed(2);
  }, stepTime);
}

// Render a Chart.js doughnut chart showing total given vs received
function renderDashboardChart() {
  let totalGiven = 0,
      totalReceived = 0;
  transactions = loadData("mkTransactions") || [];
  transactions.forEach(tx => {
    if (tx.type === "gave") totalGiven += tx.amount;
    else if (tx.type === "received") totalReceived += tx.amount;
  });
  
  const data = {
    labels: ["Given", "Received"],
    datasets: [{
      data: [totalGiven, totalReceived],
      backgroundColor: ["#dc3545", "#28a745"]
    }]
  };
  
  const ctx = document.getElementById("dashboardChart").getContext("2d");
  if (dashboardChart) {
    dashboardChart.data = data;
    dashboardChart.update();
  } else {
    dashboardChart = new Chart(ctx, {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        animation: { animateScale: true }
      }
    });
  }
}

/* ---------- Transactions Code ---------- */
function runTransactions() {
  // Attach event listeners for transaction buttons and filters
  document.getElementById("submit-transaction").addEventListener("click", handleTransactionSubmit);
  document.getElementById("cancel-transaction").addEventListener("click", resetTransactionForm);
  document.getElementById("apply-filters").addEventListener("click", applyFilters);
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  
  renderTransactions();
}

function handleTransactionSubmit() {
  const purpose = document.getElementById("transaction-purpose").value.trim();
  const amount = parseFloat(document.getElementById("transaction-amount").value);
  const type = document.getElementById("transaction-type").value;
  const mode = document.getElementById("transaction-mode").value;
  const date = document.getElementById("transaction-date").value;
  const status = document.getElementById("transaction-status").value;
  
  if (!purpose || isNaN(amount) || !date) {
    alert("Please fill in all required fields.");
    return;
  }
  
  if (editingId) {
    transactions = transactions.map(tx => {
      if (tx.id === editingId) return { id: tx.id, purpose, amount, type, mode, date, status };
      return tx;
    });
    editingId = null;
    document.getElementById("submit-transaction").textContent = "Add Transaction";
    document.getElementById("cancel-transaction").style.display = "none";
  } else {
    const newTx = {
      id: Date.now(),
      purpose,
      amount,
      type,   // "gave" or "received"
      mode,   // "cash" or "upi"
      date,
      status  // "pending" or "cleared"
    };
    transactions.push(newTx);
  }
  
  saveData("mkTransactions", transactions);
  resetTransactionForm();
  renderTransactions();
}

function resetTransactionForm() {
  editingId = null;
  document.getElementById("transaction-id").value = "";
  document.getElementById("transaction-purpose").value = "";
  document.getElementById("transaction-amount").value = "";
  document.getElementById("transaction-type").value = "gave";
  document.getElementById("transaction-mode").value = "cash";
  document.getElementById("transaction-date").valueAsDate = new Date();
  document.getElementById("transaction-status").value = "pending";
  document.getElementById("submit-transaction").textContent = "Add Transaction";
  document.getElementById("cancel-transaction").style.display = "none";
}

function renderTransactions(filteredList = null) {
  const listDiv = document.getElementById("transaction-list");
  listDiv.innerHTML = "";
  const txList = filteredList || transactions;
  
  if (txList.length === 0) {
    listDiv.innerHTML = "<p>No transactions available.</p>";
    return;
  }
  
  // Sort transactions by date (most recent first)
  txList.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  txList.forEach(tx => {
    const txDiv = document.createElement("div");
    txDiv.className = "transaction-item";
    
    const detailsDiv = document.createElement("div");
    detailsDiv.className = "transaction-details";
    detailsDiv.innerHTML = `<strong>${tx.purpose}</strong> (${tx.type}, ${tx.mode})<br><small>${tx.date}</small>`;
    
    const amountSpan = document.createElement("span");
    amountSpan.textContent = (tx.type === "received" ? "+$" : "-$") + tx.amount.toFixed(2);
    
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "transaction-actions";
    
    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "edit-btn";
    editBtn.addEventListener("click", () => editTransaction(tx.id));
    
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "delete-btn";
    deleteBtn.addEventListener("click", () => deleteTransaction(tx.id));
    
    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    
    // If received transaction via UPI and still pending, add Payment Link button
    if (tx.type === "received" && tx.mode === "upi" && tx.status === "pending" && upiData.upiId) {
      const linkBtn = document.createElement("button");
      linkBtn.textContent = "Payment Link";
      linkBtn.className = "link-btn";
      linkBtn.addEventListener("click", () => generatePaymentLink(tx));
      actionsDiv.appendChild(linkBtn);
    }
    
    txDiv.appendChild(detailsDiv);
    txDiv.appendChild(amountSpan);
    txDiv.appendChild(actionsDiv);
    listDiv.appendChild(txDiv);
  });
}

function editTransaction(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  editingId = id;
  document.getElementById("transaction-purpose").value = tx.purpose;
  document.getElementById("transaction-amount").value = tx.amount;
  document.getElementById("transaction-type").value = tx.type;
  document.getElementById("transaction-mode").value = tx.mode;
  document.getElementById("transaction-date").value = tx.date;
  document.getElementById("transaction-status").value = tx.status;
  document.getElementById("submit-transaction").textContent = "Update Transaction";
  document.getElementById("cancel-transaction").style.display = "inline-block";
}

function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter(tx => tx.id !== id);
    saveData("mkTransactions", transactions);
    renderTransactions();
  }
}

function applyFilters() {
  const filterName = document.getElementById("filter-name").value.trim().toLowerCase();
  const filterDate = document.getElementById("filter-date").value;
  const filterStatus = document.getElementById("filter-status").value;
  const filterMode = document.getElementById("filter-mode").value;
  
  const filtered = transactions.filter(tx => {
    return (!filterName || tx.purpose.toLowerCase().includes(filterName)) &&
           (!filterDate || tx.date === filterDate) &&
           (!filterStatus || tx.status === filterStatus) &&
           (!filterMode || tx.mode === filterMode);
  });
  renderTransactions(filtered);
}

function clearFilters() {
  document.getElementById("filter-name").value = "";
  document.getElementById("filter-date").value = "";
  document.getElementById("filter-status").value = "";
  document.getElementById("filter-mode").value = "";
  renderTransactions();
}

function generatePaymentLink(tx) {
  if (!upiData.upiId) {
    alert("Please set your UPI details in the UPI Manager first.");
    return;
  }
  // Format: upi://pay?pa=upi-id&pn=user-name&am=amount
  const link = `upi://pay?pa=${encodeURIComponent(upiData.upiId)}&pn=${encodeURIComponent(upiData.name)}&am=${tx.amount.toFixed(2)}`;
  prompt("Copy your payment link:", link);
}

/* ---------- UPI Manager Code ---------- */
function runUPIManager() {
  document.getElementById("save-upi").addEventListener("click", saveUPI);
  renderUPIDisplay();
}

function saveUPI() {
  const name = document.getElementById("upi-name").value.trim();
  const upiId = document.getElementById("upi-id").value.trim();
  if (!name || !upiId) {
    alert("Please enter both your name and UPI ID.");
    return;
  }
  upiData = { name, upiId };
  saveData("mkUPI", upiData);
  renderUPIDisplay();
}

function renderUPIDisplay() {
  const displayDiv = document.getElementById("upi-display");
  if (upiData && upiData.upiId) {
    displayDiv.innerHTML = `<p>Your UPI: <span>${upiData.upiId}</span> (Name: <span>${upiData.name}</span>)</p>`;
  } else {
    displayDiv.innerHTML = "<p>No UPI details saved.</p>";
  }
}

/* ---------- Recovery Goals Code ---------- */
function runRecoveryGoals() {
  document.getElementById("set-goal").addEventListener("click", setMonthlyGoal);
  updateGoalProgress();
}

function setMonthlyGoal() {
  const goalInput = document.getElementById("goal-amount").value;
  const goalValue = parseFloat(goalInput);
  if (isNaN(goalValue) || goalValue <= 0) {
    alert("Please enter a valid goal amount.");
    return;
  }
  monthlyGoal = goalValue;
  saveData("mkMonthlyGoal", monthlyGoal);
  updateGoalProgress();
}

function updateGoalProgress() {
  // For the current month, sum “cleared” received transactions
  const currentMonth = new Date().toISOString().substring(0, 7);
  let clearedSum = 0;
  transactions = loadData("mkTransactions") || [];
  transactions.forEach(tx => {
    if (tx.type === "received" && tx.status === "cleared" && tx.date.startsWith(currentMonth)) {
      clearedSum += tx.amount;
    }
  });
  let progress = monthlyGoal ? Math.min((clearedSum / monthlyGoal) * 100, 100) : 0;
  document.getElementById("goal-progress-text").textContent = progress.toFixed(0) + "%";
  document.getElementById("progress-fill").style.width = progress + "%";
}
