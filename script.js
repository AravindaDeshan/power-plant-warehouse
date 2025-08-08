document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // Initialize database
    initDB().then(() => {
        loadDashboardData();
        populateItemDropdowns();
        loadActiveJobs();
        loadInventory();
    });
    
    // Tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons and content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            
            // Load data for the active tab
            switch(tabId) {
                case 'dashboard':
                    loadDashboardData();
                    break;
                case 'inventory':
                    loadInventory();
                    break;
                case 'return':
                    loadActiveJobs();
                    break;
                case 'reports':
                    // Default to current month
                    const currentDate = new Date();
                    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
                    document.getElementById('report-month').value = currentMonth;
                    break;
            }
        });
    });
    
    // Issue Items Form
    const issueForm = document.getElementById('issue-form');
    issueForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const jobId = document.getElementById('job-id').value;
        const personName = document.getElementById('person-name').value;
        const task = document.getElementById('task').value;
        const date = document.getElementById('date').value;
        
        // Collect all items
        const itemRows = document.querySelectorAll('.item-row');
        const items = [];
        
        itemRows.forEach(row => {
            const itemSelect = row.querySelector('.item-select');
            const quantityInput = row.querySelector('.item-quantity');
            
            items.push({
                itemId: itemSelect.value,
                itemName: itemSelect.options[itemSelect.selectedIndex].text,
                quantity: parseInt(quantityInput.value)
            });
        });
        
        // Issue items
        issueItems(jobId, personName, items, task, date)
            .then(() => {
                alert('Items issued successfully!');
                issueForm.reset();
                // Reset to one empty item row
                const itemsContainer = document.querySelector('.items-container');
                itemsContainer.innerHTML = '';
                itemsContainer.appendChild(createItemRow());
                
                // Update dashboard
                loadDashboardData();
                loadActiveJobs();
                loadInventory();
            })
            .catch(error => {
                console.error('Error issuing items:', error);
                alert('Error issuing items: ' + error.message);
            });
    });
    
    // Add another item row
    document.getElementById('add-item-btn').addEventListener('click', function() {
        const itemsContainer = document.querySelector('.items-container');
        itemsContainer.appendChild(createItemRow());
    });
    
    // Search active jobs
    document.getElementById('search-btn').addEventListener('click', function() {
        const searchTerm = document.getElementById('job-search').value.toLowerCase();
        filterActiveJobs(searchTerm);
    });
    
    // Return items modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('return-btn')) {
            const jobId = e.target.getAttribute('data-job-id');
            openReturnModal(jobId);
        }
    });
    
    // Close modal
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal') || e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    // Return form submission
    const returnForm = document.getElementById('return-form');
    returnForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const jobId = document.getElementById('modal-job-id').textContent;
        const returnItems = [];
        
        document.querySelectorAll('#return-items-list .return-item').forEach(item => {
            const itemId = item.getAttribute('data-item-id');
            const returnedQty = parseInt(item.querySelector('.returned-qty').value);
            const originalQty = parseInt(item.querySelector('.original-qty').textContent);
            
            returnItems.push({
                itemId: itemId,
                returnedQty: returnedQty,
                originalQty: originalQty
            });
        });
        
        returnItemsToInventory(jobId, returnItems)
            .then(() => {
                alert('Items returned successfully!');
                closeAllModals();
                loadDashboardData();
                loadActiveJobs();
                loadInventory();
            })
            .catch(error => {
                console.error('Error returning items:', error);
                alert('Error returning items: ' + error.message);
            });
    });
    
    // Inventory refresh
    document.getElementById('refresh-inventory').addEventListener('click', loadInventory);
    
    // Add new item modal
    document.getElementById('add-new-item').addEventListener('click', function() {
        document.getElementById('new-item-modal').style.display = 'block';
    });
    
    // New item form submission
    document.getElementById('new-item-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const itemName = document.getElementById('new-item-name').value;
        const initialStock = parseInt(document.getElementById('new-item-stock').value);
        const unit = document.getElementById('new-item-unit').value;
        
        addNewInventoryItem(itemName, initialStock, unit)
            .then(() => {
                alert('New item added successfully!');
                document.getElementById('new-item-form').reset();
                document.getElementById('new-item-modal').style.display = 'none';
                loadInventory();
                populateItemDropdowns();
            })
            .catch(error => {
                console.error('Error adding new item:', error);
                alert('Error adding new item: ' + error.message);
            });
    });
    
    // Generate report
    document.getElementById('generate-report').addEventListener('click', function() {
        const month = document.getElementById('report-month').value;
        generateMonthlyReport(month);
    });
});

