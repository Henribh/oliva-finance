// ==========================================
// TRATAMENTO DE VALORES NUMÉRICOS
// ==========================================
function parseCurrencyInput(value) {
  if (!value) return 0;
  
  let cleanValue = value.toString().trim();

  if (cleanValue.includes('.') && cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } 
  else if (cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(',', '.');
  } 
  else if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleanValue = cleanValue.replace(/\./g, '');
    }
  }

  return parseFloat(cleanValue) || 0;
}

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let state = {
  monthlyIncome: parseCurrencyInput(localStorage.getItem('oliva_income')),
  fixedCosts: parseCurrencyInput(localStorage.getItem('oliva_fixed')),
  transactions: JSON.parse(localStorage.getItem('oliva_transactions')) || [],
  theme: localStorage.getItem('oliva_theme') || 'light'
};

// ==========================================
// SELEÇÃO DE ELEMENTOS DO DOM
// ==========================================
const themeBtn = document.getElementById('theme-btn');
const openSimBtn = document.getElementById('open-sim-btn');
const simulatorSection = document.getElementById('simulator-section');

const setupForm = document.getElementById('setup-form');
const resetBtn = document.getElementById('reset-btn');
const incomeInput = document.getElementById('monthly-income');
const fixedInput = document.getElementById('fixed-costs');

const simForm = document.getElementById('sim-form');
const simResults = document.getElementById('sim-results');

const transactionForm = document.getElementById('transaction-form');
const transactionList = document.getElementById('transaction-list');

const balanceVal = document.getElementById('balance-val');
const incomesVal = document.getElementById('incomes-val');
const expensesVal = document.getElementById('expenses-val');
const savingsVal = document.getElementById('savings-val');
const savingsPercent = document.getElementById('savings-percent');

// ==========================================
// INICIALIZAÇÃO E TEMA
// ==========================================
function init() {
  document.documentElement.dataset.theme = state.theme;
  updateThemeButtonText();

  if (state.monthlyIncome > 0) incomeInput.value = state.monthlyIncome;
  if (state.fixedCosts > 0) fixedInput.value = state.fixedCosts;

  renderTransactions();
  updateTotals();
}

themeBtn.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('oliva_theme', state.theme);
  updateThemeButtonText();
});

function updateThemeButtonText() {
  themeBtn.textContent = state.theme === 'dark' ? '☀️ Tema' : '🌙 Tema';
}

if (openSimBtn && simulatorSection) {
  openSimBtn.addEventListener('click', () => {
    simulatorSection.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('sim-title').focus();
  });
}

// ==========================================
// PLANEJAMENTO BASE E RESET DE DADOS
// ==========================================
setupForm.addEventListener('submit', (e) => {
  e.preventDefault();

  state.monthlyIncome = parseCurrencyInput(incomeInput.value);
  state.fixedCosts = parseCurrencyInput(fixedInput.value);

  localStorage.setItem('oliva_income', state.monthlyIncome);
  localStorage.setItem('oliva_fixed', state.fixedCosts);

  updateTotals();
  alert('Planejamento inicial salvo com sucesso! 🌿');
});

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    const confirmReset = confirm('Tem certeza que deseja apagar todos os dados e histórico da aplicação? Esta ação não pode ser desfeita.');

    if (confirmReset) {
      localStorage.removeItem('oliva_income');
      localStorage.removeItem('oliva_fixed');
      localStorage.removeItem('oliva_transactions');

      state.monthlyIncome = 0;
      state.fixedCosts = 0;
      state.transactions = [];

      incomeInput.value = '';
      fixedInput.value = '';
      simResults.innerHTML = `<p class="sim-placeholder">Preencha os valores ao lado para simular o comprometimento do seu salário.</p>`;

      renderTransactions();
      updateTotals();

      alert('Todos os dados foram apagados com sucesso!');
    }
  });
}

