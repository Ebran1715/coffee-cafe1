document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const menuContainer = document.getElementById('menu-container');
    const orderForm = document.getElementById('order-form');
    const itemsContainer = document.getElementById('items-container');
    const orderItems = document.getElementById('order-items');
    const totalPriceElement = document.getElementById('total-price');
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const pickupTimeSelect = document.getElementById('pickup-time');
    const customTimeGroup = document.getElementById('custom-time-group');
    const customTimeInput = document.getElementById('custom-time');
    
    // State
    let menuData = [];
    let cart = [];
    
    // Initialize
    loadMenu();
    setupEventListeners();
    
    // Setup event listeners
    function setupEventListeners() {
        // Mobile menu toggle
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
            }
        });
        
        // Pickup time selection
        pickupTimeSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customTimeGroup.style.display = 'block';
                customTimeInput.required = true;
            } else {
                customTimeGroup.style.display = 'none';
                customTimeInput.required = false;
            }
        });
    }
    
    // Load menu from API
    async function loadMenu() {
        try {
            const response = await fetch('/api/menu');
            const data = await response.json();
            menuData = data.categories;
            displayMenu();
            populateItemsCheckboxes();
        } catch (error) {
            console.error('Error loading menu:', error);
            // Fallback to default menu if API fails
            menuData = [
                {
                    id: 1,
                    name: "Coffee Specialties",
                    items: [
                        { id: 1, name: "Serados Special Blend", price: 220, description: "Our signature coffee blend" },
                        { id: 2, name: "Nepali Chiya", price: 80, description: "Traditional Nepali tea with milk" }
                    ]
                }
            ];
            displayMenu();
            populateItemsCheckboxes();
        }
    }
    
    // Display menu
    function displayMenu() {
        menuContainer.innerHTML = '';
        
        if (menuData.length === 0) {
            menuContainer.innerHTML = '<p class="no-data">Menu loading...</p>';
            return;
        }
        
        menuData.forEach(category => {
            const categoryElement = document.createElement('div');
            categoryElement.className = 'category';
            
            let itemsHTML = '';
            category.items.forEach(item => {
                itemsHTML += `
                    <div class="menu-item">
                        <div class="menu-item-header">
                            <h4>${item.name}</h4>
                            <span class="price">रु ${item.price.toFixed(2)}</span>
                        </div>
                        <p>${item.description}</p>
                    </div>
                `;
            });
            
            categoryElement.innerHTML = `
                <h3>${category.name}</h3>
                ${itemsHTML}
            `;
            
            menuContainer.appendChild(categoryElement);
        });
    }
    
    // Populate items checkboxes
    function populateItemsCheckboxes() {
        itemsContainer.innerHTML = '';
        
        if (menuData.length === 0) {
            itemsContainer.innerHTML = '<p class="no-data">Loading items...</p>';
            return;
        }
        
        menuData.forEach(category => {
            // Add category heading
            const categoryHeading = document.createElement('div');
            categoryHeading.className = 'category-heading';
            categoryHeading.innerHTML = `<h4>${category.name}</h4>`;
            itemsContainer.appendChild(categoryHeading);
            
            // Add items
            category.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'item-checkbox';
                itemDiv.innerHTML = `
                    <label>
                        <input type="checkbox" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}">
                        ${item.name} - रु ${item.price.toFixed(2)}
                    </label>
                    <div class="quantity-controls">
                        <button type="button" class="quantity-btn minus" data-id="${item.id}">-</button>
                        <span class="quantity" data-id="${item.id}">0</span>
                        <button type="button" class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                `;
                itemsContainer.appendChild(itemDiv);
            });
        });
        
        // Add event listeners for quantity buttons
        document.querySelectorAll('.quantity-btn').forEach(button => {
            button.addEventListener('click', handleQuantityChange);
        });
        
        // Add event listeners for checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    }
    
    // Handle quantity changes
    function handleQuantityChange(e) {
        const button = e.target;
        const itemId = parseInt(button.dataset.id);
        const isPlus = button.classList.contains('plus');
        const quantitySpan = document.querySelector(`.quantity[data-id="${itemId}"]`);
        const checkbox = document.querySelector(`input[data-id="${itemId}"]`);
        
        let currentQuantity = parseInt(quantitySpan.textContent);
        
        if (isPlus) {
            currentQuantity++;
            if (!checkbox.checked) {
                checkbox.checked = true;
                addToCart(itemId, 1);
            }
        } else {
            currentQuantity = Math.max(0, currentQuantity - 1);
            if (currentQuantity === 0) {
                checkbox.checked = false;
            }
        }
        
        quantitySpan.textContent = currentQuantity;
        
        // Update cart
        const existingItem = cart.find(item => item.id === itemId);
        if (existingItem) {
            existingItem.quantity = currentQuantity;
            if (currentQuantity === 0) {
                cart = cart.filter(item => item.id !== itemId);
            }
        }
        
        updateOrderSummary();
    }
    
    // Handle checkbox changes
    function handleCheckboxChange(e) {
        const checkbox = e.target;
        const itemId = parseInt(checkbox.dataset.id);
        const quantitySpan = document.querySelector(`.quantity[data-id="${itemId}"]`);
        
        if (checkbox.checked) {
            quantitySpan.textContent = '1';
            addToCart(itemId, 1);
        } else {
            quantitySpan.textContent = '0';
            cart = cart.filter(item => item.id !== itemId);
        }
        
        updateOrderSummary();
    }
    
    // Add item to cart
    function addToCart(itemId, quantity) {
        // Find item in menu
        let item = null;
        for (const category of menuData) {
            const foundItem = category.items.find(i => i.id === itemId);
            if (foundItem) {
                item = foundItem;
                break;
            }
        }
        
        if (!item) return;
        
        const existingItem = cart.find(cartItem => cartItem.id === itemId);
        
        if (existingItem) {
            existingItem.quantity = quantity;
        } else {
            cart.push({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: quantity
            });
        }
    }
    
    // Update order summary
    function updateOrderSummary() {
        orderItems.innerHTML = '';
        
        let total = 0;
        
        if (cart.length === 0) {
            orderItems.innerHTML = '<p class="empty-cart">No items added yet</p>';
            totalPriceElement.textContent = '0.00';
            return;
        }
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'order-item';
            itemDiv.innerHTML = `
                <span>${item.name} x ${item.quantity}</span>
                <span>रु ${itemTotal.toFixed(2)}</span>
            `;
            orderItems.appendChild(itemDiv);
        });
        
        totalPriceElement.textContent = total.toFixed(2);
    }
    
    // Handle form submission - ONLY ONE HANDLER
    orderForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('📦 Form submission started...');
        
        if (cart.length === 0) {
            alert('Please add items to your order.');
            return;
        }
        
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const city = document.getElementById('city').value;
        const location = document.getElementById('location').value;
        const pickupTime = pickupTimeSelect.value;
        const customTime = pickupTime === 'custom' ? customTimeInput.value : '';
        
        if (!name || !phone || !city || !location || !pickupTime) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (pickupTime === 'custom' && !customTime) {
            alert('Please enter custom pickup time.');
            return;
        }
        
        const orderData = {
            name: name,
            phone: phone,
            city: city,
            location: location,
            pickupTime: pickupTime === 'custom' ? customTime : `${pickupTime} minutes from now`,
            items: cart,
            total: parseFloat(totalPriceElement.textContent)
        };
        
        console.log('📤 Sending order data:', orderData);
        
        // Show loading state
        const submitBtn = orderForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Processing...';
        submitBtn.disabled = true;
        
        try {
            console.log('🌐 Calling API: /api/order');
            const response = await fetch('/api/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });
            
            console.log('📥 API Response status:', response.status);
            
            const result = await response.json();
            console.log('📥 API Response data:', result);
            
            if (result.success) {
                // Show success message
                alert(`✅ Order placed successfully!\n\nOrder ID: ${result.orderId}\nCity: ${city}\nTotal: रु ${orderData.total.toFixed(2)}\n\nWe will call you at ${phone} for confirmation.`);
                
                // Reset form
                orderForm.reset();
                customTimeGroup.style.display = 'none';
                cart = [];
                updateOrderSummary();
                
                // Reset quantities
                document.querySelectorAll('.quantity').forEach(span => {
                    span.textContent = '0';
                });
                document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.checked = false;
                });
            } else {
                alert(`❌ Failed to place order: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error placing order:', error);
            alert('❌ Error placing order. Please try again or call us directly.');
        } finally {
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
                
                // Close mobile menu if open
                navLinks.classList.remove('active');
            }
        });
    });
    
    // =============================================
    // SINGLE ADMIN BUTTON (PASSWORD PROTECTED)
    // =============================================
    
    // Create a single admin button (shown only on localhost)
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname.includes('192.168')) {
        
        // Wait a bit for page to load
        setTimeout(() => {
            const adminBtn = document.createElement('button');
            adminBtn.id = 'single-admin-btn';
            adminBtn.innerHTML = '🛡️ Admin';
            adminBtn.title = 'Admin Dashboard - Password Protected';
            
            // Style the button
            adminBtn.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #2e8b57, #32cd32);
                color: white;
                border: none;
                padding: 12px 20px;
                border-radius: 50px;
                cursor: pointer;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(46, 139, 87, 0.4);
                font-weight: bold;
                font-size: 14px;
                transition: all 0.3s ease;
                border: 2px solid white;
            `;
            
            // Add hover effects
            adminBtn.addEventListener('mouseenter', () => {
                adminBtn.style.transform = 'scale(1.05)';
                adminBtn.style.boxShadow = '0 6px 16px rgba(46, 139, 87, 0.6)';
            });
            
            adminBtn.addEventListener('mouseleave', () => {
                adminBtn.style.transform = 'scale(1)';
                adminBtn.style.boxShadow = '0 4px 12px rgba(46, 139, 87, 0.4)';
            });
            
            // Click handler - Ask for password
            adminBtn.addEventListener('click', () => {
                const password = prompt('🔐 Enter Admin Password:');
                
                if (password === 'serados123') {
                    // Correct password - open admin page
                    window.open('/admin-dashboard.html', '_blank');
                } else if (password !== null) {
                    // Wrong password (but user didn't cancel)
                    alert('❌ Incorrect password!');
                }
            });
            
            // Add button to page
            document.body.appendChild(adminBtn);
        }, 1000);
    }
    
    // Add some style for no data
    const style = document.createElement('style');
    style.textContent = `
        .no-data, .empty-cart {
            text-align: center;
            padding: 2rem;
            color: #666;
            font-style: italic;
        }
        .category-heading {
            margin: 1rem 0 0.5rem;
            padding: 0.5rem;
            background-color: var(--light-color);
            border-radius: 5px;
            color: var(--primary-color);
            font-weight: bold;
        }
        .category-heading h4 {
            margin: 0;
        }
        
        /* Admin button animation */
        @keyframes adminPulse {
            0% { box-shadow: 0 0 0 0 rgba(46, 139, 87, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(46, 139, 87, 0); }
            100% { box-shadow: 0 0 0 0 rgba(46, 139, 87, 0); }
        }
        
        #single-admin-btn {
            animation: adminPulse 2s infinite;
        }
    `;
    document.head.appendChild(style);
});




