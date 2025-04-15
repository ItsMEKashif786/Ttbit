const incomeForm = document.getElementById("income-form");
const expenseForm = document.getElementById("expense-form");
const upiForm = document.getElementById("upi-form");

const incomeList = document.getElementById("income-list");
const expenseList = document.getElementById("expense-list");

let myUpiId = "";

upiForm.addEventListener("submit", function (e) {
  e.preventDefault();
  myUpiId = document.getElementById("upi-id").value.trim();
  alert("Your UPI ID is saved successfully!");
});

incomeForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("income-name").value.trim();
  const amount = parseFloat(document.getElementById("income-amount").value);
  const mode = document.getElementById("income-mode").value;

  if (name && amount && mode) {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${name}</strong> (${mode})
      <span class="amount">+₹${amount}</span>
    `;
    incomeList.appendChild(li);
    incomeForm.reset();
  }
});

expenseForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const name = document.getElementById("expense-name").value.trim();
  const amount = parseFloat(document.getElementById("expense-amount").value);
  const mode = document.getElementById("expense-mode").value;

  if (name && amount && mode) {
    const li = document.createElement("li");

    let linkBtn = "";
    if (myUpiId) {
      const upiLink = `upi://pay?pa=${myUpiId}&pn=MKPayTrack&am=${amount}&cu=INR`;
      linkBtn = `<a href="${upiLink}" class="link-btn" target="_blank">Pay Me</a>`;
    }

    li.innerHTML = `
      <strong>${name}</strong> (${mode})
      <span class="amount">-₹${amount}</span>
      ${linkBtn}
    `;
    expenseList.appendChild(li);
    expenseForm.reset();
  }
});
