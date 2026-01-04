const API_URL = 'http://localhost:3000/api';

let customers = [];
let employees = [];
let products = [];
let locations = [];
let bookingItems = [];

function formatTime12Hour(date) {
    const d = new Date(date);
    let hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${minutesStr} ${ampm}`;
}

function formatDateTime(date) {
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = formatTime12Hour(d);
    return `${dateStr} ${timeStr}`;
}

function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

async function loadPickupBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();

        const today = new Date().toISOString().split('T')[0];
        const bookedBookings = bookings.filter(b => b.booking_status === 'Booked');

        // Separate bookings due today from others
        const dueToday = bookedBookings.filter(b => {
            const startDate = new Date(b.rental_start_date).toISOString().split('T')[0];
            return startDate === today;
        });
        const others = bookedBookings.filter(b => {
            const startDate = new Date(b.rental_start_date).toISOString().split('T')[0];
            return startDate !== today;
        });

        console.log('Today:', today);
        console.log('Booked bookings:', bookedBookings.map(b => ({ id: b.booking_id, start: b.rental_start_date })));
        console.log('Due today:', dueToday.length);

        // Display due today bookings as cards
        const dueTodayList = document.getElementById('pickup-due-today-list');
        const dueTodaySection = document.getElementById('pickup-due-today-section');

        if (dueToday.length > 0) {
            dueTodaySection.style.display = 'block';
            dueTodayList.innerHTML = dueToday.map(booking => `
                <div class="booking-card due-today-card" style="background: #fff3cd; border-left: 5px solid #e74c3c; margin-bottom: 15px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <div>
                            <h4 style="color: #e74c3c; margin-bottom: 5px; font-size: 20px;">${booking.booking_number}</h4>
                            <p style="font-size: 16px; margin: 5px 0;"><strong>Customer:</strong> ${booking.customer_name}</p>
                            <p style="font-size: 16px; margin: 5px 0;"><strong>Phone:</strong> ${booking.phone_number}</p>
                            <p style="font-size: 16px; margin: 5px 0;"><strong>Period:</strong> ${formatDate(booking.rental_start_date)} to ${formatDate(booking.rental_end_date)}</p>
                            <p style="font-size: 14px; margin: 5px 0; color: #666;"><strong>Booked at:</strong> ${formatDateTime(booking.created_at)}</p>
                        </div>
                        <button onclick="showPickupDetails(${booking.booking_id})" class="btn-primary" style="padding: 12px 24px; font-size: 16px;">
                            Start Pickup
                        </button>
                    </div>
                </div>
            `).join('');
        } else {
            dueTodaySection.style.display = 'none';
        }

        // Populate dropdown for other bookings
        const select = document.getElementById('pickup-booking-select');
        select.innerHTML = '<option value="">Select Booking</option>';

        others.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.booking_id;
            option.textContent = `${booking.booking_number} - ${booking.customer_name} (Start: ${formatDate(booking.rental_start_date)})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

async function showPickupDetails(bookingId) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`);
        const booking = await response.json();

        const detailsDiv = document.getElementById('pickup-details');
        detailsDiv.innerHTML = `
            <div class="booking-details" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.booking_number}</p>
                <p><strong>Customer:</strong> ${booking.customer_name} (${booking.phone_number})</p>
                <p><strong>Employee:</strong> ${booking.employee_name}</p>
                <p><strong>Rental Period:</strong> ${formatDate(booking.rental_start_date)} to ${formatDate(booking.rental_end_date)}</p>
                <p><strong>Booked at:</strong> ${formatDateTime(booking.created_at)}</p>

                <h4>Items:</h4>
                <div id="pickup-items-list-${bookingId}">
                    ${booking.items.map(item => `
                        <div class="item-card">
                            <p><strong>${item.product_name}</strong></p>
                            <p>Quantity: ${item.quantity}</p>
                            <p>Agreed Price: ₹${item.agreed_rental_price}/day</p>
                            <p>Duration: ${item.rental_duration_days} days</p>
                            <p>Total: ₹${item.item_total_amount}</p>
                        </div>
                    `).join('')}
                </div>

                <div style="margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 5px;">
                    <h4 style="margin-bottom: 10px;">Add More Items</h4>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; align-items: end;">
                        <div class="form-group" style="margin: 0;">
                            <label>Product</label>
                            <select id="pickup-add-product-${bookingId}" class="form-control">
                                <option value="">Select Product</option>
                                ${products.filter(p => p.status === 'Available' && p.quantity_available > 0).map(p => `<option value="${p.product_id}" data-price="${p.rental_price}">${p.product_name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label>Quantity</label>
                            <input type="number" id="pickup-add-quantity-${bookingId}" min="1" value="1" class="form-control">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <label>Price/day</label>
                            <input type="number" id="pickup-add-price-${bookingId}" step="0.01" min="0" class="form-control">
                        </div>
                        <button type="button" onclick="addItemToPickup(${bookingId})" class="btn-primary" style="margin-bottom: 0;">Add Item</button>
                    </div>
                </div>

                <div class="revenue-summary" id="pickup-summary-${bookingId}">
                    <div class="revenue-item">
                        <span>Total Amount:</span>
                        <span id="pickup-total-${bookingId}">₹${booking.total_amount}</span>
                    </div>
                    <div class="revenue-item">
                        <span>Advance Paid:</span>
                        <span>₹${booking.advance_amount}</span>
                    </div>
                    <div class="revenue-item">
                        <span>Remaining Balance:</span>
                        <span id="pickup-balance-${bookingId}">₹${booking.remaining_balance}</span>
                    </div>
                </div>

                <form id="pickup-form-${bookingId}">
                    <div class="form-group">
                        <label>Final Payment Amount</label>
                        <input type="number" id="pickup-final-amount-${bookingId}" step="0.01" min="0" value="${booking.remaining_balance}" required>
                    </div>
                    <div class="form-group">
                        <label>Payment Method</label>
                        <select id="pickup-payment-method-${bookingId}" required>
                            <option value="">Select Method</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="UPI">UPI</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-success">Confirm Pickup</button>
                </form>
            </div>
        `;

        // Store booking data for adding items
        window.currentPickupBooking = {
            bookingId: bookingId,
            items: [...booking.items],
            totalAmount: parseFloat(booking.total_amount),
            advanceAmount: parseFloat(booking.advance_amount),
            remainingBalance: parseFloat(booking.remaining_balance),
            rentalDays: booking.items[0]?.rental_duration_days || 1,
            rental_start_date: booking.rental_start_date,
            rental_end_date: booking.rental_end_date
        };

        // Update price when product is selected
        document.getElementById(`pickup-add-product-${bookingId}`).addEventListener('change', (e) => {
            const selectedOption = e.target.options[e.target.selectedIndex];
            const price = selectedOption.getAttribute('data-price');
            if (price) {
                document.getElementById(`pickup-add-price-${bookingId}`).value = price;
            }
        });

        document.getElementById(`pickup-form-${bookingId}`).addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!confirm('Confirm pickup? This will update inventory.')) return;

            try {
                const response = await fetch(`${API_URL}/bookings/${bookingId}/pickup`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        final_amount: document.getElementById(`pickup-final-amount-${bookingId}`).value,
                        payment_method: document.getElementById(`pickup-payment-method-${bookingId}`).value,
                        additional_items: window.currentPickupBooking.additionalItems || []
                    })
                });

                if (response.ok) {
                    alert('Pickup confirmed successfully!');
                    loadPickupBookings();
                    document.getElementById('pickup-details').innerHTML = '';
                } else {
                    const error = await response.json();
                    alert('Error: ' + error.error);
                }
            } catch (error) {
                alert('Error confirming pickup: ' + error.message);
            }
        });

        // Scroll to details
        detailsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (error) {
        console.error('Error loading pickup details:', error);
        alert('Error loading booking details');
    }
}

