// Medicine Tracker Application
let medicines = [];
let currentView = 'day';
let currentDate = new Date();
let miniCalendarDate = new Date();
let editingMedicineId = null;
let currentSidebarTab = 'calendar';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadMedicines();
    setupEventListeners();
    renderCalendar();
    updateCurrentDateDisplay();
    renderMiniCalendar();
    renderLogPanel();
});

// Toggle mobile sidebar
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
}

// Setup event listeners
function setupEventListeners() {
    // View buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentView = this.dataset.view;
            currentDate = new Date();
            updateCurrentDateDisplay();
            renderCalendar();
        });
    });

    // Repeat type toggle
    document.getElementById('repeatType').addEventListener('change', function() {
        const intervalGroup = document.getElementById('intervalGroup');
        const weekdaysGroup = document.getElementById('weekdaysGroup');
        
        intervalGroup.style.display = this.value === 'interval' ? 'block' : 'none';
        weekdaysGroup.style.display = this.value === 'specific' ? 'block' : 'none';
    });

    // Weekday selector
    document.querySelectorAll('.weekday-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('selected');
        });
    });

    // Photo preview
    document.getElementById('medicinePhoto').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('photoPreview');
                preview.src = e.target.result;
                preview.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Form submission
    document.getElementById('medicineForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveMedicine();
    });

    // Set default date/time to now
    const now = new Date();
    const timeInput = document.getElementById('medicineTime');
    const startDateInput = document.getElementById('startDate');
    timeInput.value = formatTimeLocal(now);
    startDateInput.value = formatDateLocal(now);

    // Close modal on background click
    document.getElementById('medicineModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Load medicines from storage
function loadMedicines() {
    const stored = localStorage.getItem('medicines');
    if (stored) {
        medicines = JSON.parse(stored);
    }
}

// Save medicines to storage
function saveMedicines() {
    localStorage.setItem('medicines', JSON.stringify(medicines));
}

// Switch sidebar tab
function switchSidebarTab(tab) {
    currentSidebarTab = tab;
    
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    if (tab === 'calendar') {
        document.querySelector('.sidebar-tab[onclick*="calendar"]').classList.add('active');
        document.getElementById('calendarTab').classList.add('active');
    } else {
        document.querySelector('.sidebar-tab[onclick*="log"]').classList.add('active');
        document.getElementById('logTab').classList.add('active');
        renderLogPanel();
    }
}

// Render log panel
function renderLogPanel() {
    const panel = document.getElementById('logPanel');
    panel.innerHTML = '';
    
    if (medicines.length === 0) {
        panel.innerHTML = '<div style="text-align: center; color: #9aa0a6; padding: 20px; font-size: 13px;">No medicines added yet</div>';
        return;
    }
    
    medicines.forEach(med => {
        const logItem = document.createElement('div');
        logItem.className = 'log-item';
        
        const header = document.createElement('div');
        header.className = 'log-item-header';
        
        const name = document.createElement('div');
        name.className = 'log-item-name';
        name.textContent = med.name;
        header.appendChild(name);
        
        const stock = document.createElement('div');
        stock.className = 'log-item-stock';
        stock.textContent = `${med.stock} ${med.unit}(s)`;
        if (med.stock < 5) {
            stock.classList.add('low');
        }
        header.appendChild(stock);
        
        logItem.appendChild(header);
        
        // Details
        const details = document.createElement('div');
        details.className = 'log-item-details';
        const timeStr = med.time || 'Not set';
        const repeatStr = getRepeatDescription(med);
        details.textContent = `Time: ${timeStr} • ${repeatStr}`;
        logItem.appendChild(details);
        
        // History section
        const history = document.createElement('div');
        history.className = 'log-item-history';
        
        if (med.takenLog && med.takenLog.length > 0) {
            const historyTitle = document.createElement('div');
            historyTitle.className = 'history-title';
            historyTitle.textContent = `History (${med.takenLog.length} entries):`;
            history.appendChild(historyTitle);
            
            // Sort by date descending
            const sortedLog = [...med.takenLog].sort((a, b) => 
                new Date(b.takenAt) - new Date(a.takenAt)
            );
            
            sortedLog.slice(0, 10).forEach(entry => {
                const historyEntry = document.createElement('div');
                historyEntry.className = 'history-entry';
                
                const takenDate = new Date(entry.takenAt);
                const dateStr = takenDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const leftDiv = document.createElement('div');
                leftDiv.textContent = dateStr;
                historyEntry.appendChild(leftDiv);
                
                // Calculate if late/early/on-time
                if (med.time) {
                    const [expectedHour, expectedMinute] = med.time.split(':').map(Number);
                    const actualHour = takenDate.getHours();
                    const actualMinute = takenDate.getMinutes();
                    
                    const expectedMinutes = expectedHour * 60 + expectedMinute;
                    const actualMinutes = actualHour * 60 + actualMinute;
                    const diffMinutes = actualMinutes - expectedMinutes;
                    
                    const statusDiv = document.createElement('div');
                    
                    if (Math.abs(diffMinutes) <= 15) {
                        historyEntry.classList.add('ontime');
                        statusDiv.textContent = 'On time';
                        statusDiv.style.color = '#8ab4f8';
                    } else if (diffMinutes > 15) {
                        historyEntry.classList.add('late');
                        const hours = Math.floor(diffMinutes / 60);
                        const mins = diffMinutes % 60;
                        let lateStr = '';
                        if (hours > 0) lateStr += `${hours}h `;
                        if (mins > 0 || hours === 0) lateStr += `${mins}m`;
                        statusDiv.textContent = `${lateStr} late`;
                        statusDiv.style.color = '#f28b82';
                    } else {
                        historyEntry.classList.add('early');
                        const absDiff = Math.abs(diffMinutes);
                        const hours = Math.floor(absDiff / 60);
                        const mins = absDiff % 60;
                        let earlyStr = '';
                        if (hours > 0) earlyStr += `${hours}h `;
                        if (mins > 0 || hours === 0) earlyStr += `${mins}m`;
                        statusDiv.textContent = `${earlyStr} early`;
                        statusDiv.style.color = '#81c995';
                    }
                    
                    historyEntry.appendChild(statusDiv);
                }
                
                history.appendChild(historyEntry);
            });
        } else {
            const noHistory = document.createElement('div');
            noHistory.className = 'history-title';
            noHistory.textContent = 'No history yet';
            noHistory.style.color = '#9aa0a6';
            history.appendChild(noHistory);
        }
        
        logItem.appendChild(history);
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-log-btn';
        editBtn.textContent = 'Edit Medicine';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            openModal(med.id);
        };
        logItem.appendChild(editBtn);
        
        // Toggle expansion on click
        logItem.onclick = () => {
            logItem.classList.toggle('expanded');
        };
        
        panel.appendChild(logItem);
    });
}

