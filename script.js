document.addEventListener("DOMContentLoaded", () => {
    const pageId = document.body.id;

    if (pageId === "login") {
        document.getElementById("login-form").addEventListener("submit", handleLogin);
    } else {
        checkLoginStatus();
        document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
    }

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

/* ---------- Login System ---------- */
function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (username === "admin" && password === "1234") {
        localStorage.setItem("mkUser", username);
        window.location.href = "index.html";
    } else {
        document.getElementById("login-error").style.display = "block";
    }
}

function checkLoginStatus() {
    const user = localStorage.getItem("mkUser");
    if (!user) window.location.href = "login.html";
}

/* ---------- Theme Toggle ---------- */
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("mkTheme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

/* ---------- Dashboard ---------- */
function runDashboard() {
    updateDashboardCounters();
    renderDashboardChart();
}

function updateDashboardCounters() {
    const transactions = JSON.parse(localStorage.getItem("mkTransactions")) || [];
    let totalGiven = 0, totalReceived = 0, pendingGave = 0, pendingReceived = 0;

    transactions.forEach(tx => {
        if (tx.type === "gave") {
            totalGiven += tx.amount;
            if (tx.status === "pending") pendingGave += tx.amount;
        } else {
            totalReceived += tx.amount;
            if (tx.status === "pending") pendingReceived += tx.amount;
        }
    });

    document.getElementById("counter-given").textContent = `Total Given: $${totalGiven.toFixed(2)}`;
    document.getElementById("counter-received").textContent = `Total Received: $${totalReceived.toFixed(2)}`;
    document.getElementById("counter-pending").textContent = `Net Pending: $${(pendingGave - pendingReceived).toFixed(2)}`;
}

function renderDashboardChart() {
    const transactions = JSON.parse(localStorage.getItem("mkTransactions")) || [];
    let totalGiven = 0, totalReceived = 0;

    transactions.forEach(tx => {
        if (tx.type === "gave") totalGiven += tx.amount;
        else if (tx.type === "received") totalReceived += tx.amount;
    });

    const ctx = document.getElementById("dashboardChart").getContext("2d");
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ["Given", "Received"],
            datasets: [{
                data: [totalGiven, totalReceived],
                backgroundColor: ["#dc3545", "#28a745"]
            }]
        },
        options: { responsive: true, animation: { animateScale: true } }
    });
}

/* ---------- Transactions ---------- */
function runTransactions() {
    document.getElementById("submit-transaction").addEventListener("click", handleTransaction);
    renderTransactions();
}

function handleTransaction() {
    let transactions = JSON.parse(localStorage.getItem("mkTransactions")) || [];
    const purpose = document.getElementById("transaction-purpose").value.trim();
    const amount = parseFloat(document.getElementById("transaction-amount").value);
    const type = document.getElementById("transaction-type").value;
    const mode = document.getElementById("transaction-mode").value;
    const date = document.getElementById("transaction-date").value;

    if (!purpose || isNaN(amount) || !date) {
        alert("Enter valid details!");
        return;
    }

    transactions.push({ id: Date.now(), purpose, amount, type, mode, date, status: "pending" });
    localStorage.setItem("mkTransactions", JSON.stringify(transactions));
    renderTransactions();
}

function renderTransactions() {
    let transactions = JSON.parse(localStorage.getItem("mkTransactions")) || [];
    const listDiv = document.getElementById("transaction-list");
    listDiv.innerHTML = "";

    transactions.forEach(tx => {
        const txDiv = document.createElement("div");
        txDiv.className = "transaction-item";
        txDiv.innerHTML = `
            <p><strong>${tx.purpose}</strong> - $${tx.amount.toFixed(2)}</p>
            <small>${tx.date} - ${tx.type} via ${tx.mode}</small>
            ${tx.mode === "upi" && tx.type === "received" && tx.status === "pending" ? `
            <button onclick="generatePaymentLink('${tx.amount}')">Share Payment Link</button>
            ` : ""}
        `;
        listDiv.appendChild(txDiv);
    });
}

function generatePaymentLink(amount) {
    const upiData = JSON.parse(localStorage.getItem("mkUPI"));
    if (!upiData || !upiData.upiId) {
        alert("Save your UPI ID first!");
        return;
    }

    const upiLink = `upi://pay?pa=${upiData.upiId}&pn=${upiData.name}&am=${amount}`;
    window.location.href = upiLink;
}

/* ---------- UPI Manager ---------- */
function runUPIManager() {
    document.getElementById("save-upi").addEventListener("click", saveUPI);
    renderUPIDisplay();
}

function saveUPI() {
    const upiId = document.getElementById("upi-id").value.trim();
    const name = document.getElementById("upi-name").value.trim();

    if (!upiId || !name) {
        alert("Enter valid UPI details!");
        return;
    }

    localStorage.setItem("mkUPI", JSON.stringify({ upiId, name }));
    renderUPIDisplay();
}

function renderUPIDisplay() {
    const upiData = JSON.parse(localStorage.getItem("mkUPI"));
    document.getElementById("upi-display").innerHTML = upiData
        ? `<p>Your UPI ID: ${upiData.upiId} (${upiData.name})</p>`
        : "<p>No UPI details saved.</p>";
}

/* ---------- Recovery Goals ---------- */
function runRecoveryGoals() {
    document.getElementById("set-goal").addEventListener("click", setMonthlyGoal);
    updateGoalProgress();
}

function setMonthlyGoal() {
    const goalValue = parseFloat(document.getElementById("goal-amount").value);
    if (isNaN(goalValue) || goalValue <= 0) {
        alert("Enter a valid goal amount!");
        return;
    }

    localStorage.setItem("mkMonthlyGoal", goalValue);
    updateGoalProgress();
}

function updateGoalProgress() {
    const goal = parseFloat(localStorage.getItem("mkMonthlyGoal")) || 0;
    const transactions = JSON.parse(localStorage.getItem("mkTransactions")) || [];
    const currentMonth = new Date().toISOString().substring(0, 7);
    let clearedSum = transactions.reduce((sum, tx) => tx.type === "received" && tx.status === "cleared" && tx.date.startsWith(currentMonth) ? sum + tx.amount : sum, 0);
    
    let progress = goal ? Math.min((clearedSum / goal) * 100, 100) : 0;
    document.getElementById("goal-progress-text").textContent = `${progress.toFixed(0)}%`;
    document.getElementById("progress-fill").style.width = `${progress}%`;
      }
      