async function addItemToPickup(bookingId) {
    const productSelect = document.getElementById(`pickup-add-product-${bookingId}`);
    const quantityInput = document.getElementById(`pickup-add-quantity-${bookingId}`);
    const priceInput = document.getElementById(`pickup-add-price-${bookingId}`);

    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value);
    const price = parseFloat(priceInput.value);

    console.log('Adding item to pickup:', { productId, quantity, price });

    if (!productId || !quantity || !price) {
        alert('Please fill all fields');
        return;
    }

    if (quantity <= 0 || price < 0) {
        alert('Please enter valid quantity and price');
        return;
    }

    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const productName = selectedOption.text.split(' (')[0];

    // Check availability
    const booking = window.currentPickupBooking;
    const startDate = new Date(booking.rental_start_date).toISOString().split('T')[0];
    const endDate = new Date(booking.rental_end_date).toISOString().split('T')[0];

    console.log('Checking availability:', { productId, quantity, startDate, endDate });

    try {
        const availabilityUrl = `${API_URL}/inventory/check-availability?product_id=${productId}&start_date=${startDate}&end_date=${endDate}&quantity=${quantity}`;
        console.log('Availability URL:', availabilityUrl);

        const availabilityResponse = await fetch(availabilityUrl);
        const availabilityData = await availabilityResponse.json();

        console.log('Availability response:', availabilityData);

        if (!availabilityData.available) {
            alert(`Not enough quantity available. Only ${availabilityData.available_quantity} available for the selected dates.`);
            return;
        }

        if (!window.currentPickupBooking.additionalItems) {
            window.currentPickupBooking.additionalItems = [];
        }

        const rentalDays = window.currentPickupBooking.rentalDays;
        const itemTotal = quantity * price * rentalDays;

        console.log('Adding item:', { rentalDays, itemTotal });

        window.currentPickupBooking.additionalItems.push({
            product_id: parseInt(productId),
            quantity: quantity,
            agreed_rental_price: price,
            rental_duration_days: rentalDays,
            item_total_amount: itemTotal
        });

        // Add item to display list
        const itemsList = document.getElementById(`pickup-items-list-${bookingId}`);
        const itemDiv = document.createElement('div');
        itemDiv.className = 'item-card';
        itemDiv.style.backgroundColor = '#e8f5e9';
        itemDiv.innerHTML = `
            <p><strong>${productName} (Added)</strong></p>
            <p>Quantity: ${quantity}</p>
            <p>Agreed Price: ₹${price}/day</p>
            <p>Duration: ${rentalDays} days</p>
            <p>Total: ₹${itemTotal.toFixed(2)}</p>
        `;
        itemsList.appendChild(itemDiv);

        // Update total amount
        window.currentPickupBooking.totalAmount += itemTotal;
        const newBalance = window.currentPickupBooking.totalAmount - window.currentPickupBooking.advanceAmount;

        console.log('Updated totals:', { totalAmount: window.currentPickupBooking.totalAmount, newBalance });

        document.getElementById(`pickup-total-${bookingId}`).textContent = `₹${window.currentPickupBooking.totalAmount.toFixed(2)}`;
        document.getElementById(`pickup-balance-${bookingId}`).textContent = `₹${newBalance.toFixed(2)}`;
        document.getElementById(`pickup-final-amount-${bookingId}`).value = newBalance.toFixed(2);

        // Reset form
        productSelect.value = '';
        quantityInput.value = '1';
        priceInput.value = '';

        alert('Item added successfully!');
    } catch (error) {
        console.error('Error checking availability:', error);
        alert('Error checking product availability: ' + error.message);
    }
}