// Get repeat description
function getRepeatDescription(medicine) {
    if (!medicine.repeat) return 'Daily';
    
    switch(medicine.repeat.type) {
        case 'daily':
            return 'Daily';
        case 'interval':
            return `Every ${medicine.repeat.interval} days`;
        case 'weekly':
            return 'Weekly';
        case 'specific':
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const selectedDays = medicine.repeat.weekdays.map(d => days[d]).join(', ');
            return selectedDays;
        default:
            return 'Daily';
    }
}

// Open modal
function openModal(medicineId = null) {
    editingMedicineId = medicineId;
    const modal = document.getElementById('medicineModal');
    const title = document.querySelector('.modal-title');
    const submitBtn = document.querySelector('.btn-submit');
    const footer = document.querySelector('.modal-footer');
    
    if (medicineId) {
        const medicine = medicines.find(m => m.id === medicineId);
        if (medicine) {
            title.textContent = 'Edit Medicine';
            submitBtn.textContent = 'Update Medicine';
            
            // Populate form
            document.getElementById('medicineName').value = medicine.name;
            document.getElementById('medicineUnit').value = medicine.unit;
            document.getElementById('medicineStock').value = medicine.stock;
            document.getElementById('medicineTime').value = medicine.time || '';
            document.getElementById('startDate').value = medicine.startDate;
            document.getElementById('endDate').value = medicine.endDate || '';
            
            if (medicine.photo) {
                document.getElementById('photoPreview').src = medicine.photo;
                document.getElementById('photoPreview').style.display = 'block';
            }
            
            // Set repeat type
            const repeat = medicine.repeat || { type: 'daily' };
            document.getElementById('repeatType').value = repeat.type;
            
            if (repeat.type === 'interval') {
                document.getElementById('intervalDays').value = repeat.interval || 2;
                document.getElementById('intervalGroup').style.display = 'block';
            } else if (repeat.type === 'specific') {
                document.getElementById('weekdaysGroup').style.display = 'block';
                document.querySelectorAll('.weekday-btn').forEach(btn => {
                    if (repeat.weekdays.includes(parseInt(btn.dataset.day))) {
                        btn.classList.add('selected');
                    }
                });
            }
            
            // Add delete button
            if (!document.querySelector('.btn-delete')) {
                const deleteBtn = document.createElement('button');
                deleteBtn.type = 'button';
                deleteBtn.className = 'modal-btn btn-delete';
                deleteBtn.textContent = 'Delete';
                deleteBtn.onclick = () => deleteMedicine(medicineId);
                footer.insertBefore(deleteBtn, footer.firstChild);
            }
        }
    } else {
        title.textContent = 'Add New Medicine';
        submitBtn.textContent = 'Add Medicine';
        
        const deleteBtn = document.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.remove();
        }
    }
    
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('medicineModal').classList.remove('active');
    document.getElementById('medicineForm').reset();
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('intervalGroup').style.display = 'none';
    document.getElementById('weekdaysGroup').style.display = 'none';
    document.querySelectorAll('.weekday-btn').forEach(btn => btn.classList.remove('selected'));
    editingMedicineId = null;
    
    const now = new Date();
    document.getElementById('medicineTime').value = formatTimeLocal(now);
    document.getElementById('startDate').value = formatDateLocal(now);
}