// Add this to your main website to create a tracking link
function addTrackingLink() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const trackingLink = document.createElement('a');
        trackingLink.href = '/track-order';
        trackingLink.textContent = 'Track Order';
        trackingLink.className = 'nav-link';
        navLinks.appendChild(trackingLink);
    }
}

// Also add a tracking button in the order confirmation message
// Modify your order success alert in the main JavaScript file:

// After line: alert(`✅ Order placed successfully!...`);
// Add:
alert(`✅ Order placed successfully!\n\nOrder ID: ${result.orderId}\nCity: ${city}\nTotal: रु ${orderData.total.toFixed(2)}\n\nWe will call you at ${phone} for confirmation.\n\nTrack your order at: ${window.location.origin}/track-order`);

// And also add a tracking button after order submission:
function showOrderConfirmation(orderId) {
    // Your existing confirmation code...
    
    // Add tracking info
    const trackingHTML = `
        <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 8px;">
            <h4>Track Your Order</h4>
            <p>Use this order ID to track your order:</p>
            <div style="background: white; padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; font-size: 18px;">
                ${orderId}
            </div>
            <a href="/track-order" style="display: inline-block; background: #2e8b57; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none;">
                <i class="fas fa-search"></i> Track Order Now
            </a>
        </div>
    `;
    
    // Add this to your confirmation display
}
// Replace your existing alert with:
const confirmationHTML = `
    <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2e8b57; text-align: center;">✅ Order Placed Successfully!</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${result.orderId}</p>
            <p><strong>Customer:</strong> ${name}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Total:</strong> रु ${orderData.total.toFixed(2)}</p>
            <p><strong>Pickup:</strong> ${orderData.pickupTime}</p>
        </div>
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
            <h3>Track Your Order</h3>
            <p>Use your Order ID to track real-time status:</p>
            <div style="background: white; padding: 10px; margin: 10px 0; font-family: monospace; font-size: 18px;">
                ${result.orderId}
            </div>
            <a href="/track-order" style="display: inline-block; background: #2e8b57; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                <i class="fas fa-search"></i> Track Order Status
            </a>
        </div>
    </div>
`;

