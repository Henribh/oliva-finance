function parseCurrencyInput(value) {
  if (!value) return 0;
  let cleanValue = value.toString().trim();
  if (cleanValue.includes('.') && cleanValue.includes(',')) cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  else if (cleanValue.includes(',')) cleanValue = cleanValue.replace(',', '.');
  else if (cleanValue.includes('.')) {
    const parts = cleanValue.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) cleanValue = cleanValue.replace(/\./g, '');
  }
  return parseFloat(cleanValue) || 0;
}

function formatCurrency(val) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

let state = {
  monthlyIncome: parseCurrencyInput(localStorage.getItem('oliva_income')),
  fixedCosts: parseCurrencyInput(localStorage.getItem('oliva_fixed')),
  transactions: JSON.parse(localStorage.getItem('oliva_transactions')) || [],
  goals: JSON.parse(localStorage.getItem('oliva_goals')) || [],
  theme: localStorage.getItem('oliva_theme') || 'dark',
  privacy: false 
};

let expenseChartInstance = null; 

async function fetchExchangeRates() {
  try {
    const response = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL');
    const data = await response.json();
    
    document.getElementById('ticker-usd').textContent = `USD: R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`;
    document.getElementById('ticker-eur').textContent = `EUR: R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`;
    
    const btcValue = parseFloat(data.BTCBRL.bid).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    document.getElementById('ticker-btc').textContent = `BTC: R$ ${btcValue}`;
  } catch (error) {
    document.getElementById('ticker-usd').textContent = "API offline";
    document.getElementById('ticker-eur').textContent = "";
    document.getElementById('ticker-btc').textContent = "";
  }
}

document.getElementById('privacy-btn').addEventListener('click', () => {
  state.privacy = !state.privacy;
  const icon = document.getElementById('privacy-icon');
  
  if (state.privacy) {
    document.body.classList.add('privacy-active');
    icon.innerHTML = '<span style="opacity: 0.4; text-decoration: line-through;">👁️</span>';
  } else {
    document.body.classList.remove('privacy-active');
    icon.innerHTML = '👁️';
  }
});

function switchTab(tabId, element) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.nav-tabs .nav-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');

  if (element) {
      element.classList.add('active');
  } else if (window.event && window.event.currentTarget && window.event.currentTarget.classList.contains('nav-btn')) {
      window.event.currentTarget.classList.add('active');
  }

  if (tabId === 'relatorios') renderReportsChart(); 
}

function toggleMenu() {
  const menu = document.getElementById('nav-tabs');
  const overlay = document.getElementById('mobile-overlay');
  menu.classList.toggle('open');
  if (menu.classList.contains('open')) overlay.classList.add('active');
  else overlay.classList.remove('active');
}

function closeMenu() {
  if (window.innerWidth <= 768) {
    document.getElementById('nav-tabs').classList.remove('open');
    document.getElementById('mobile-overlay').classList.remove('active');
  }
}

function goToDashboard() {
    switchTab('dashboard');
    document.querySelectorAll('.nav-tabs .nav-btn').forEach(btn => btn.classList.remove('active'));
    const firstBtn = document.querySelector('.nav-tabs .nav-btn');
    if (firstBtn) firstBtn.classList.add('active');
    closeMenu();
}

function applyTheme(themeName) {
  if (themeName === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = themeName === 'dark' ? '☀️' : '🌙';

  if (expenseChartInstance && document.getElementById('tab-relatorios').classList.contains('active')) {
      renderReportsChart();
  }
}

function init() {
  applyTheme(state.theme);
  fetchExchangeRates(); 
  
  if (state.monthlyIncome > 0) document.getElementById('monthly-income').value = state.monthlyIncome;
  if (state.fixedCosts > 0) document.getElementById('fixed-costs').value = state.fixedCosts;

  renderTransactions();
  updateTotals();
  renderGoals();
}

document.getElementById('theme-btn').addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(state.theme);
  localStorage.setItem('oliva_theme', state.theme);
});