// Save medicine
function saveMedicine() {
    const name = document.getElementById('medicineName').value;
    const unit = document.getElementById('medicineUnit').value;
    const stock = parseInt(document.getElementById('medicineStock').value);
    const time = document.getElementById('medicineTime').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value || null;
    const repeatType = document.getElementById('repeatType').value;
    
    let repeat = { type: repeatType };
    
    if (repeatType === 'interval') {
        repeat.interval = parseInt(document.getElementById('intervalDays').value);
    } else if (repeatType === 'specific') {
        repeat.weekdays = Array.from(document.querySelectorAll('.weekday-btn.selected'))
            .map(btn => parseInt(btn.dataset.day));
    }

    const photoFile = document.getElementById('medicinePhoto').files[0];
    
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const photoData = e.target.result;
            saveMedicineData(photoData);
        };
        reader.readAsDataURL(photoFile);
    } else {
        const existingPhoto = editingMedicineId ? medicines.find(m => m.id === editingMedicineId)?.photo : null;
        saveMedicineData(existingPhoto);
    }

    function saveMedicineData(photoData) {
        if (editingMedicineId) {
            const medicine = medicines.find(m => m.id === editingMedicineId);
            if (medicine) {
                medicine.name = name;
                medicine.unit = unit;
                medicine.stock = stock;
                medicine.initialStock = stock;
                medicine.time = time;
                medicine.startDate = startDate;
                medicine.endDate = endDate;
                medicine.repeat = repeat;
                medicine.photo = photoData;
            }
        } else {
            const medicine = {
                id: Date.now(),
                name: name,
                unit: unit,
                stock: stock,
                initialStock: stock,
                time: time,
                startDate: startDate,
                endDate: endDate,
                repeat: repeat,
                photo: photoData,
                takenDates: [],
                takenLog: []
            };
            medicines.push(medicine);
        }
        
        saveMedicines();
        closeModal();
        renderCalendar();
        renderMiniCalendar();
        renderLogPanel();
    }
}

// Navigate to today
function navigateToToday() {
    currentDate = new Date();
    miniCalendarDate = new Date();
    renderCalendar();
    updateCurrentDateDisplay();
    renderMiniCalendar();
}

// Navigate date
function navigateDate(direction) {
    const daysToMove = {
        'day': 1,
        'three-day': 3,
        'week': 7,
        'month': 30
    };

    const days = daysToMove[currentView];
    currentDate.setDate(currentDate.getDate() + (direction * days));
    renderCalendar();
    updateCurrentDateDisplay();
}

// Navigate mini calendar
function navigateMiniCalendar(direction) {
    miniCalendarDate.setMonth(miniCalendarDate.getMonth() + direction);
    renderMiniCalendar();
}

// Update current date display
function updateCurrentDateDisplay() {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = currentDate.toLocaleDateString('en-US', options);
}

