// Data structure
let budgetData = {
    paychecks: {
        '1st': 0,
        '15th': 0
    },
    recurringPayments: [],
    oneTimePayments: [],
    notes: [],
    lastPayPeriod: null // Track last pay period to detect new period
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updatePayPeriodDates();
    checkNewPayPeriod();
    renderAll();
    setupEventListeners();
});

// Load data from localStorage
function loadData() {
    const saved = localStorage.getItem('budgetData');
    if (saved) {
        budgetData = JSON.parse(saved);
        // Initialize notes array if it doesn't exist (for backward compatibility)
        if (!budgetData.notes) {
            budgetData.notes = [];
        }
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('budgetData', JSON.stringify(budgetData));
}

// Get current pay period (1st or 15th)
function getCurrentPayPeriod() {
    const today = new Date();
    const day = today.getDate();
    
    if (day >= 1 && day < 15) {
        return '1st';
    } else {
        return '15th';
    }
}

// Update pay period dates display
function updatePayPeriodDates() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // 1st paycheck date
    const firstDate = new Date(year, month, 1);
    document.getElementById('date-1st').textContent = formatDate(firstDate);
    
    // 15th paycheck date
    const fifteenthDate = new Date(year, month, 15);
    document.getElementById('date-15th').textContent = formatDate(fifteenthDate);
}

// Format date for display
function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Check if we're in a new pay period and auto-deduct recurring payments
function checkNewPayPeriod() {
    const currentPeriod = getCurrentPayPeriod();
    const lastPeriod = budgetData.lastPayPeriod;
    
    // If this is a new pay period, auto-deduct recurring payments
    if (lastPeriod !== currentPeriod) {
        budgetData.lastPayPeriod = currentPeriod;
        saveData();
        // Recurring payments are calculated on-the-fly, so no action needed here
    }
}

// Calculate totals for a paycheck
function calculatePaycheckTotals(paycheckType) {
    let income = budgetData.paychecks[paycheckType] || 0;
    let recurring = 0;
    let oneTime = 0;
    
    // Calculate recurring payments
    budgetData.recurringPayments.forEach(payment => {
        if (payment.paycheck === paycheckType || payment.paycheck === 'both') {
            recurring += payment.amount;
        }
    });
    
    // Calculate one-time payments for current pay period
    const currentPeriod = getCurrentPayPeriod();
    budgetData.oneTimePayments.forEach(payment => {
        if (payment.paycheck === paycheckType && payment.period === currentPeriod) {
            oneTime += payment.amount;
        }
    });
    
    const available = income - recurring - oneTime;
    
    return {
        income,
        recurring,
        oneTime,
        available: Math.max(0, available) // Don't show negative
    };
}

// Render paycheck cards
function renderPaychecks() {
    const totals1st = calculatePaycheckTotals('1st');
    const totals15th = calculatePaycheckTotals('15th');
    
    // 1st paycheck
    document.getElementById('income-1st').textContent = formatCurrency(totals1st.income);
    document.getElementById('recurring-1st').textContent = formatCurrency(-totals1st.recurring);
    document.getElementById('onetime-1st').textContent = formatCurrency(-totals1st.oneTime);
    document.getElementById('available-1st').textContent = formatCurrency(totals1st.available);
    
    // 15th paycheck
    document.getElementById('income-15th').textContent = formatCurrency(totals15th.income);
    document.getElementById('recurring-15th').textContent = formatCurrency(-totals15th.recurring);
    document.getElementById('onetime-15th').textContent = formatCurrency(-totals15th.oneTime);
    document.getElementById('available-15th').textContent = formatCurrency(totals15th.available);
}