window.addEventListener('storage', (e) => {
  if (e.key === 'oliva_theme') {
    state.theme = e.newValue;
    applyTheme(state.theme);
  }
});

document.querySelectorAll('.reset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (confirm('Tem certeza de que deseja apagar TODOS os dados e histórico?')) {
            localStorage.clear();
            location.reload();
        }
    });
});

document.getElementById('setup-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.monthlyIncome = parseCurrencyInput(document.getElementById('monthly-income').value);
  state.fixedCosts = parseCurrencyInput(document.getElementById('fixed-costs').value);
  localStorage.setItem('oliva_income', state.monthlyIncome);
  localStorage.setItem('oliva_fixed', state.fixedCosts);
  updateTotals();
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
  balanceVal.className = `value sensitive ${balance >= 0 ? 'up' : 'down'}`;

  const availableSavings = Math.max(0, balance);
  document.getElementById('savings-val').textContent = formatCurrency(availableSavings);

  const percent = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : 0;
  document.getElementById('savings-percent').textContent = `${percent}% da Renda`;
}

function renderTransactions() {
  const list = document.getElementById('transaction-list');
  list.innerHTML = '';

  if (state.transactions.length === 0) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--muted);">Nenhuma transação lançada.</td></tr>`;
    return;
  }

  state.transactions.forEach((t) => {
    const tr = document.createElement('tr');
    const isIncome = t.type === 'income';
    tr.innerHTML = `
      <td>${t.date ? t.date.split('-').reverse().join('/') : ''}</td>
      <td>${t.description}</td>
      <td><span class="tag">${t.category}</span></td>
      <td class="sensitive ${isIncome ? 'val-pos' : 'val-neg'}">${isIncome ? '+' : '-'} ${formatCurrency(t.amount)}</td>
      <td><button class="btn-delete" onclick="deleteTransaction(${t.id})">✕</button></td>
    `;
    list.appendChild(tr);
  });
}

document.getElementById('sim-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('sim-title').value;
  const price = parseCurrencyInput(document.getElementById('sim-price').value);
  const installments = parseInt(document.getElementById('sim-installments').value) || 1;
  const installmentValue = price / installments;
  const totalIncome = state.monthlyIncome;

  if (totalIncome <= 0) {
    document.getElementById('sim-results').innerHTML = `<p style="color: var(--red); font-weight: bold;">Preencha a sua Renda Mensal no topo da página antes de simular!</p>`;
    return;
  }

  const commitmentPercent = ((installmentValue / totalIncome) * 100).toFixed(1);
  let riskColor = commitmentPercent > 30 ? 'var(--red)' : commitmentPercent > 15 ? '#f59e0b' : 'var(--green)';

  document.getElementById('sim-results').innerHTML = `
    <h3 style="margin-bottom: 8px; font-size: 1rem;">Resultado: <strong>${title}</strong></h3>
    <p style="margin-bottom: 4px;">• Parcela (${installments}x): <strong style="font-size: 1.1rem;">${formatCurrency(installmentValue)} / mês</strong></p>
    <p>• Comprometimento da Renda: <strong style="color: ${riskColor}; font-size: 1.1rem;">${commitmentPercent}%</strong></p>
  `;
});

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
  if (state.goals.length === 0) return;

  state.goals.forEach(g => {
    const percentRaw = (g.saved / g.target) * 100;
    const percent = Math.min(100, percentRaw).toFixed(1);
    
    let badgeHTML = '';
    if (percentRaw >= 100) badgeHTML = `<span class="badge-gamification badge-gold">🏆 Concluído!</span>`;
    else if (percentRaw >= 50) badgeHTML = `<span class="badge-gamification badge-silver">🔥 Metade</span>`;
    else if (percentRaw > 0) badgeHTML = `<span class="badge-gamification badge-bronze">🌱 Iniciante</span>`;

    const div = document.createElement('div');
    div.className = 'goal-card';
    div.innerHTML = `
      <div class="goal-header">
        <strong style="display:flex; align-items:center; gap:8px;">${g.title} ${badgeHTML}</strong>
        <button class="btn-delete" onclick="deleteGoal(${g.id})">✕</button>
      </div>
      <div class="sensitive">Acumulado: <strong>${formatCurrency(g.saved)}</strong> / ${formatCurrency(g.target)}</div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${percent}%;"></div>
      </div>
      <div style="font-size: 0.85rem; color: var(--muted);">${percent}% concluído</div>
      <form class="goal-deposit-form" onsubmit="handleGoalDeposit(event, ${g.id})">
        <input type="text" id="deposit-input-${g.id}" placeholder="Guardar (R$)" required>
        <button type="submit" class="btn btn-secondary">➕</button>
      </form>
    `;
    container.appendChild(div);
  });
}