// Render mini calendar
function renderMiniCalendar() {
    const monthDisplay = document.getElementById('miniCalendarMonth');
    const grid = document.getElementById('miniCalendarGrid');
    
    const year = miniCalendarDate.getFullYear();
    const month = miniCalendarDate.getMonth();
    
    monthDisplay.textContent = miniCalendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    grid.innerHTML = '';
    
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'mini-calendar-day';
        dayHeader.textContent = day;
        dayHeader.style.fontWeight = '600';
        grid.appendChild(dayHeader);
    });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'mini-calendar-day';
        grid.appendChild(empty);
    }
    
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'mini-calendar-day';
        dayCell.textContent = day;
        
        const cellDate = new Date(year, month, day);
        
        if (cellDate.toDateString() === today.toDateString()) {
            dayCell.classList.add('today');
        }
        
        if (hasMedicineOnDate(cellDate)) {
            dayCell.classList.add('has-medicine');
        }
        
        dayCell.onclick = () => {
            currentDate = new Date(cellDate);
            renderCalendar();
            updateCurrentDateDisplay();
            
            // Close mobile sidebar when date is selected
            if (window.innerWidth <= 768) {
                toggleMobileSidebar();
            }
        };
        
        grid.appendChild(dayCell);
    }
}

// Check if date has medicine
function hasMedicineOnDate(date) {
    return getMedicinesForDate(date).length > 0;
}

// Render calendar
function renderCalendar() {
    const calendar = document.getElementById('calendar');
    
    if (currentView === 'day' || currentView === 'three-day' || currentView === 'week') {
        const timeGrid = createTimeBasedGrid();
        calendar.innerHTML = '';
        calendar.appendChild(timeGrid);
    } else {
        const grid = document.createElement('div');
        grid.className = 'calendar-grid';
        grid.classList.add('month-view');
        
        const days = getMonthDays(currentDate);
        days.forEach(day => {
            const dayColumn = createDayColumn(day);
            grid.appendChild(dayColumn);
        });
        
        calendar.innerHTML = '';
        calendar.appendChild(grid);
    }
}

// Get date range
function getDateRange(startDate, numDays) {
    const dates = [];
    for (let i = 0; i < numDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dates.push(date);
    }
    return dates;
}

// Get week days
function getWeekDays(date) {
    const day = date.getDay();
    const diff = date.getDate() - day;
    const sunday = new Date(date.setDate(diff));
    return getDateRange(sunday, 7);
}

// Get month days
function getMonthDays(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i));
    }
    return days;
}

// Create day column
function createDayColumn(date) {
    const column = document.createElement('div');
    column.className = 'day-column';
    
    const header = document.createElement('div');
    header.className = 'day-header';
    
    const dayName = document.createElement('div');
    dayName.className = 'day-name';
    dayName.textContent = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    header.appendChild(dayName);
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
        dayNumber.classList.add('today');
    }
    
    header.appendChild(dayNumber);
    column.appendChild(header);
    
    const timeGrid = document.createElement('div');
    timeGrid.className = 'time-grid';
    
    const medicinesForDay = getMedicinesForDate(date);
    medicinesForDay.forEach(med => {
        const event = createMedicineEvent(med, date);
        timeGrid.appendChild(event);
    });
    
    column.appendChild(timeGrid);
    
    return column;
}

// Create time-based grid
function createTimeBasedGrid() {
    const grid = document.createElement('div');
    grid.className = `time-based-grid ${currentView}-grid`;
    
    let days = [];
    switch(currentView) {
        case 'day':
            days = [new Date(currentDate)];
            break;
        case 'three-day':
            days = getDateRange(currentDate, 3);
            break;
        case 'week':
            days = getWeekDays(currentDate);
            break;
    }
    
    // Collect all unique times from medicines across all days
    const allTimes = new Set();
    days.forEach(day => {
        const medicinesForDay = getMedicinesForDate(day);
        medicinesForDay.forEach(med => {
            if (med.time) {
                allTimes.add(med.time);
            }
        });
    });
    
    // Sort times chronologically
    const sortedTimes = Array.from(allTimes).sort();
    
    const headerRow = document.createElement('div');
    headerRow.className = 'time-grid-header';
    
    const timeHeader = document.createElement('div');
    timeHeader.className = 'time-header-cell';
    headerRow.appendChild(timeHeader);
    
    days.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header-cell';
        
        const dayName = document.createElement('div');
        dayName.className = 'day-name';
        dayName.textContent = day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        dayHeader.appendChild(dayName);
        
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day.getDate();
        
        const today = new Date();
        if (day.toDateString() === today.toDateString()) {
            dayNumber.classList.add('today');
        }
        
        dayHeader.appendChild(dayNumber);
        headerRow.appendChild(dayHeader);
    });
    
    grid.appendChild(headerRow);
    
    // Create time rows for each unique time
    sortedTimes.forEach(timeStr => {
        const timeRow = document.createElement('div');
        timeRow.className = 'time-row';
        
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label-cell';
        timeLabel.textContent = timeStr;
        timeRow.appendChild(timeLabel);
        
        days.forEach(day => {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            
            const medicinesForDay = getMedicinesForDate(day);
            const medicinesAtThisTime = medicinesForDay.filter(med => med.time === timeStr);
            
            medicinesAtThisTime.forEach(med => {
                const event = createMedicineEvent(med, day);
                event.classList.add('time-based-event');
                dayCell.appendChild(event);
            });
            
            timeRow.appendChild(dayCell);
        });
        
        grid.appendChild(timeRow);
    });
    
    return grid;
}