async function loadPickupDetails() {
    const bookingId = document.getElementById('pickup-booking-select').value;
    if (!bookingId) {
        document.getElementById('pickup-details').innerHTML = '';
        return;
    }
    await showPickupDetails(bookingId);
}

async function loadReturnBookings() {
    try {
        const response = await fetch(`${API_URL}/bookings`);
        const bookings = await response.json();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeBookings = bookings.filter(b => b.booking_status === 'Active');

        // Separate bookings due today from others
        const dueToday = activeBookings.filter(b => {
            const returnDate = new Date(b.rental_end_date);
            returnDate.setHours(0, 0, 0, 0);
            return returnDate.getTime() === today.getTime();
        });
        const others = activeBookings.filter(b => {
            const returnDate = new Date(b.rental_end_date);
            returnDate.setHours(0, 0, 0, 0);
            return returnDate.getTime() !== today.getTime();
        });

        // Display due today bookings as cards
        const dueTodayList = document.getElementById('return-due-today-list');
        const dueTodaySection = document.getElementById('return-due-today-section');

        if (dueToday.length > 0) {
            dueTodaySection.style.display = 'block';
            dueTodayList.innerHTML = dueToday.map(booking => {
                const isOverdue = new Date(booking.rental_end_date) < new Date();
                return `
                    <div class="booking-card due-today-card" style="background: ${isOverdue ? '#ffebee' : '#e8f5e9'}; border-left: 5px solid ${isOverdue ? '#f44336' : '#4caf50'}; margin-bottom: 15px; padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                            <div>
                                <h4 style="color: ${isOverdue ? '#f44336' : '#4caf50'}; margin-bottom: 5px; font-size: 20px;">${booking.booking_number} ${isOverdue ? '(OVERDUE)' : ''}</h4>
                                <p style="font-size: 16px; margin: 5px 0;"><strong>Customer:</strong> ${booking.customer_name}</p>
                                <p style="font-size: 16px; margin: 5px 0;"><strong>Phone:</strong> ${booking.phone_number}</p>
                                <p style="font-size: 16px; margin: 5px 0;"><strong>Return Date:</strong> ${formatDate(booking.rental_end_date)}</p>
                                <p style="font-size: 14px; margin: 5px 0; color: #666;"><strong>Picked up at:</strong> ${formatDateTime(booking.pickup_date)}</p>
                            </div>
                            <button onclick="showReturnDetails(${booking.booking_id})" class="btn-primary" style="padding: 12px 24px; font-size: 16px;">
                                Process Return
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            dueTodaySection.style.display = 'none';
        }

        // Populate dropdown for other bookings
        const select = document.getElementById('return-booking-select');
        select.innerHTML = '<option value="">Select Booking</option>';

        others.forEach(booking => {
            const option = document.createElement('option');
            option.value = booking.booking_id;
            const isOverdue = new Date(booking.rental_end_date) < new Date();
            option.textContent = `${booking.booking_number} - ${booking.customer_name} (Return: ${formatDate(booking.rental_end_date)})${isOverdue ? ' - OVERDUE' : ''}`;
            if (isOverdue) option.style.color = 'red';
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

async function showReturnDetails(bookingId) {
    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}`);
        const booking = await response.json();

        const isOverdue = new Date(booking.rental_end_date) < new Date();

        const detailsDiv = document.getElementById('return-details');
        detailsDiv.innerHTML = `
            <div class="booking-details">
                ${isOverdue ? '<div class="alert alert-danger">⚠️ This booking is OVERDUE!</div>' : ''}

                <h3>Booking Details</h3>
                <p><strong>Booking Number:</strong> ${booking.booking_number}</p>
                <p><strong>Customer:</strong> ${booking.customer_name} (${booking.phone_number})</p>
                <p><strong>Return Date:</strong> ${formatDate(booking.rental_end_date)}</p>
                <p><strong>Picked up at:</strong> ${formatDateTime(booking.pickup_date)}</p>

                <h4>Items to Return:</h4>
                <div id="return-items-list">
                    ${booking.items.map(item => `
                        <div class="item-card">
                            <h4>${item.product_name}</h4>
                            <p>Quantity: ${item.quantity}</p>
                            <p>Select action for this item:</p>
                            <div class="item-actions">
                                <button type="button" class="btn-success" onclick="setItemAction(${item.product_id}, 'return')">Return to Inventory</button>
                                <button type="button" class="btn-primary" onclick="setItemAction(${item.product_id}, 'washing')">Send to Washing</button>
                                <button type="button" class="btn-danger" onclick="setItemAction(${item.product_id}, 'damaged')">Mark as Damaged</button>
                            </div>
                            <div id="action-${item.product_id}" style="margin-top: 10px;"></div>
                        </div>
                    `).join('')}
                </div>

                <button type="button" class="btn-success" onclick="confirmReturn(${bookingId})">Complete Return</button>
            </div>
        `;
    } catch (error) {
        console.error('Error loading booking details:', error);
    }
}

const itemActions = {};

function setItemAction(productId, action) {
    itemActions[productId] = { action };

    const actionDiv = document.getElementById(`action-${productId}`);

    if (action === 'damaged') {
        actionDiv.innerHTML = `
            <div class="form-group">
                <label>Damage Details:</label>
                <textarea id="damage-details-${productId}" rows="3" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;"></textarea>
            </div>
        `;
    } else {
        actionDiv.innerHTML = `<div class="alert alert-success">Action set: ${action}</div>`;
    }
}

async function confirmReturn(bookingId) {
    const response = await fetch(`${API_URL}/bookings/${bookingId}`);
    const booking = await response.json();

    for (const item of booking.items) {
        if (!itemActions[item.product_id]) {
            alert('Please select an action for all items');
            return;
        }

        if (itemActions[item.product_id].action === 'damaged') {
            const damageDetails = document.getElementById(`damage-details-${item.product_id}`).value;
            itemActions[item.product_id].damage_details = damageDetails;
        }
    }

    if (!confirm('Confirm return? This will update inventory.')) return;

    try {
        const response = await fetch(`${API_URL}/bookings/${bookingId}/return`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items_action: Object.keys(itemActions).map(productId => ({
                    product_id: parseInt(productId),
                    action: itemActions[productId].action,
                    damage_details: itemActions[productId].damage_details
                }))
            })
        });

        if (response.ok) {
            alert('Return completed successfully!');
            loadReturnBookings();
            document.getElementById('return-details').innerHTML = '';
            Object.keys(itemActions).forEach(key => delete itemActions[key]);
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error completing return: ' + error.message);
    }
}