function renderReportsChart() {
  const expenses = state.transactions.filter(t => t.type === 'expense');
  const totals = {};
  
  if (state.fixedCosts > 0) totals['Moradia/Fixos'] = state.fixedCosts;
  expenses.forEach(t => totals[t.category] = (totals[t.category] || 0) + t.amount);

  const labels = Object.keys(totals);
  const data = Object.values(totals);

  if (labels.length === 0) {
    document.getElementById('expenseChart').style.display = 'none';
    return;
  }
  
  document.getElementById('expenseChart').style.display = 'block';
  const textColor = getComputedStyle(document.body).getPropertyValue('--text').trim();
  const ctx = document.getElementById('expenseChart').getContext('2d');
  
  if (expenseChartInstance) expenseChartInstance.destroy();

  expenseChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
          labels: labels,
          datasets: [{
              data: data,
              backgroundColor: ['#10B981', '#1E3A8A', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'],
              borderWidth: 0,
              hoverOffset: 10
          }]
      },
      options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
              legend: { position: 'right', labels: { color: textColor, font: { family: 'Segoe UI', size: 13 } } },
              tooltip: { callbacks: { label: function(context) { return ' ' + formatCurrency(context.raw); } } }
          }
      }
  });
}

document.getElementById('compound-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const initial = parseCurrencyInput(document.getElementById('comp-initial').value);
  const monthly = parseCurrencyInput(document.getElementById('comp-monthly').value);
  const years = parseInt(document.getElementById('comp-years').value) || 1;
  const rate = 0.10 / 12;

  let total = initial;
  for (let i = 0; i < years * 12; i++) total = (total + monthly) * (1 + rate);

  document.getElementById('compound-results').innerHTML = `
    <h3>Projeção (${years} anos): <strong style="color: var(--green);">${formatCurrency(total)}</strong></h3>
    <p style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">*Taxa média 10% a.a.</p>
  `;
});

document.getElementById('export-csv-btn').addEventListener('click', () => {
  if (state.transactions.length === 0) {
    alert('Não há dados no extrato para exportar.');
    return;
  }
  
  let csvContent = "\uFEFFData;Descrição;Categoria;Tipo;Valor\n";
  
  state.transactions.forEach(t => { 
      // Formata a data para DD/MM/AAAA
      const dataFormatada = t.date ? t.date.split('-').reverse().join('/') : '';
      
      // Traduz o tipo para português
      const tipoTraduzido = t.type === 'income' ? 'Receita' : 'Despesa';
      
      // Formata o valor com vírgula nos centavos
      const valorFormatado = t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      // Monta a linha separada por ponto e vírgula (padrão PT-BR do Excel)
      csvContent += `${dataFormatada};"${t.description}";${t.category};${tipoTraduzido};${valorFormatado}\n`; 
  });
  
  // Usando Blob (mais seguro e suporta arquivos maiores que o encodeURI)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "extrato_oliva_finance.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

init();