// Get medicines for date
function getMedicinesForDate(date) {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return medicines.filter(med => {
        if (med.stock <= 0) return false;

        const startDate = new Date(med.startDate);
        startDate.setHours(0, 0, 0, 0);

        if (checkDate < startDate) return false;

        if (med.endDate) {
            const endDate = new Date(med.endDate);
            endDate.setHours(0, 0, 0, 0);
            if (checkDate > endDate) return false;
        }

        // Check repeat pattern
        const repeat = med.repeat || { type: 'daily' };
        
        switch(repeat.type) {
            case 'daily':
                return true;
            case 'interval':
                const daysDiff = Math.floor((checkDate - startDate) / (1000 * 60 * 60 * 24));
                return daysDiff % repeat.interval === 0;
            case 'weekly':
                return checkDate.getDay() === startDate.getDay();
            case 'specific':
                return repeat.weekdays.includes(checkDate.getDay());
            default:
                return true;
        }
    });
}

// Create medicine event
function createMedicineEvent(medicine, date) {
    const event = document.createElement('div');
    event.className = 'medicine-event';
    
    if (medicine.stock < 5) {
        event.classList.add('low-stock');
    }
    
    const time = document.createElement('div');
    time.className = 'event-time';
    time.textContent = medicine.time || 'No time set';
    event.appendChild(time);
    
    const title = document.createElement('div');
    title.className = 'event-title';
    
    if (medicine.photo && currentView !== 'month') {
        const photo = document.createElement('img');
        photo.src = medicine.photo;
        photo.className = 'event-photo';
        title.appendChild(photo);
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = medicine.name;
    title.appendChild(nameSpan);
    event.appendChild(title);
    
    const details = document.createElement('div');
    details.className = 'event-details';
    details.textContent = `${medicine.stock} ${medicine.unit}(s) remaining`;
    event.appendChild(details);
    
    if (medicine.stock < 5) {
        const warning = document.createElement('div');
        warning.className = 'event-warning';
        warning.textContent = `⚠ Low stock - Only ${medicine.stock} left`;
        event.appendChild(warning);
    }
    
    if (currentView !== 'month') {
        const actions = document.createElement('div');
        actions.className = 'event-actions';
        
        const dateKey = formatDateKey(date);
        const isTaken = medicine.takenDates.includes(dateKey);
        
        const takenBtn = document.createElement('button');
        takenBtn.className = 'action-btn taken-btn';
        takenBtn.textContent = isTaken ? '✓ Taken' : 'Mark Taken';
        if (isTaken) {
            takenBtn.classList.add('taken');
        } else {
            takenBtn.onclick = (e) => {
                e.stopPropagation();
                markAsTaken(medicine.id, date);
            };
        }
        actions.appendChild(takenBtn);     
        event.appendChild(actions);
    }
    
    return event;
}

// Mark medicine as taken
function markAsTaken(medicineId, date) {
    const medicine = medicines.find(m => m.id === medicineId);
    if (medicine) {
        const dateKey = formatDateKey(date);
        if (!medicine.takenDates.includes(dateKey)) {
            medicine.takenDates.push(dateKey);
            medicine.stock = Math.max(0, medicine.stock - 1);
            
            // Add to taken log with actual time
            if (!medicine.takenLog) {
                medicine.takenLog = [];
            }
            medicine.takenLog.push({
                date: dateKey,
                takenAt: new Date().toISOString()
            });
            
            saveMedicines();
            renderCalendar();
            renderMiniCalendar();
            if (currentSidebarTab === 'log') {
                renderLogPanel();
            }
        }
    }
}

// Delete medicine
function deleteMedicine(medicineId) {
    if (confirm('Are you sure you want to remove this medicine from your tracker?')) {
        medicines = medicines.filter(m => m.id !== medicineId);
        saveMedicines();
        closeModal();
        renderCalendar();
        renderMiniCalendar();
        renderLogPanel();
    }
}

// Format time for input
function formatTimeLocal(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Format date for input
function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format date key for storage
function formatDateKey(date) {
    return formatDateLocal(date);
}