async function loadSaleProducts() {
    const select = document.getElementById('sale-product-select');
    select.innerHTML = '<option value="">Select Product</option>';

    products.filter(p => p.status === 'Available' && p.quantity_available > 0).forEach(product => {
        const option = document.createElement('option');
        option.value = product.product_id;
        option.dataset.price = product.sale_price;
        option.textContent = `${product.product_name} (Available: ${product.quantity_available})`;
        select.appendChild(option);
    });
}

function updateSalePrice() {
    const select = document.getElementById('sale-product-select');
    const priceInput = document.getElementById('sale-price');

    if (select.value) {
        const selectedOption = select.options[select.selectedIndex];
        priceInput.value = selectedOption.dataset.price;
        calculateSaleTotal();
    }
}

function calculateSaleTotal() {
    const quantity = document.getElementById('sale-quantity').value;
    const price = document.getElementById('sale-price').value;

    if (quantity && price) {
        document.getElementById('sale-total').value = (quantity * price).toFixed(2);
    }
}

async function handleSaleSubmit(e) {
    e.preventDefault();

    const productId = document.getElementById('sale-product-select').value;
    const quantity = document.getElementById('sale-quantity').value;
    const salePrice = document.getElementById('sale-price').value;
    const customerId = document.getElementById('sale-customer-select').value || null;
    const employeeId = document.getElementById('sale-employee-select').value;

    if (!confirm('Confirm sale? This will reduce inventory permanently.')) return;

    try {
        const response = await fetch(`${API_URL}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_id: productId,
                quantity: parseInt(quantity),
                sale_price: parseFloat(salePrice),
                customer_id: customerId,
                employee_id: employeeId
            })
        });

        if (response.ok) {
            alert('Sale completed successfully!');
            document.getElementById('sale-form').reset();
            await loadProducts();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error completing sale: ' + error.message);
    }
}

async function loadProductsTable() {
    await loadProducts();

    const container = document.getElementById('products-table');
    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Total Qty</th>
                    <th>Available</th>
                    <th>Rented</th>
                    <th>Washing</th>
                    <th>Damaged</th>
                    <th>Rental Price</th>
                    <th>Sale Price</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td>${p.product_name}</td>
                        <td>${p.total_quantity}</td>
                        <td>${p.quantity_available || 0}</td>
                        <td>${p.quantity_rented || 0}</td>
                        <td>${p.quantity_washing || 0}</td>
                        <td>${p.quantity_damaged || 0}</td>
                        <td>₹${p.rental_price}</td>
                        <td>₹${p.sale_price}</td>
                        <td>${p.status}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function showAddProduct() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Add New Product</h2>
        <form id="add-product-form">
            <div class="form-group">
                <label>Product Name</label>
                <input type="text" id="new-product-name" required>
            </div>
            <div class="form-group">
                <label>Barcode (Optional)</label>
                <input type="text" id="new-product-barcode">
            </div>
            <div class="form-group">
                <label>Total Quantity</label>
                <input type="number" id="new-product-quantity" min="0" required>
            </div>
            <div class="form-group">
                <label>Rental Price (per day)</label>
                <input type="number" id="new-product-rental-price" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label>Sale Price</label>
                <input type="number" id="new-product-sale-price" step="0.01" min="0" required>
            </div>
            <div class="form-group">
                <label>Storage Location</label>
                <select id="new-product-location">
                    <option value="">Select Location</option>
                    ${locations.map(l => `<option value="${l.location_id}">${l.location_name}</option>`).join('')}
                </select>
            </div>
            <button type="submit" class="btn-primary">Add Product</button>
        </form>
    `;

    document.getElementById('add-product-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_name: document.getElementById('new-product-name').value,
                    barcode: document.getElementById('new-product-barcode').value || null,
                    total_quantity: parseInt(document.getElementById('new-product-quantity').value),
                    rental_price: parseFloat(document.getElementById('new-product-rental-price').value),
                    sale_price: parseFloat(document.getElementById('new-product-sale-price').value),
                    storage_location_id: document.getElementById('new-product-location').value || null
                })
            });

            if (response.ok) {
                await loadProducts();
                closeModal();
                alert('Product added successfully!');
                loadProductsTable();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to add product'));
            }
        } catch (error) {
            alert('Error adding product: ' + error.message);
        }
    });

    document.getElementById('modal').style.display = 'block';
}