// Helper function to create an item row
function createItemRow() {
    const row = document.createElement('div');
    row.className = 'item-row';
    
    const select = document.createElement('select');
    select.className = 'item-select';
    select.required = true;
    
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Item';
    select.appendChild(defaultOption);
    
    // Populate with items from database
    getAllInventoryItems().then(items => {
        items.forEach(item => {
            const option = document.createElement('option');
            option.value = item.id;
            option.textContent = `${item.name} (${item.currentStock} ${item.unit} available)`;
            select.appendChild(option);
        });
    });
    
    const quantityInput = document.createElement('input');
    quantityInput.type = 'number';
    quantityInput.className = 'item-quantity';
    quantityInput.min = '1';
    quantityInput.placeholder = 'Qty';
    quantityInput.required = true;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'remove-item-btn';
    removeBtn.innerHTML = '<i class="fas fa-times"></i>';
    removeBtn.addEventListener('click', function() {
        row.remove();
    });
    
    row.appendChild(select);
    row.appendChild(quantityInput);
    row.appendChild(removeBtn);
    
    return row;
}

// Populate item dropdowns
function populateItemDropdowns() {
    const dropdowns = document.querySelectorAll('.item-select');
    
    getAllInventoryItems().then(items => {
        dropdowns.forEach(dropdown => {
            // Clear existing options except the first one
            while (dropdown.options.length > 1) {
                dropdown.remove(1);
            }
            
            // Add new options
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = `${item.name} (${item.currentStock} ${item.unit} available)`;
                dropdown.appendChild(option);
            });
        });
    });
}

