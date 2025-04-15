/*
  MKPayTrack – Personal Payment & Debt Manager
  =============================================
  Features include:
  - Dashboard with animated counters and Chart.js graphs.
  - Add/Edit/Delete transactions (Gave/Received with Cash/UPI, date, status).
  - Filter transactions by name, date, status, and mode.
  - UPI Manager: Save personal UPI details and generate UPI payment links.
  - Monthly recovery goal tracker with animated progress bar.
  - Light/Dark theme toggle with smooth animations.
  - All data is stored in LocalStorage.
*/

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
let dashboardChart; // Chart.js instance

/* ---------- DOMContentLoaded ---------- */
document.addEventListener("DOMContentLoaded", () => {
  // Apply saved theme if any
  if (loadData("mkTheme") === "dark") {
    document.body.classList.add("dark-mode");
  }
  
  // Set default date for transaction form
  document.getElementById("transaction-date").valueAsDate = new Date();

  // Render initial sections
  renderTransactions();
  updateDashboard();
  renderDashboardChart();
  renderUPIDisplay();
  updateGoalProgress();

  // Event Listeners
  document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
  document.getElementById("submit-transaction").addEventListener("click", handleTransactionSubmit);
  document.getElementById("cancel-transaction").addEventListener("click", resetTransactionForm);
  document.getElementById("apply-filters").addEventListener("click", applyFilters);
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("save-upi").addEventListener("click", saveUPI);
  document.getElementById("set-goal").addEventListener("click", setMonthlyGoal);
});

/* ---------- Theme Toggle ---------- */
function toggleTheme() {
  document.body.classList.toggle("dark-mode");
  let theme = document.body.classList.contains("dark-mode") ? "dark" : "light";
  saveData("mkTheme", theme);
}

/* ---------- Transaction Management ---------- */
function handleTransactionSubmit() {
  const idField = document.getElementById("transaction-id");
  const purpose = document.getElementById("transaction-purpose").value.trim();
  const amount = parseFloat(document.getElementById("transaction-amount").value);
  const type = document.getElementById("transaction-type").value;
  const mode = document.getElementById("transaction-mode").value;
  const date = document.getElementById("transaction-date").value;
  const status = document.getElementById("transaction-status").value;
  
  // Basic validation
  if (!purpose || isNaN(amount) || !date) {
    alert("Please fill in all required fields.");
    return;
  }
  
  if (editingId) {
    // Update existing transaction
    transactions = transactions.map(tx => {
      if (tx.id === editingId) {
        return { id: tx.id, purpose, amount, type, mode, date, status };
      }
      return tx;
    });
    editingId = null;
    document.getElementById("submit-transaction").textContent = "Add Transaction";
    document.getElementById("cancel-transaction").style.display = "none";
  } else {
    // Create new transaction object
    const newTx = {
      id: Date.now(),
      purpose,
      amount,
      type,    // "gave" or "received"
      mode,    // "cash" or "upi"
      date,
      status   // "pending" or "cleared"
    };
    transactions.push(newTx);
  }
  
  saveData("mkTransactions", transactions);
  resetTransactionForm();
  renderTransactions();
  updateDashboard();
  renderDashboardChart();
  updateGoalProgress();
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

function renderTransactions(filtered = null) {
  const listDiv = document.getElementById("transaction-list");
  listDiv.innerHTML = "";
  let txList = filtered || transactions;
  
  if (txList.length === 0) {
    listDiv.innerHTML = "<p>No transactions available.</p>";
    return;
  }
  
  // Sort by date descending (recent first)
  txList.sort((a,b) => new Date(b.date) - new Date(a.date));
  
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
    
    // If transaction is a "received" UPI payment and pending, show payment link button if UPI data exists
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
  if (tx) {
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
}

function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this transaction?")) {
    transactions = transactions.filter(t => t.id !== id);
    saveData("mkTransactions", transactions);
    renderTransactions();
    updateDashboard();
    renderDashboardChart();
    updateGoalProgress();
  }
}

/* ---------- Filter & Search ---------- */
function applyFilters() {
  const filterName = document.getElementById("filter-name").value.trim().toLowerCase();
  const filterDate = document.getElementById("filter-date").value;
  const filterStatus = document.getElementById("filter-status").value;
  const filterMode = document.getElementById("filter-mode").value;
  
  const filtered = transactions.filter(tx => {
    let match = true;
    if (filterName && !tx.purpose.toLowerCase().includes(filterName)) match = false;
    if (filterDate && tx.date !== filterDate) match = false;
    if (filterStatus && tx.status !== filterStatus) match = false;
    if (filterMode && tx.mode !== filterMode) match = false;
    return match;
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

/* ---------- Dashboard Updates ---------- */
function updateDashboard() {
  let totalGiven = 0;
  let totalReceived = 0;
  let pendingGave = 0;
  let pendingReceived = 0;
  
  transactions.forEach(tx => {
    if (tx.type === "gave") {
      totalGiven += tx.amount;
      if (tx.status === "pending") pendingGave += tx.amount;
    } else {
      totalReceived += tx.amount;
      if (tx.status === "pending") pendingReceived += tx.amount;
    }
  });
  
  // Net pending: (money you gave out and are waiting to be repaid) minus (money you owe)
  const netPending = pendingGave - pendingReceived;
  
  animateCounter("counter-given", totalGiven);
  animateCounter("counter-received", totalReceived);
  animateCounter("counter-pending", netPending);
}

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

/* ---------- Dashboard Chart using Chart.js ---------- */
function renderDashboardChart() {
  let totalGiven = 0;
  let totalReceived = 0;
  transactions.forEach(tx => {
    if (tx.type === "gave") {
      totalGiven += tx.amount;
    } else {
      totalReceived += tx.amount;
    }
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
        animation: {
          animateScale: true
        }
      }
    });
  }
}

/* ---------- UPI Manager ---------- */
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
  if (upiData.upiId) {
    displayDiv.innerHTML = `<p>Your UPI: <span>${upiData.upiId}</span> (Name: <span>${upiData.name}</span>)</p>`;
  } else {
    displayDiv.innerHTML = "<p>No UPI details saved.</p>";
  }
}

/* Generate Payment Link for Received transactions */
function generatePaymentLink(tx) {
  if (!upiData.upiId) {
    alert("Please set your UPI details in the UPI Manager first.");
    return;
  }
  // Format: upi://pay?pa=upi-id&pn=user-name&am=amount
  const link = `upi://pay?pa=${encodeURIComponent(upiData.upiId)}&pn=${encodeURIComponent(upiData.name)}&am=${tx.amount.toFixed(2)}`;
  prompt("Copy your payment link:", link);
}

/* ---------- Recovery Goal Tracker ---------- */
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
  // For the current month, sum cleared "received" transactions
  const currentMonth = new Date().toISOString().substring(0, 7);
  let clearedSum = 0;
  transactions.forEach(tx => {
    if (tx.type === "received" && tx.status === "cleared" && tx.date.startsWith(currentMonth)) {
      clearedSum += tx.amount;
    }
  });
  let progress = monthlyGoal ? Math.min((clearedSum / monthlyGoal) * 100, 100) : 0;
  document.getElementById("goal-progress-text").textContent = progress.toFixed(0) + "%";
  document.getElementById("progress-fill").style.width = progress + "%";
}