// ==========================================
// GERENCIAMENTO DE TRANSAÇÕES
// ==========================================
transactionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const newTransaction = {
    id: Date.now(),
    description: document.getElementById('desc').value,
    amount: parseCurrencyInput(document.getElementById('amount').value),
    type: document.getElementById('type').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value
  };

  state.transactions.unshift(newTransaction);
  saveTransactions();
  renderTransactions();
  updateTotals();

  transactionForm.reset();
});

function saveTransactions() {
  localStorage.setItem('oliva_transactions', JSON.stringify(state.transactions));
}

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveTransactions();
  renderTransactions();
  updateTotals();
}

// ==========================================
// CÁLCULOS DOS PAINÉIS
// ==========================================
function updateTotals() {
  const extraIncomes = state.transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const variableExpenses = state.transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = state.monthlyIncome + extraIncomes;
  const totalExpenses = state.fixedCosts + variableExpenses;
  const balance = totalIncome - totalExpenses;

  incomesVal.textContent = formatCurrency(totalIncome);
  expensesVal.textContent = formatCurrency(totalExpenses);
  balanceVal.textContent = formatCurrency(balance);

  const availableSavings = Math.max(0, balance);
  savingsVal.textContent = formatCurrency(availableSavings);

  const percent = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
  savingsPercent.textContent = `${percent}% da Renda Livre`;

  balanceVal.className = `value ${balance >= 0 ? 'up' : 'down'}`;
}

function formatCurrency(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

function renderTransactions() {
  transactionList.innerHTML = '';

  if (state.transactions.length === 0) {
    transactionList.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--muted);">Nenhuma transação lançada ainda.</td></tr>`;
    return;
  }

  state.transactions.forEach((t) => {
    const tr = document.createElement('tr');
    const isIncome = t.type === 'income';

    tr.innerHTML = `
      <td>${formatDate(t.date)}</td>
      <td>${t.description}</td>
      <td><span class="tag">${t.category}</span></td>
      <td class="${isIncome ? 'val-pos' : 'val-neg'}">
        ${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}
      </td>
      <td>
        <button class="btn-delete" onclick="deleteTransaction(${t.id})">✕</button>
      </td>
    `;

    transactionList.appendChild(tr);
  });
}

// ==========================================
// SIMULADOR DE IMPACTO FINANCEIRO
// ==========================================
simForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('sim-title').value;
  const price = parseCurrencyInput(document.getElementById('sim-price').value);
  const installments = parseInt(document.getElementById('sim-installments').value) || 1;

  const installmentValue = price / installments;
  const totalIncome = state.monthlyIncome;

  if (totalIncome <= 0) {
    simResults.innerHTML = `<p style="color: var(--red);">Preencha sua Renda Mensal no 'Planejamento Base' antes de simular!</p>`;
    return;
  }

  const commitmentPercent = ((installmentValue / totalIncome) * 100).toFixed(1);

  let riskColor = 'var(--green)';
  let riskText = '🟢 Baixo impacto no orçamento';

  if (commitmentPercent > 30) {
    riskColor = 'var(--red)';
    riskText = '🔴 Alto risco de comprometimento!';
  } else if (commitmentPercent > 15) {
    riskColor = '#f59e0b';
    riskText = '🟡 Atenção ao orçamento!';
  }

  simResults.innerHTML = `
    <h3 style="font-size: 1rem; margin-bottom: 8px;">Resultado para: <strong>${title}</strong></h3>
    <p>• Valor total: <strong>${formatCurrency(price)}</strong></p>
    <p>• Parcela (${installments}x): <strong>${formatCurrency(installmentValue)} / mês</strong></p>
    <p>• Comprometimento da Renda: <strong style="color: ${riskColor};">${commitmentPercent}% ao mês</strong></p>
    <p style="margin-top: 8px; font-size: 0.85rem; color: ${riskColor}; font-weight: 600;">Status: ${riskText}</p>
  `;
});

// Inicialização
init();