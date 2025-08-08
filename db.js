// Database configuration
const DB_NAME = 'PowerPlantWarehouseDB';
const DB_VERSION = 1;
let db;

// Initialize database
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = function(event) {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            db = event.target.result;
            resolve();
        };
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            
            // Create inventory items store
            if (!db.objectStoreNames.contains('inventory')) {
                const inventoryStore = db.createObjectStore('inventory', { keyPath: 'id', autoIncrement: true });
                inventoryStore.createIndex('name', 'name', { unique: true });
            }
            
            // Create transactions store
            if (!db.objectStoreNames.contains('transactions')) {
                const transactionsStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                transactionsStore.createIndex('jobId', 'jobId', { unique: false });
                transactionsStore.createIndex('date', 'date', { unique: false });
            }
            
            // Create active jobs store
            if (!db.objectStoreNames.contains('activeJobs')) {
                const activeJobsStore = db.createObjectStore('activeJobs', { keyPath: 'jobId' });
                activeJobsStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
}

// Inventory operations
function getAllInventoryItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventory'], 'readonly');
        const store = transaction.objectStore('inventory');
        const request = store.getAll();
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

function getInventoryItem(itemId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventory'], 'readonly');
        const store = transaction.objectStore('inventory');
        const request = store.get(itemId);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

function updateInventoryItem(itemId, newStock) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');
        
        const getRequest = store.get(itemId);
        
        getRequest.onerror = function(event) {
            reject(event.target.error);
        };
        
        getRequest.onsuccess = function(event) {
            const item = event.target.result;
            if (item) {
                item.currentStock = newStock;
                const putRequest = store.put(item);
                
                putRequest.onerror = function(event) {
                    reject(event.target.error);
                };
                
                putRequest.onsuccess = function() {
                    resolve();
                };
            } else {
                reject(new Error('Item not found'));
            }
        };
    });
}

function addNewInventoryItem(name, initialStock, unit) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventory'], 'readwrite');
        const store = transaction.objectStore('inventory');
        
        const item = {
            name: name,
            currentStock: initialStock,
            unit: unit
        };
        
        const request = store.add(item);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            resolve();
        };
    });
}

// Transaction operations
function addTransaction(jobId, personName, itemId, itemName, quantity, action, task, date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');
        
        const newTransaction = {
            jobId: jobId,
            personName: personName,
            itemId: itemId,
            itemName: itemName,
            quantity: quantity,
            action: action,
            task: task,
            date: date
        };
        
        const request = store.add(newTransaction);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            resolve();
        };
    });
}

function getRecentActivity(limit = 10) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const index = store.index('date');
        const request = index.openCursor(null, 'prev');
        
        const results = [];
        let count = 0;
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor && count < limit) {
                results.push(cursor.value);
                count++;
                cursor.continue();
            } else {
                resolve(results);
            }
        };
    });
}

function getMonthlyReport(month) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const index = store.index('date');
        
        // Parse month (format: YYYY-MM)
        const [year, monthNum] = month.split('-');
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);
        
        const range = IDBKeyRange.bound(startDate, endDate);
        const request = index.getAll(range);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            const transactions = event.target.result;
            
            const summary = {
                totalIssued: 0,
                totalReturned: 0,
                netChange: 0
            };
            
            transactions.forEach(t => {
                if (t.action === 'issue') {
                    summary.totalIssued += t.quantity;
                    summary.netChange -= t.quantity;
                } else {
                    summary.totalReturned += t.quantity;
                    summary.netChange += t.quantity;
                }
            });
            
            resolve({
                summary: summary,
                transactions: transactions
            });
        };
    });
}

// Active jobs operations
function addActiveJob(jobId, personName, items, task, date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readwrite');
        const store = transaction.objectStore('activeJobs');
        
        const job = {
            jobId: jobId,
            personName: personName,
            items: items,
            task: task,
            date: date
        };
        
        const request = store.add(job);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            resolve();
        };
    });
}

function getActiveJobs() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readonly');
        const store = transaction.objectStore('activeJobs');
        const request = store.getAll();
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

function getJobDetails(jobId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readonly');
        const store = transaction.objectStore('activeJobs');
        const request = store.get(jobId);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

function removeActiveJob(jobId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readwrite');
        const store = transaction.objectStore('activeJobs');
        const request = store.delete(jobId);
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function() {
            resolve();
        };
    });
}

