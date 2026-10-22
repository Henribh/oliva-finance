// ==========================================
// 1. TRATAMENTO DE VALORES NUMÉRICOS
// ==========================================
function parseCurrencyInput(value) {
  if (!value) return 0;
  let cleanValue = value.toString().trim();

  if (cleanValue.includes('.') && cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } else if (cleanValue.includes(',')) {
    cleanValue = cleanValue.replace(',', '.');
  } else if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleanValue = cleanValue.replace(/\./g, '');
    }
  }

  return parseFloat(cleanValue) || 0;
}

function formatCurrency(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==========================================
// 2. ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let state = {
  monthlyIncome: parseCurrencyInput(localStorage.getItem('oliva_income')),
  fixedCosts: parseCurrencyInput(localStorage.getItem('oliva_fixed')),
  transactions: JSON.parse(localStorage.getItem('oliva_transactions')) || [],
  goals: JSON.parse(localStorage.getItem('oliva_goals')) || [],
  theme: localStorage.getItem('oliva_theme') || 'light'
};

// ==========================================
// 3. NAVEGAÇÃO DE TELA SPA & MENU MOBILE
// ==========================================
function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

  document.getElementById(`tab-${tabId}`).classList.add('active');

  if (element) {
    element.classList.add('active');
  } else if (window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('active');
  }

  if (tabId === 'relatorios') renderReports();
}

function toggleMenu() {
  const menu = document.getElementById('nav-tabs');
  menu.classList.toggle('open');
}

function closeMenu() {
  if (window.innerWidth <= 768) {
    const menu = document.getElementById('nav-tabs');
    menu.classList.remove('open');
  }
}

// ==========================================
// 4. INICIALIZAÇÃO E TEMA
// ==========================================
function init() {
  document.documentElement.dataset.theme = state.theme;
  updateThemeButtonText();

  if (state.monthlyIncome > 0) document.getElementById('monthly-income').value = state.monthlyIncome;
  if (state.fixedCosts > 0) document.getElementById('fixed-costs').value = state.fixedCosts;

  renderTransactions();
  updateTotals();
  renderGoals();
}

document.getElementById('theme-btn').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  localStorage.setItem('oliva_theme', state.theme);
  updateThemeButtonText();
});

function updateThemeButtonText() {
  document.getElementById('theme-btn').innerHTML = state.theme === 'dark' 
    ? '<span class="nav-icon">☀️</span> <span class="action-text">Tema</span>' 
    : '<span class="nav-icon">🌙</span> <span class="action-text">Tema</span>';
}

document.getElementById('reset-btn').addEventListener('click', () => {
  if (confirm('Tens a certeza de que desejas apagar TODOS os dados da aplicação?')) {
    localStorage.clear();
    location.reload();
  }
});

// ==========================================
// 5. DASHBOARD & TRANSAÇÕES
// ==========================================
document.getElementById('setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.monthlyIncome = parseCurrencyInput(document.getElementById('monthly-income').value);
  state.fixedCosts = parseCurrencyInput(document.getElementById('fixed-costs').value);

  localStorage.setItem('oliva_income', state.monthlyIncome);
  localStorage.setItem('oliva_fixed', state.fixedCosts);

  updateTotals();
  alert('Planeamento salvo com sucesso! 🌿');
});

document.getElementById('transaction-form').addEventListener('submit', (e) => {
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
  localStorage.setItem('oliva_transactions', JSON.stringify(state.transactions));

  renderTransactions();
  updateTotals();
  document.getElementById('transaction-form').reset();
});

function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  localStorage.setItem('oliva_transactions', JSON.stringify(state.transactions));
  renderTransactions();
  updateTotals();
}

function updateTotals() {
  const extraIncomes = state.transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const variableExpenses = state.transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = state.monthlyIncome + extraIncomes;
  const totalExpenses = state.fixedCosts + variableExpenses;
  const balance = totalIncome - totalExpenses;

  document.getElementById('incomes-val').textContent = formatCurrency(totalIncome);
  document.getElementById('expenses-val').textContent = formatCurrency(totalExpenses);
  
  const balanceVal = document.getElementById('balance-val');
  balanceVal.textContent = formatCurrency(balance);
  balanceVal.className = `value ${balance >= 0 ? 'up' : 'down'}`;

  const availableSavings = Math.max(0, balance);
  document.getElementById('savings-val').textContent = formatCurrency(availableSavings);

  const percent = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
  document.getElementById('savings-percent').textContent = `${percent}% da Renda Livre`;
}

function renderTransactions() {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';

  if (state.transactions.length === 0) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--muted);">Nenhuma transação lançada ainda.</td></tr>`;
    return;
  }

  state.transactions.forEach((t) => {
    const tr = document.createElement('tr');
    const isIncome = t.type === 'income';

    tr.innerHTML = `
      <td>${t.date ? t.date.split('-').reverse().join('/') : ''}</td>
      <td>${t.description}</td>
      <td><span class="tag">${t.category}</span></td>
      <td class="${isIncome ? 'val-pos' : 'val-neg'}">${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}</td>
      <td><button class="btn-delete" onclick="deleteTransaction(${t.id})">✕</button></td>
    `;
    list.appendChild(tr);
  });
}