// Render recurring payments list
function renderRecurringPayments() {
    const list = document.getElementById('recurring-list');
    list.innerHTML = '';
    
    if (budgetData.recurringPayments.length === 0) {
        list.innerHTML = '<li class="empty-state"><p>No recurring payments added yet</p></li>';
        return;
    }
    
    budgetData.recurringPayments.forEach((payment, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        
        const paycheckText = payment.paycheck === 'both' 
            ? 'Both paychecks' 
            : `${payment.paycheck} paycheck`;
        
        li.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${escapeHtml(payment.name)}</div>
                <div class="list-item-details">${paycheckText}</div>
            </div>
            <div class="list-item-amount">-${formatCurrency(payment.amount)}</div>
            <button class="delete-btn" onclick="deleteRecurringPayment(${index})">Delete</button>
        `;
        
        list.appendChild(li);
    });
}

// Render one-time payments list
function renderOneTimePayments() {
    const list = document.getElementById('onetime-list');
    list.innerHTML = '';
    
    const currentPeriod = getCurrentPayPeriod();
    const currentPayments = budgetData.oneTimePayments.filter(
        p => p.period === currentPeriod
    );
    
    if (currentPayments.length === 0) {
        list.innerHTML = '<li class="empty-state"><p>No one-time payments for this period</p></li>';
        return;
    }
    
    currentPayments.forEach((payment, index) => {
        const li = document.createElement('li');
        li.className = 'list-item';
        
        const globalIndex = budgetData.oneTimePayments.findIndex(
            p => p === payment
        );
        
        li.innerHTML = `
            <div class="list-item-info">
                <div class="list-item-name">${escapeHtml(payment.name)}</div>
                <div class="list-item-details">${payment.paycheck} paycheck</div>
            </div>
            <div class="list-item-amount">-${formatCurrency(payment.amount)}</div>
            <button class="delete-btn" onclick="deleteOneTimePayment(${globalIndex})">Delete</button>
        `;
        
        list.appendChild(li);
    });
}

// Render notes list
function renderNotes() {
    const list = document.getElementById('notes-list');
    list.innerHTML = '';
    
    if (!budgetData.notes || budgetData.notes.length === 0) {
        list.innerHTML = '<li class="empty-state"><p>No notes added yet</p></li>';
        return;
    }
    
    budgetData.notes.forEach((note, index) => {
        const li = document.createElement('li');
        li.className = 'list-item note-item';
        
        li.innerHTML = `
            <div class="list-item-info">
                <div class="note-text">${escapeHtml(note.text)}</div>
                <div class="list-item-details">${formatDate(new Date(note.date))}</div>
            </div>
            <button class="delete-btn" onclick="deleteNote(${index})">Delete</button>
        `;
        
        list.appendChild(li);
    });
}

// Render all components
function renderAll() {
    renderPaychecks();
    renderRecurringPayments();
    renderOneTimePayments();
    renderNotes();
}

// Setup event listeners
function setupEventListeners() {
    // Paycheck form
    document.getElementById('paycheck-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const date = document.getElementById('paycheck-date').value;
        const amount = parseFloat(document.getElementById('paycheck-amount').value);
        
        if (amount > 0) {
            budgetData.paychecks[date] = amount;
            saveData();
            renderAll();
            e.target.reset();
        }
    });
    
    // Recurring payment form
    document.getElementById('recurring-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('recurring-name').value.trim();
        const amount = parseFloat(document.getElementById('recurring-amount').value);
        const paycheck = document.getElementById('recurring-paycheck').value;
        
        if (name && amount > 0) {
            budgetData.recurringPayments.push({
                name,
                amount,
                paycheck
            });
            saveData();
            renderAll();
            e.target.reset();
        }
    });
    
    // One-time payment form
    document.getElementById('onetime-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('onetime-name').value.trim();
        const amount = parseFloat(document.getElementById('onetime-amount').value);
        const paycheck = document.getElementById('onetime-paycheck').value;
        
        if (name && amount > 0) {
            budgetData.oneTimePayments.push({
                name,
                amount,
                paycheck,
                period: getCurrentPayPeriod()
            });
            saveData();
            renderAll();
            e.target.reset();
        }
    });
    
    // Notes form
    document.getElementById('notes-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = document.getElementById('note-text').value.trim();
        
        if (text) {
            if (!budgetData.notes) {
                budgetData.notes = [];
            }
            budgetData.notes.push({
                text,
                date: new Date().toISOString()
            });
            saveData();
            renderAll();
            e.target.reset();
        }
    });
}

// Delete recurring payment
function deleteRecurringPayment(index) {
    if (confirm('Are you sure you want to delete this recurring payment?')) {
        budgetData.recurringPayments.splice(index, 1);
        saveData();
        renderAll();
    }
}

// Delete one-time payment
function deleteOneTimePayment(index) {
    if (confirm('Are you sure you want to delete this payment?')) {
        budgetData.oneTimePayments.splice(index, 1);
        saveData();
        renderAll();
    }
}

// Delete note
function deleteNote(index) {
    if (confirm('Are you sure you want to delete this note?')) {
        budgetData.notes.splice(index, 1);
        saveData();
        renderAll();
    }
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