// Load dashboard data
function loadDashboardData() {
    Promise.all([
        getTotalInventoryItems(),
        getTotalCheckedOutItems(),
        getActiveJobsCount(),
        getRecentActivity()
    ]).then(([totalItems, checkedOut, activeJobs, activity]) => {
        document.getElementById('total-items').textContent = totalItems;
        document.getElementById('checked-out').textContent = checkedOut;
        document.getElementById('active-jobs').textContent = activeJobs;
        
        const activityTable = document.querySelector('#activity-table tbody');
        activityTable.innerHTML = '';
        
        activity.forEach(entry => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(entry.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const jobCell = document.createElement('td');
            jobCell.textContent = entry.jobId;
            row.appendChild(jobCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = entry.personName;
            row.appendChild(personCell);
            
            const actionCell = document.createElement('td');
            actionCell.textContent = entry.action === 'issue' ? 'Issued' : 'Returned';
            actionCell.className = entry.action === 'issue' ? 'text-success' : 'text-info';
            row.appendChild(actionCell);
            
            activityTable.appendChild(row);
        });
    });
}

// Load active jobs
function loadActiveJobs() {
    getActiveJobs().then(jobs => {
        const tableBody = document.querySelector('#active-jobs-table tbody');
        tableBody.innerHTML = '';
        
        jobs.forEach(job => {
            const row = document.createElement('tr');
            
            const jobIdCell = document.createElement('td');
            jobIdCell.textContent = job.jobId;
            row.appendChild(jobIdCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = job.personName;
            row.appendChild(personCell);
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(job.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const itemsCell = document.createElement('td');
            const itemsList = document.createElement('ul');
            job.items.forEach(item => {
                const li = document.createElement('li');
                li.textContent = `${item.quantity} ${item.unit} of ${item.name}`;
                itemsList.appendChild(li);
            });
            itemsCell.appendChild(itemsList);
            row.appendChild(itemsCell);
            
            const actionCell = document.createElement('td');
            const returnBtn = document.createElement('button');
            returnBtn.className = 'btn-secondary return-btn';
            returnBtn.setAttribute('data-job-id', job.jobId);
            returnBtn.textContent = 'Return';
            actionCell.appendChild(returnBtn);
            row.appendChild(actionCell);
            
            tableBody.appendChild(row);
        });
    });
}

// Filter active jobs
function filterActiveJobs(searchTerm) {
    const rows = document.querySelectorAll('#active-jobs-table tbody tr');
    
    rows.forEach(row => {
        const jobId = row.cells[0].textContent.toLowerCase();
        const personName = row.cells[1].textContent.toLowerCase();
        
        if (jobId.includes(searchTerm) || personName.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Open return modal
function openReturnModal(jobId) {
    getJobDetails(jobId).then(job => {
        document.getElementById('modal-job-id').textContent = jobId;
        
        const itemsList = document.getElementById('return-items-list');
        itemsList.innerHTML = '';
        
        job.items.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'return-item';
            itemDiv.setAttribute('data-item-id', item.id);
            
            const itemName = document.createElement('h4');
            itemName.textContent = `${item.name} (${item.unit})`;
            itemDiv.appendChild(itemName);
            
            const originalQtyLabel = document.createElement('p');
            originalQtyLabel.textContent = `Originally issued: `;
            
            const originalQtySpan = document.createElement('span');
            originalQtySpan.className = 'original-qty';
            originalQtySpan.textContent = item.quantity;
            originalQtyLabel.appendChild(originalQtySpan);
            itemDiv.appendChild(originalQtyLabel);
            
            const returnQtyGroup = document.createElement('div');
            returnQtyGroup.className = 'form-group';
            
            const returnQtyLabel = document.createElement('label');
            returnQtyLabel.textContent = 'Quantity to return:';
            returnQtyGroup.appendChild(returnQtyLabel);
            
            const returnQtyInput = document.createElement('input');
            returnQtyInput.type = 'number';
            returnQtyInput.className = 'returned-qty';
            returnQtyInput.min = '0';
            returnQtyInput.max = item.quantity;
            returnQtyInput.value = item.quantity;
            returnQtyInput.required = true;
            returnQtyGroup.appendChild(returnQtyInput);
            
            itemDiv.appendChild(returnQtyGroup);
            itemsList.appendChild(itemDiv);
        });
        
        document.getElementById('return-modal').style.display = 'block';
    });
}

// Close all modals
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// Load inventory
function loadInventory() {
    getAllInventoryItems().then(items => {
        const tableBody = document.querySelector('#inventory-table tbody');
        tableBody.innerHTML = '';
        
        items.forEach(item => {
            const row = document.createElement('tr');
            
            const idCell = document.createElement('td');
            idCell.textContent = item.id;
            row.appendChild(idCell);
            
            const nameCell = document.createElement('td');
            nameCell.textContent = item.name;
            row.appendChild(nameCell);
            
            const stockCell = document.createElement('td');
            stockCell.textContent = item.currentStock;
            row.appendChild(stockCell);
            
            const unitCell = document.createElement('td');
            unitCell.textContent = item.unit;
            row.appendChild(unitCell);
            
            const actionsCell = document.createElement('td');
            // Add action buttons if needed
            row.appendChild(actionsCell);
            
            tableBody.appendChild(row);
        });
    });
}

// Generate monthly report
function generateMonthlyReport(month) {
    getMonthlyReport(month).then(report => {
        // Update summary
        const summaryStats = document.getElementById('summary-stats');
        summaryStats.innerHTML = '';
        
        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'report-summary-stats';
        
        const issuedStat = document.createElement('p');
        issuedStat.innerHTML = `<strong>Total Items Issued:</strong> ${report.summary.totalIssued}`;
        summaryDiv.appendChild(issuedStat);
        
        const returnedStat = document.createElement('p');
        returnedStat.innerHTML = `<strong>Total Items Returned:</strong> ${report.summary.totalReturned}`;
        summaryDiv.appendChild(returnedStat);
        
        const netStat = document.createElement('p');
        netStat.innerHTML = `<strong>Net Change:</strong> ${report.summary.netChange}`;
        summaryDiv.appendChild(netStat);
        
        summaryStats.appendChild(summaryDiv);
        
        // Update detailed transactions
        const reportTable = document.querySelector('#report-table tbody');
        reportTable.innerHTML = '';
        
        report.transactions.forEach(transaction => {
            const row = document.createElement('tr');
            
            const dateCell = document.createElement('td');
            dateCell.textContent = new Date(transaction.date).toLocaleDateString();
            row.appendChild(dateCell);
            
            const jobCell = document.createElement('td');
            jobCell.textContent = transaction.jobId;
            row.appendChild(jobCell);
            
            const personCell = document.createElement('td');
            personCell.textContent = transaction.personName;
            row.appendChild(personCell);
            
            const itemCell = document.createElement('td');
            itemCell.textContent = transaction.itemName;
            row.appendChild(itemCell);
            
            const qtyCell = document.createElement('td');
            qtyCell.textContent = transaction.quantity;
            row.appendChild(qtyCell);
            
            const actionCell = document.createElement('td');
            actionCell.textContent = transaction.action === 'issue' ? 'Issued' : 'Returned';
            actionCell.className = transaction.action === 'issue' ? 'text-success' : 'text-info';
            row.appendChild(actionCell);
            
            reportTable.appendChild(row);
        });
    });
}