// Simulador de Compra
document.getElementById('sim-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('sim-title').value;
  const price = parseCurrencyInput(document.getElementById('sim-price').value);
  const installments = parseInt(document.getElementById('sim-installments').value) || 1;

  const installmentValue = price / installments;
  const totalIncome = state.monthlyIncome;

  if (totalIncome <= 0) {
    document.getElementById('sim-results').innerHTML = `<p style="color: var(--red);">Preenche a tua Renda Mensal no Planeamento Base antes de simular!</p>`;
    return;
  }

  const commitmentPercent = ((installmentValue / totalIncome) * 100).toFixed(1);
  let riskColor = commitmentPercent > 30 ? 'var(--red)' : commitmentPercent > 15 ? '#f59e0b' : 'var(--green)';

  document.getElementById('sim-results').innerHTML = `
    <h3>Resultado para: <strong>${title}</strong></h3>
    <p>• Parcela (${installments}x): <strong>${formatCurrency(installmentValue)} / mês</strong></p>
    <p>• Comprometimento: <strong style="color: ${riskColor};">${commitmentPercent}% ao mês</strong></p>
  `;
});

// ==========================================
// 6. METAS & COFRES (DEPÓSITO DIRECTO/INLINE)
// ==========================================
document.getElementById('goal-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const newGoal = {
    id: Date.now(),
    title: document.getElementById('goal-title').value,
    target: parseCurrencyInput(document.getElementById('goal-target').value),
    saved: 0
  };

  state.goals.push(newGoal);
  localStorage.setItem('oliva_goals', JSON.stringify(state.goals));
  renderGoals();
  document.getElementById('goal-form').reset();
});

function handleGoalDeposit(e, id) {
  e.preventDefault();
  const input = document.getElementById(`deposit-input-${id}`);
  const amount = parseCurrencyInput(input.value);

  if (amount > 0) {
    const goal = state.goals.find(g => g.id === id);
    if (goal) {
      goal.saved += amount;
      localStorage.setItem('oliva_goals', JSON.stringify(state.goals));
      renderGoals();
    }
  }
}

function deleteGoal(id) {
  state.goals = state.goals.filter(g => g.id !== id);
  localStorage.setItem('oliva_goals', JSON.stringify(state.goals));
  renderGoals();
}

function renderGoals() {
  const container = document.getElementById('goals-container');
  container.innerHTML = '';

  if (state.goals.length === 0) {
    container.innerHTML = `<p style="color: var(--muted); grid-column: 1/-1; text-align: center;">Nenhuma meta criada ainda. Cria o teu primeiro objetivo acima!</p>`;
    return;
  }

  state.goals.forEach(g => {
    const percent = Math.min(100, ((g.saved / g.target) * 100)).toFixed(1);
    const div = document.createElement('div');
    div.className = 'goal-card';
    div.innerHTML = `
      <div class="goal-header">
        <strong>${g.title}</strong>
        <button class="btn-delete" onclick="deleteGoal(${g.id})">✕</button>
      </div>
      <div>Acumulado: <strong>${formatCurrency(g.saved)}</strong> / ${formatCurrency(g.target)}</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <div style="font-size: 0.85rem; color: var(--muted);">${percent}% concluído</div>
      
      <form class="goal-deposit-form" onsubmit="handleGoalDeposit(event, ${g.id})">
        <input type="text" id="deposit-input-${g.id}" placeholder="Valor (R$)" required>
        <button type="submit" class="btn btn-secondary">➕ Guardar</button>
      </form>
    `;
    container.appendChild(div);
  });
}

// ==========================================
// 7. RELATÓRIOS & JUROS COMPOSTOS
// ==========================================
function renderReports() {
  const container = document.getElementById('category-report');
  container.innerHTML = '';

  const expenses = state.transactions.filter(t => t.type === 'expense');
  if (expenses.length === 0) {
    container.innerHTML = `<p style="color: var(--muted); text-align: center;">Nenhuma despesa lançada para gerar o relatório.</p>`;
    return;
  }

  const totals = {};
  expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

  Object.keys(totals).forEach(cat => {
    const div = document.createElement('div');
    div.className = 'report-item';
    div.innerHTML = `<span>${cat}</span><strong>${formatCurrency(totals[cat])}</strong>`;
    container.appendChild(div);
  });
}

document.getElementById('compound-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const initial = parseCurrencyInput(document.getElementById('comp-initial').value);
  const monthly = parseCurrencyInput(document.getElementById('comp-monthly').value);
  const years = parseInt(document.getElementById('comp-years').value) || 1;

  const months = years * 12;
  const rate = 0.10 / 12;

  let total = initial;
  for (let i = 0; i < months; i++) {
    total = (total + monthly) * (1 + rate);
  }

  document.getElementById('compound-results').innerHTML = `
    <h3>Projeção para ${years} ano(s):</h3>
    <p>• Total Estimado: <strong style="color: var(--green); font-size: 1.2rem;">${formatCurrency(total)}</strong></p>
    <p style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">*Considerando taxa média anual estimada de 10% a.a.</p>
  `;
});

// Exportação CSV
document.getElementById('export-csv-btn').addEventListener('click', () => {
  if (state.transactions.length === 0) {
    alert('Não há dados no extrato para exportar.');
    return;
  }

  let csvContent = "data:text/csv;charset=utf-8,Data,Descricao,Categoria,Tipo,Valor\n";
  state.transactions.forEach(t => {
    csvContent += `${t.date},"${t.description}",${t.category},${t.type},${t.amount}\n`;
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "extrato_oliva_finance.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// Inicialização
init();