async function loadWashingList() {
    try {
        const response = await fetch(`${API_URL}/washing`);
        const washing = await response.json();

        const container = document.getElementById('washing-list');

        if (washing.length === 0) {
            container.innerHTML = '<p>No items in washing</p>';
            return;
        }

        container.innerHTML = washing.map(item => `
            <div class="item-card ${item.days_in_washing > 3 ? 'alert-danger' : ''}">
                <h4>${item.product_name}</h4>
                <p>Quantity: ${item.quantity}</p>
                <p>Date Sent: ${new Date(item.date_sent).toLocaleDateString()}</p>
                <p>Days in Washing: ${item.days_in_washing}</p>
                ${item.days_in_washing > 3 ? '<p class="alert alert-danger">⚠️ Item has been in washing for more than 3 days!</p>' : ''}
                <button class="btn-success" onclick="returnFromWashing(${item.washing_id})">Mark as Returned</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading washing list:', error);
    }
}

async function returnFromWashing(washingId) {
    if (!confirm('Mark this item as returned from washing?')) return;

    try {
        const response = await fetch(`${API_URL}/washing/${washingId}/return`, {
            method: 'PUT'
        });

        if (response.ok) {
            alert('Item returned from washing successfully!');
            loadWashingList();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadDamageList() {
    try {
        const response = await fetch(`${API_URL}/damage`);
        const damaged = await response.json();

        const container = document.getElementById('damage-list');

        if (damaged.length === 0) {
            container.innerHTML = '<p>No damaged items</p>';
            return;
        }

        container.innerHTML = damaged.map(item => `
            <div class="item-card">
                <h4>${item.product_name}</h4>
                <p>Quantity: ${item.quantity}</p>
                <p>Date Damaged: ${new Date(item.date_damaged).toLocaleDateString()}</p>
                <p>Details: ${item.damage_details || 'No details provided'}</p>
                <button class="btn-success" onclick="repairDamaged(${item.damage_id})">Mark as Repaired</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading damage list:', error);
    }
}

async function repairDamaged(damageId) {
    if (!confirm('Mark this item as repaired?')) return;

    try {
        const response = await fetch(`${API_URL}/damage/${damageId}/repair`, {
            method: 'PUT'
        });

        if (response.ok) {
            alert('Item marked as repaired successfully!');
            loadDamageList();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function loadRevenue() {
    const type = document.getElementById('revenue-type').value;
    const date = document.getElementById('revenue-date').value;

    try {
        let url = `${API_URL}/revenue/${type}`;
        if (type === 'daily') {
            url += `?date=${date}`;
        } else {
            const d = new Date(date);
            url += `?year=${d.getFullYear()}&month=${d.getMonth() + 1}`;
        }

        const response = await fetch(url);
        const revenue = await response.json();

        const container = document.getElementById('revenue-report');

        if (type === 'daily') {
            container.innerHTML = `
                <div class="revenue-summary">
                    <h3>Revenue for ${revenue.date}</h3>
                    ${revenue.breakdown.map(item => `
                        <div class="revenue-item">
                            <span>${item.revenue_type.replace('_', ' ')} (${item.transaction_count} transactions)</span>
                            <span>₹${item.total_amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="revenue-total">Total: ₹${revenue.total.toFixed(2)}</div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="revenue-summary">
                    <h3>Revenue for ${revenue.month}/${revenue.year}</h3>
                    ${revenue.breakdown.map(item => `
                        <div class="revenue-item">
                            <span>${item.revenue_type.replace('_', ' ')} (${item.transaction_count} transactions)</span>
                            <span>₹${item.total_amount.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="revenue-total">Total: ₹${revenue.total.toFixed(2)}</div>

                    <h4 style="margin-top: 20px;">Daily Breakdown</h4>
                    ${revenue.daily_breakdown.map(day => `
                        <div class="revenue-item">
                            <span>${day.log_date}</span>
                            <span>₹${day.daily_total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading revenue:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadInitialData();
    setupEventListeners();
    loadDashboard();
});

async function loadInitialData() {
    try {
        await Promise.all([
            loadCustomers(),
            loadEmployees(),
            loadProducts(),
            loadLocations()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        alert('Error loading data. Please refresh the page.');
    }
}

async function loadCustomers() {
    const response = await fetch(`${API_URL}/customers`);
    customers = await response.json();
    updateCustomerDropdowns();
}

async function loadEmployees() {
    const response = await fetch(`${API_URL}/employees`);
    employees = await response.json();
    updateEmployeeDropdowns();
}

async function loadProducts() {
    const response = await fetch(`${API_URL}/products`);
    products = await response.json();
}

async function loadLocations() {
    const response = await fetch(`${API_URL}/locations`);
    locations = await response.json();
}

function updateCustomerDropdowns() {
    const selects = document.querySelectorAll('#customer-select, #sale-customer-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.customer_id;
            option.textContent = `${customer.customer_name} - ${customer.phone_number}`;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
}

function updateEmployeeDropdowns() {
    const selects = document.querySelectorAll('#employee-select, #sale-employee-select');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Employee</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.employee_id;
            option.textContent = employee.employee_name;
            select.appendChild(option);
        });
        if (currentValue) select.value = currentValue;
    });
}

function setupEventListeners() {
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
    document.getElementById('sale-form').addEventListener('submit', handleSaleSubmit);

    document.getElementById('sale-quantity').addEventListener('input', calculateSaleTotal);
    document.getElementById('sale-price').addEventListener('input', calculateSaleTotal);

    document.getElementById('barcode-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchByBarcode();
        }
    });

    // Recheck availability when dates change
    document.getElementById('rental-start-date').addEventListener('change', recheckAllProductAvailability);
    document.getElementById('rental-end-date').addEventListener('change', recheckAllProductAvailability);

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('rental-start-date').value = today;
    document.getElementById('rental-end-date').value = today;
    document.getElementById('revenue-date').value = today;
}

function recheckAllProductAvailability() {
    const rows = document.querySelectorAll('.product-row');
    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        if (select && select.value) {
            updateProductRow(select);
        }
    });
}

function showSection(sectionId, event) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(sectionId).classList.add('active');
    if (event && event.target) {
        event.target.classList.add('active');
    }

    if (sectionId === 'dashboard') loadDashboard();
    else if (sectionId === 'booking') generateBookingNumber();
    else if (sectionId === 'pickup') loadPickupBookings();
    else if (sectionId === 'return') loadReturnBookings();
    else if (sectionId === 'sale') loadSaleProducts();
    else if (sectionId === 'products') loadProductsTable();
    else if (sectionId === 'washing') loadWashingList();
    else if (sectionId === 'damage') loadDamageList();
    else if (sectionId === 'revenue') loadRevenue();
}

function generateBookingNumber() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const bookingNumberField = document.getElementById('booking-number');
    bookingNumberField.value = `BK-${dateStr}-...`;
    bookingNumberField.placeholder = 'Will be auto-generated on save';
}

async function loadDashboard() {
    try {
        const [dueToday, washingAlerts, todayRevenue] = await Promise.all([
            fetch(`${API_URL}/bookings/due-today`).then(r => r.json()),
            fetch(`${API_URL}/washing/alerts`).then(r => r.json()),
            fetch(`${API_URL}/revenue/daily`).then(r => r.json())
        ]);
        
        const dueList = document.getElementById('due-today-list');
        if (dueToday.length === 0) {
            dueList.innerHTML = '<p>No returns due today</p>';
        } else {
            dueList.innerHTML = dueToday.map(booking => `
                <div class="alert alert-warning">
                    <strong>${booking.booking_number}</strong><br>
                    Customer: ${booking.customer_name}<br>
                    Phone: ${booking.phone_number}
                </div>
            `).join('');
        }
        
        const alertsList = document.getElementById('washing-alerts');
        if (washingAlerts.length === 0) {
            alertsList.innerHTML = '<p>No washing alerts</p>';
        } else {
            alertsList.innerHTML = washingAlerts.map(item => `
                <div class="alert alert-danger">
                    <strong>${item.product_name}</strong><br>
                    In washing for ${item.days_in_washing} days<br>
                    Quantity: ${item.quantity}
                </div>
            `).join('');
        }
        
        const revenueDiv = document.getElementById('today-revenue');
        revenueDiv.innerHTML = `
            <div class="revenue-summary">
                <div class="revenue-total">₹${todayRevenue.total.toFixed(2)}</div>
                ${todayRevenue.breakdown.map(item => `
                    <div class="revenue-item">
                        <span>${item.revenue_type.replace('_', ' ')}</span>
                        <span>₹${item.total_amount.toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function showAddCustomer() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Add New Customer</h2>
        <form id="add-customer-form">
            <div class="form-group">
                <label>Customer Name</label>
                <input type="text" id="new-customer-name" required>
            </div>
            <div class="form-group">
                <label>Phone Number</label>
                <input type="text" id="new-customer-phone" required>
            </div>
            <div class="form-group">
                <label>Email (Optional)</label>
                <input type="email" id="new-customer-email">
            </div>
            <div class="form-group">
                <label>ID Proof (Optional)</label>
                <input type="text" id="new-customer-id">
            </div>
            <button type="submit" class="btn-primary">Add Customer</button>
        </form>
    `;

    document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customer_name: document.getElementById('new-customer-name').value,
                    phone_number: document.getElementById('new-customer-phone').value,
                    email: document.getElementById('new-customer-email').value,
                    id_proof: document.getElementById('new-customer-id').value
                })
            });

            if (response.ok) {
                const newCustomer = await response.json();
                await loadCustomers();
                closeModal();
                document.getElementById('customer-select').value = newCustomer.customer_id;
                alert('Customer added successfully!');
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to add customer'));
            }
        } catch (error) {
            alert('Error adding customer: ' + error.message);
        }
    });

    document.getElementById('modal').style.display = 'block';
}

function showAddEmployee() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>Add New Employee</h2>
        <form id="add-employee-form">
            <div class="form-group">
                <label>Employee Name</label>
                <input type="text" id="new-employee-name" required>
            </div>
            <button type="submit" class="btn-primary">Add Employee</button>
        </form>
    `;

    document.getElementById('add-employee-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_URL}/employees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employee_name: document.getElementById('new-employee-name').value
                })
            });

            if (response.ok) {
                const newEmployee = await response.json();
                await loadEmployees();
                closeModal();
                document.getElementById('employee-select').value = newEmployee.employee_id;
                alert('Employee added successfully!');
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Failed to add employee'));
            }
        } catch (error) {
            alert('Error adding employee: ' + error.message);
        }
    });

    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