// You can show this in a modal or custom alert
showCustomAlert(confirmationHTML);

// Add this function to your existing JavaScript code
function addTrackOrderButton() {
    // Add to navigation
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        // Check if button already exists
        if (!document.querySelector('.nav-track-btn')) {
            const trackLink = document.createElement('li');
            trackLink.innerHTML = `
                <a href="/track-order" class="nav-track-btn track-btn">
                    <i class="fas fa-search-location"></i> Track Your Order
                </a>
            `;
            navLinks.appendChild(trackLink);
        }
    }
    
    // Also add a floating button at bottom of page
    if (!document.querySelector('.floating-track-btn')) {
        const floatingBtn = document.createElement('a');
        floatingBtn.href = '/track-order';
        floatingBtn.className = 'floating-track-btn';
        floatingBtn.innerHTML = `
            <i class="fas fa-search-location"></i> Track Order
        `;
        floatingBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #2e8b57, #32cd32);
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            text-decoration: none;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(46, 139, 87, 0.4);
            z-index: 999;
            display: flex;
            align-items: center;
            gap: 8px;
            animation: pulse 2s infinite;
        `;
        document.body.appendChild(floatingBtn);
    }
}

// Call this function when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Your existing code...
    
    // Add track order button after a short delay
    setTimeout(addTrackOrderButton, 500);
    
    // Also add to mobile menu toggle if needed
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            // Re-add button if it was removed in mobile view
            setTimeout(addTrackOrderButton, 100);
        });
    }
});



// Updated trackOrder function
function trackOrder() {
    const phoneNumber = document.getElementById('orderIdInput').value.trim();
    const errorDiv = document.getElementById('errorMessage');
    const loadingDiv = document.getElementById('loadingSpinner');
    const detailsDiv = document.getElementById('orderDetails');
    
    // Reset
    errorDiv.style.display = 'none';
    detailsDiv.style.display = 'none';
    
    if (!phoneNumber) {
        showError('Please enter your phone number');
        return;
    }
    
    // Validate phone number (simple validation for Nepal)
    const phoneRegex = /^[9][8][0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
        showError('Please enter a valid 10-digit phone number starting with 98');
        return;
    }
    
    // Show loading
    loadingDiv.style.display = 'block';
    
    // Fetch orders by phone number
    fetch(`/api/track-orders-by-phone/${phoneNumber}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('No orders found');
            }
            return response.json();
        })
        .then(data => {
            loadingDiv.style.display = 'none';
            
            if (data.orders.length === 1) {
                // If only one order, display it directly
                displayOrderDetails(data.orders[0]);
            } else if (data.orders.length > 1) {
                // If multiple orders, show order selection
                displayOrderSelection(data);
            }
        })
        .catch(error => {
            loadingDiv.style.display = 'none';
            showError('No orders found for this phone number. Please check your phone number and try again.');
        });
}