// Dashboard statistics
function getTotalInventoryItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['inventory'], 'readonly');
        const store = transaction.objectStore('inventory');
        const request = store.count();
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

function getTotalCheckedOutItems() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readonly');
        const store = transaction.objectStore('activeJobs');
        const request = store.getAll();
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            const jobs = event.target.result;
            let total = 0;
            
            jobs.forEach(job => {
                job.items.forEach(item => {
                    total += item.quantity;
                });
            });
            
            resolve(total);
        };
    });
}

function getActiveJobsCount() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['activeJobs'], 'readonly');
        const store = transaction.objectStore('activeJobs');
        const request = store.count();
        
        request.onerror = function(event) {
            reject(event.target.error);
        };
        
        request.onsuccess = function(event) {
            resolve(event.target.result);
        };
    });
}

// High-level operations
function issueItems(jobId, personName, items, task, date) {
    return new Promise((resolve, reject) => {
        // First, check if all items have sufficient stock
        const checkPromises = items.map(item => {
            return getInventoryItem(item.itemId)
                .then(dbItem => {
                    if (dbItem.currentStock < item.quantity) {
                        throw new Error(`Insufficient stock for ${dbItem.name}. Available: ${dbItem.currentStock}, Requested: ${item.quantity}`);
                    }
                    return {
                        itemId: item.itemId,
                        currentStock: dbItem.currentStock,
                        requestedQty: item.quantity
                    };
                });
        });
        
        Promise.all(checkPromises)
            .then(results => {
                // All checks passed, proceed with transaction
                const transactionPromises = results.map(result => {
                    const newStock = result.currentStock - result.requestedQty;
                    return updateInventoryItem(result.itemId, newStock);
                });
                
                // Add transaction records
                const dateObj = date ? new Date(date) : new Date();
                const transactionPromises2 = items.map(item => {
                    return addTransaction(
                        jobId,
                        personName,
                        item.itemId,
                        item.itemName,
                        item.quantity,
                        'issue',
                        task,
                        dateObj
                    );
                });
                
                // Prepare items for active job
                const activeJobItems = items.map(item => {
                    return {
                        id: item.itemId,
                        name: item.itemName,
                        quantity: item.quantity,
                        unit: '' // Would need to get this from inventory
                    };
                });
                
                // Add active job
                return Promise.all([
                    ...transactionPromises,
                    ...transactionPromises2,
                    addActiveJob(jobId, personName, activeJobItems, task, dateObj)
                ]);
            })
            .then(() => resolve())
            .catch(error => reject(error));
    });
}

function returnItemsToInventory(jobId, returnItems) {
    return new Promise((resolve, reject) => {
        // First, get the job details
        getJobDetails(jobId)
            .then(job => {
                if (!job) {
                    throw new Error('Job not found');
                }
                
                // Validate return quantities
                const validationPromises = returnItems.map(returnItem => {
                    const jobItem = job.items.find(item => item.id === returnItem.itemId);
                    if (!jobItem) {
                        throw new Error(`Item ${returnItem.itemId} not found in job ${jobId}`);
                    }
                    
                    if (returnItem.returnedQty > returnItem.originalQty) {
                        throw new Error(`Cannot return more than was issued for item ${jobItem.name}`);
                    }
                    
                    return getInventoryItem(returnItem.itemId);
                });
                
                return Promise.all(validationPromises)
                    .then(inventoryItems => {
                        // Update inventory
                        const updatePromises = returnItems.map((returnItem, index) => {
                            const newStock = inventoryItems[index].currentStock + returnItem.returnedQty;
                            return updateInventoryItem(returnItem.itemId, newStock);
                        });
                        
                        // Add transaction records
                        const transactionPromises = returnItems.map(returnItem => {
                            const jobItem = job.items.find(item => item.id === returnItem.itemId);
                            return addTransaction(
                                jobId,
                                job.personName,
                                returnItem.itemId,
                                jobItem.name,
                                returnItem.returnedQty,
                                'return',
                                job.task,
                                new Date()
                            );
                        });
                        
                        // If all items are returned, remove the active job
                        const allReturned = returnItems.every(returnItem => 
                            returnItem.returnedQty === returnItem.originalQty
                        );
                        
                        const removePromise = allReturned ? 
                            removeActiveJob(jobId) : 
                            Promise.resolve();
                        
                        return Promise.all([
                            ...updatePromises,
                            ...transactionPromises,
                            removePromise
                        ]);
                    });
            })
            .then(() => resolve())
            .catch(error => reject(error));
    });
}