function addProductRow() {
    const container = document.getElementById('products-list');
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
        <select class="product-select" onchange="updateProductRow(this)" required>
            <option value="">Select Product</option>
            ${products.filter(p => p.status === 'Available' && p.quantity_available > 0).map(p => 
                `<option value="${p.product_id}" data-price="${p.rental_price}">${p.product_name} (Available: ${p.quantity_available})</option>`
            ).join('')}
        </select>
        <input type="number" class="product-quantity" placeholder="Quantity" min="1" required onchange="updateProductRow(this)">
        <input type="number" class="product-price" placeholder="Price/Day" step="0.01" min="0" required onchange="updateProductRow(this)">
        <input type="number" class="product-total" placeholder="Total" readonly>
        <button type="button" class="btn-danger" onclick="removeProductRow(this)">Remove</button>
    `;
    container.appendChild(row);
}

async function searchByBarcode() {
    const barcodeInput = document.getElementById('barcode-input');
    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        alert('Please enter or scan a barcode');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/products/barcode/${barcode}`);

        if (response.ok) {
            const product = await response.json();

            if (product.quantity_available <= 0) {
                alert('Product is not available in stock');
                return;
            }

            const container = document.getElementById('products-list');
            const row = document.createElement('div');
            row.className = 'product-row';
            row.innerHTML = `
                <select class="product-select" onchange="updateProductRow(this)" required>
                    <option value="${product.product_id}" data-price="${product.rental_price}" selected>${product.product_name} (Available: ${product.quantity_available})</option>
                </select>
                <input type="number" class="product-quantity" placeholder="Quantity" min="1" max="${product.quantity_available}" value="1" required onchange="updateProductRow(this)">
                <input type="number" class="product-price" placeholder="Price/Day" step="0.01" min="0" value="${product.rental_price}" required onchange="updateProductRow(this)">
                <input type="number" class="product-total" placeholder="Total" readonly>
                <button type="button" class="btn-danger" onclick="removeProductRow(this)">Remove</button>
            `;
            container.appendChild(row);

            updateProductRow(row.querySelector('.product-select'));

            barcodeInput.value = '';
            barcodeInput.focus();

            alert(`Added: ${product.product_name}`);
        } else {
            alert('Product not found with this barcode');
        }
    } catch (error) {
        alert('Error searching product: ' + error.message);
    }
}