// New function to display multiple orders for selection
function displayOrderSelection(data) {
    const detailsDiv = document.getElementById('orderDetails');
    
    let ordersHTML = '<div class="multiple-orders-section">';
    ordersHTML += `<h3>Found ${data.total_orders} orders for ${data.phone}</h3>`;
    ordersHTML += '<p>Select an order to view details:</p>';
    ordersHTML += '<div class="orders-list">';
    
    data.orders.forEach(order => {
        const orderDate = new Date(order.order_date);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        ordersHTML += `
            <div class="order-card" onclick="displayOrderDetails('${order.order_id}')">
                <div class="order-card-header">
                    <strong>Order ID: ${order.order_id}</strong>
                    <span class="status-badge ${order.status}">${order.status.toUpperCase()}</span>
                </div>
                <div class="order-card-body">
                    <p>Date: ${formattedDate}</p>
                    <p>Total: रु ${parseFloat(order.total_amount).toFixed(2)}</p>
                    <p>Items: ${order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
                </div>
                <div class="order-card-footer">
                    <button class="view-btn">View Details</button>
                </div>
            </div>
        `;
    });
    
    ordersHTML += '</div></div>';
    ordersHTML += `<button class="back-btn" onclick="resetForm()">
        <i class="fas fa-search"></i> Track Another Order
    </button>`;
    
    detailsDiv.innerHTML = ordersHTML;
    detailsDiv.style.display = 'block';
    detailsDiv.scrollIntoView({ behavior: 'smooth' });
}

// Modified displayOrderDetails to also accept order ID directly
function displayOrderDetails(orderOrId) {
    const detailsDiv = document.getElementById('orderDetails');
    const loadingDiv = document.getElementById('loadingSpinner');
    
    // If passed an order ID string, fetch the order
    if (typeof orderOrId === 'string') {
        loadingDiv.style.display = 'block';
        
        fetch(`/api/track-order-details/${orderOrId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Order not found');
                }
                return response.json();
            })
            .then(order => {
                loadingDiv.style.display = 'none';
                renderOrderDetails(order);
            })
            .catch(error => {
                loadingDiv.style.display = 'none';
                showError('Failed to load order details');
            });
    } else {
        // If passed an order object, render it directly
        renderOrderDetails(orderOrId);
    }
}

function renderOrderDetails(order) {
    // ... existing renderOrderDetails code ...
    // (The original displayOrderDetails function content)
}