function removeProductRow(button) {
    button.parentElement.remove();
    updateBookingSummary();
}

async function updateProductRow(element) {
    const row = element.closest('.product-row');
    const select = row.querySelector('.product-select');
    const quantityInput = row.querySelector('.product-quantity');
    const priceInput = row.querySelector('.product-price');
    const totalInput = row.querySelector('.product-total');

    // Remove any existing availability message
    const existingMsg = row.querySelector('.availability-message');
    if (existingMsg) existingMsg.remove();

    // Update price when product is selected or changed
    if (select.value && element === select) {
        const selectedOption = select.options[select.selectedIndex];
        priceInput.value = selectedOption.dataset.price;
    } else if (select.value && !priceInput.value) {
        const selectedOption = select.options[select.selectedIndex];
        priceInput.value = selectedOption.dataset.price;
    }

    // Check availability when product and quantity are selected
    if (select.value && quantityInput.value) {
        const startDate = document.getElementById('rental-start-date').value;
        const endDate = document.getElementById('rental-end-date').value;

        if (startDate && endDate) {
            try {
                const response = await fetch(
                    `${API_URL}/inventory/check-availability?product_id=${select.value}&quantity=${quantityInput.value}&start_date=${startDate}&end_date=${endDate}`
                );
                const availability = await response.json();

                // Create availability message element
                const msgDiv = document.createElement('div');
                msgDiv.className = 'availability-message';
                msgDiv.style.gridColumn = '1 / -1';
                msgDiv.style.padding = '8px';
                msgDiv.style.borderRadius = '4px';
                msgDiv.style.fontSize = '14px';
                msgDiv.style.marginTop = '-10px';

                if (!availability.available) {
                    msgDiv.style.backgroundColor = '#fee';
                    msgDiv.style.color = '#c00';
                    msgDiv.style.border = '1px solid #fcc';
                    msgDiv.innerHTML = `⚠️ ${availability.message || 'Product not available for selected dates'}`;
                    row.style.opacity = '0.6';
                } else if (availability.available_quantity < quantityInput.value) {
                    msgDiv.style.backgroundColor = '#ffc';
                    msgDiv.style.color = '#880';
                    msgDiv.style.border = '1px solid #ffb';
                    msgDiv.innerHTML = `⚠️ Only ${availability.available_quantity} units available for selected dates`;
                    row.style.opacity = '0.8';
                } else {
                    msgDiv.style.backgroundColor = '#efe';
                    msgDiv.style.color = '#060';
                    msgDiv.style.border = '1px solid #cfc';
                    msgDiv.innerHTML = `✓ Available (${availability.available_quantity} units)`;
                    row.style.opacity = '1';
                }

                row.appendChild(msgDiv);
            } catch (error) {
                console.error('Error checking availability:', error);
            }
        }
    }

    if (select.value && quantityInput.value && priceInput.value) {
        const startDate = new Date(document.getElementById('rental-start-date').value);
        const endDate = new Date(document.getElementById('rental-end-date').value);
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        const total = quantityInput.value * priceInput.value * days;
        totalInput.value = total.toFixed(2);

        updateBookingSummary();
    }
}

function updateBookingSummary() {
    const rows = document.querySelectorAll('.product-row');
    const summaryDiv = document.getElementById('booking-items-summary');
    let totalAmount = 0;
    
    summaryDiv.innerHTML = '';
    
    rows.forEach(row => {
        const select = row.querySelector('.product-select');
        const quantity = row.querySelector('.product-quantity').value;
        const price = row.querySelector('.product-price').value;
        const total = row.querySelector('.product-total').value;
        
        if (select.value && quantity && price && total) {
            const productName = select.options[select.selectedIndex].text.split(' (')[0];
            summaryDiv.innerHTML += `
                <div class="summary-item">
                    <span>${productName} x ${quantity} @ ₹${price}/day</span>
                    <span>₹${total}</span>
                </div>
            `;
            totalAmount += parseFloat(total);
        }
    });
    
    document.getElementById('total-amount').textContent = totalAmount.toFixed(2);
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    const customerId = document.getElementById('customer-select').value;
    const employeeId = document.getElementById('employee-select').value;
    const startDate = document.getElementById('rental-start-date').value;
    const endDate = document.getElementById('rental-end-date').value;
    const advanceAmount = document.getElementById('advance-amount').value;
    const paymentMethod = document.getElementById('advance-payment-method').value;

    const rows = document.querySelectorAll('.product-row');
    const items = [];

    for (const row of rows) {
        const select = row.querySelector('.product-select');
        const quantity = parseInt(row.querySelector('.product-quantity').value);
        const agreedPrice = parseFloat(row.querySelector('.product-price').value);
        const total = parseFloat(row.querySelector('.product-total').value);

        if (!select.value || !quantity || !agreedPrice) {
            alert('Please fill all product details');
            return;
        }

        const productId = select.value;
        const selectedOption = select.options[select.selectedIndex];
        const defaultPrice = parseFloat(selectedOption.dataset.price);

        const availabilityCheck = await fetch(
            `${API_URL}/inventory/check-availability?product_id=${productId}&quantity=${quantity}&start_date=${startDate}&end_date=${endDate}`
        );
        const availability = await availabilityCheck.json();

        if (!availability.available) {
            alert(availability.message || 'Product not available for selected dates');
            return;
        }

        const days = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

        items.push({
            product_id: productId,
            quantity: quantity,
            rental_duration_days: days,
            default_rental_price: defaultPrice,
            agreed_rental_price: agreedPrice,
            item_total_amount: total
        });
    }

    if (items.length === 0) {
        alert('Please add at least one product');
        return;
    }

    if (!confirm('Confirm booking?')) return;

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customer_id: customerId,
                employee_id: employeeId,
                rental_start_date: startDate,
                rental_end_date: endDate,
                items: items,
                advance_amount: advanceAmount || 0,
                advance_payment_method: paymentMethod
            })
        });

        if (response.ok) {
            alert('Booking created successfully!');
            document.getElementById('booking-form').reset();
            document.getElementById('products-list').innerHTML = '';
            document.getElementById('booking-items-summary').innerHTML = '';
            document.getElementById('total-amount').textContent = '0.00';
            generateBookingNumber();
        } else {
            const error = await response.json();
            alert('Error: ' + error.error);
        }
    } catch (error) {
        alert('Error creating booking: ' + error.message);
    }
}
