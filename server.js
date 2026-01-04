const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 1003;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Menu data file
const MENU_FILE = path.join(__dirname, 'menu.json');

// MySQL Database Connection - UPDATE THESE CREDENTIALS
const db = mysql.createConnection({
    host: 'metro.proxy.rlwy.net',          // Usually localhost
    user: 'root',              // XAMPP default
    password: 'uazDtVvdcWuHoXNkvkNdUFiCoqYFCROE',              // XAMPP default is empty
    port:47619,                // Default MySQL port
    database: 'railway' // We'll create this
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Error connecting to MySQL:', err.message);
        console.log('Please check:');
        console.log('1. Is XAMPP MySQL running?');
        console.log('2. Port 3306 is free?');
        console.log('3. Username/password correct?');
        return;
    }
    console.log('✅ Connected to MySQL database');
    initializeDatabase();
});

// Create database and tables if they don't exist
function initializeDatabase() {
    // Create database
    db.query('CREATE DATABASE IF NOT EXISTS railway', (err) => {
        if (err) {
            console.error('Error creating database:', err);
            return;
        }
        
        console.log('✅ Database ready');
        
        // Use the database
        db.changeUser({ database: 'railway' }, (err) => {
            if (err) {
                console.error('Error switching database:', err);
                return;
            }
            
            // Create orders table
            const createOrdersTable = `
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    order_id VARCHAR(50) UNIQUE,
                    customer_name VARCHAR(100) NOT NULL,
                    phone VARCHAR(20) NOT NULL,
                    city VARCHAR(50) NOT NULL,
                    address TEXT NOT NULL,
                    pickup_time VARCHAR(50),
                    items TEXT NOT NULL,
                    total_amount DECIMAL(10, 2) NOT NULL,
                    status ENUM('received', 'preparing', 'ready', 'completed') DEFAULT 'received',
                    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;
            
            db.query(createOrdersTable, (err) => {
                if (err) {
                    console.error('❌ Error creating orders table:', err);
                } else {
                    console.log('✅ Orders table ready');
                }
            });
        });
    });
}

// Initialize menu data
const initializeMenu = async () => {
    try {
        await fs.access(MENU_FILE);
    } catch {
        const initialMenu = {
            categories: [
                {
                    id: 1,
                    name: "Coffee Specialties",
                    items: [
                        { id: 1, name: "Serados Special Blend", price: 220, description: "Our signature coffee blend" },
                        { id: 2, name: "Nepali Chiya", price: 80, description: "Traditional Nepali tea with milk" },
                        { id: 3, name: "Masala Chai", price: 100, description: "Spiced Indian tea" },
                        { id: 4, name: "Cold Brew Coffee", price: 180, description: "Smooth cold brewed coffee" }
                    ]
                },
                {
                    id: 2,
                    name: "Local Delights",
                    items: [
                        { id: 5, name: "Momo Platter", price: 320, description: "Steamed dumplings with dipping sauce" },
                        { id: 6, name: "Sel Roti", price: 120, description: "Traditional Nepali rice doughnut" },
                        { id: 7, name: "Sukuti Sandwich", price: 250, description: "Dried meat sandwich with local spices" }
                    ]
                },
                {
                    id: 3,
                    name: "Pastries & Snacks",
                    items: [
                        { id: 8, name: "Butter Croissant", price: 160, description: "Freshly baked French pastry" },
                        { id: 9, name: "Samosa", price: 80, description: "Fried pastry with potato filling" },
                        { id: 10, name: "Chocolate Muffin", price: 180, description: "Fresh baked chocolate muffin" }
                    ]
                },
                {
                    id: 4,
                    name: "Refreshments",
                    items: [
                        { id: 11, name: "Lassi", price: 160, description: "Traditional yogurt drink" },
                        { id: 12, name: "Fresh Lime Soda", price: 100, description: "Refreshing lime drink" },
                        { id: 13, name: "Iced Tea", price: 120, description: "Chilled tea with lemon" }
                    ]
                }
            ]
        };
        await fs.writeFile(MENU_FILE, JSON.stringify(initialMenu, null, 2));
    }
};

// Get all menu items
app.get('/api/menu', async (req, res) => {
    try {
        const data = await fs.readFile(MENU_FILE, 'utf8');
        const menu = JSON.parse(data);
        res.json(menu);
    } catch (error) {
        console.error('Error reading menu:', error);
        res.status(500).json({ error: 'Failed to load menu' });
    }
});

// Submit order (SAVES TO MYSQL DATABASE)
app.post('/api/order', (req, res) => {
    console.log('📦 Received order:', req.body);
    
    try {
        const order = req.body;
        const orderId = 'SER' + Date.now();
        
        const sql = `
            INSERT INTO orders 
            (order_id, customer_name, phone, city, address, pickup_time, items, total_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            orderId,
            order.name,
            order.phone,
            order.city,
            order.location,
            order.pickupTime || '30 minutes',
            JSON.stringify(order.items),
            order.total
        ];
        
        console.log('📊 Executing SQL with values:', values);
        
        db.query(sql, values, (err, result) => {
            if (err) {
                console.error('❌ Database error:', err);
                res.status(500).json({ 
                    success: false, 
                    error: 'Database error: ' + err.message 
                });
                return;
            }
            
            console.log('✅ Order saved to MySQL. ID:', result.insertId);
            
            res.json({ 
                success: true, 
                message: 'Order received successfully!', 
                orderId: orderId,
                mysqlId: result.insertId
            });
        });
        
    } catch (error) {
        console.error('❌ Server error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error: ' + error.message 
        });
    }
});

// Get all orders (for admin view)
app.get('/api/orders', (req, res) => {
    const sql = 'SELECT * FROM orders ORDER BY order_date DESC LIMIT 50';
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching orders:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        // Parse items from JSON string
        results.forEach(order => {
            try {
                order.items = JSON.parse(order.items);
            } catch (e) {
                order.items = [];
            }
        });
        
        res.json(results);
    });
});

// Get order by ID
app.get('/api/orders/:id', (req, res) => {
    const sql = 'SELECT * FROM orders WHERE order_id = ? OR id = ?';
    
    db.query(sql, [req.params.id, req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching order:', err);
            res.status(500).json({ error: 'Failed to fetch order' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        const order = results[0];
        try {
            order.items = JSON.parse(order.items);
        } catch (e) {
            order.items = [];
        }
        
        res.json(order);
    });
});

// Update order status
// ✅ Update order status (ALLOW BACKWARD CHANGE)
app.put('/api/orders/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    const allowed = ['received', 'preparing', 'ready', 'completed'];
    if (!allowed.includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status'
        });
    }

    const sql = `UPDATE orders SET status=? WHERE order_id=?`;

    db.query(sql, [status, orderId], (err, result) => {
        if (err) {
            console.error('❌ Status update error:', err);
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Order not found'
            });
        }

        res.json({
            success: true,
            message: 'Order status updated'
        });
    });
});


// Get order statistics
app.get('/api/orders/stats', (req, res) => {
    const sql = `
        SELECT 
            COUNT(*) as total_orders,
            SUM(total_amount) as total_revenue,
            AVG(total_amount) as avg_order_value,
            status,
            city
        FROM orders 
        GROUP BY status, city
        ORDER BY total_orders DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching order stats:', err);
            res.status(500).json({ error: 'Failed to fetch statistics' });
            return;
        }
        
        res.json(results);
    });
});

// Get cities for dropdown
app.get('/api/cities', (req, res) => {
    const cities = [
        { id: 1, name: "Bhairahawa" },
        { id: 2, name: "Kathmandu" },
        { id: 3, name: "Pokhara" },
        { id: 4, name: "Mustang" },
        { id: 5, name: "Butwal" }
    ];
    res.json(cities);
});

// Add this endpoint in server.js (around line 190, after the update order status endpoint)

// Delete order by ID
app.delete('/api/orders/:id', (req, res) => {
    const sql = 'DELETE FROM orders WHERE order_id = ? OR id = ?';
    
    db.query(sql, [req.params.id, req.params.id], (err, result) => {
        if (err) {
            console.error('Error deleting order:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete order: ' + err.message 
            });
            return;
        }
        
        if (result.affectedRows === 0) {
            res.status(404).json({ 
                success: false, 
                error: 'Order not found' 
            });
            return;
        }
        
        res.json({ 
            success: true, 
            message: 'Order deleted successfully',
            affectedRows: result.affectedRows
        });
    });
});

// Also add this bulk delete endpoint (optional but useful)
app.post('/api/orders/bulk-delete', (req, res) => {
    const { orderIds } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'No order IDs provided' 
        });
    }
    
    const placeholders = orderIds.map(() => '?').join(',');
    const sql = `DELETE FROM orders WHERE order_id IN (${placeholders})`;
    
    db.query(sql, orderIds, (err, result) => {
        if (err) {
            console.error('Error bulk deleting orders:', err);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to delete orders: ' + err.message 
            });
            return;
        }
        
        res.json({ 
            success: true, 
            message: `${result.affectedRows} orders deleted successfully`,
            affectedRows: result.affectedRows
        });
    });
});

// =============================================
// ORDER TRACKING SYSTEM - UPDATED ENDPOINTS FOR PHONE NUMBER TRACKING
// =============================================

// Get order(s) by phone number (customer tracking)
app.get('/api/track-order/:phoneNumber', (req, res) => {
    const phoneNumber = req.params.phoneNumber;
    const sql = 'SELECT order_id, status, order_date, customer_name FROM orders WHERE phone = ? ORDER BY order_date DESC';
    
    db.query(sql, [phoneNumber], (err, results) => {
        if (err) {
            console.error('Error fetching orders by phone:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'No orders found for this phone number' });
            return;
        }
        
        const orders = results.map(order => ({
            order_id: order.order_id,
            status: order.status,
            order_date: order.order_date,
            customer_name: order.customer_name,
            status_text: getStatusText(order.status)
        }));
        
        res.json({
            phone: phoneNumber,
            total_orders: orders.length,
            orders: orders
        });
    });
});

// Get detailed order info by order ID
app.get('/api/track-order-details/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const sql = 'SELECT * FROM orders WHERE order_id = ?';
    
    db.query(sql, [orderId], (err, results) => {
        if (err) {
            console.error('Error fetching order details:', err);
            res.status(500).json({ error: 'Failed to fetch order details' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        const order = results[0];
        try {
            order.items = JSON.parse(order.items);
        } catch (e) {
            order.items = [];
        }
        
        // Add status timeline
        order.status_timeline = getStatusTimeline(order.status, order.order_date);
        
        res.json(order);
    });
});

// Get all orders by phone number for tracking page
app.get('/api/track-orders-by-phone/:phoneNumber', (req, res) => {
    const phoneNumber = req.params.phoneNumber;
    const sql = 'SELECT * FROM orders WHERE phone = ? ORDER BY order_date DESC LIMIT 10';
    
    db.query(sql, [phoneNumber], (err, results) => {
        if (err) {
            console.error('Error fetching orders by phone:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'No orders found for this phone number' });
            return;
        }
        
        // Process each order
        const orders = results.map(order => {
            try {
                order.items = JSON.parse(order.items);
            } catch (e) {
                order.items = [];
            }
            
            // Add status timeline for each order
            order.status_timeline = getStatusTimeline(order.status, order.order_date);
            
            return order;
        });
        
        res.json({
            phone: phoneNumber,
            total_orders: orders.length,
            orders: orders
        });
    });
});

// Get order status updates (works with both phone number and order ID)
app.get('/api/order-status/:identifier', (req, res) => {
    const identifier = req.params.identifier;
    
    // Check if identifier is an order ID (starts with SER) or phone number
    let sql, params;
    
    if (identifier.startsWith('SER')) {
        sql = 'SELECT status, order_id FROM orders WHERE order_id = ?';
        params = [identifier];
    } else {
        sql = 'SELECT status, order_id FROM orders WHERE phone = ? ORDER BY order_date DESC LIMIT 1';
        params = [identifier];
    }
    
    db.query(sql, params, (err, results) => {
        if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
        }
        
        if (results.length === 0) {
            res.status(404).json({ error: 'Order not found' });
            return;
        }
        
        res.json({
            status: results[0].status,
            order_id: results[0].order_id,
            updated_at: new Date().toISOString()
        });
    });
});

// Get today's orders
app.get('/api/orders/today', (req, res) => {
    const sql = `
        SELECT * FROM orders 
        WHERE DATE(order_date) = CURDATE()
        ORDER BY order_date DESC
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching today\'s orders:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        results.forEach(order => {
            try {
                order.items = JSON.parse(order.items);
            } catch (e) {
                order.items = [];
            }
        });
        
        res.json(results);
    });
});

// Get orders by status
app.get('/api/orders/status/:status', (req, res) => {
    const status = req.params.status;
    const sql = 'SELECT * FROM orders WHERE status = ? ORDER BY order_date DESC';
    
    db.query(sql, [status], (err, results) => {
        if (err) {
            console.error('Error fetching orders by status:', err);
            res.status(500).json({ error: 'Failed to fetch orders' });
            return;
        }
        
        results.forEach(order => {
            try {
                order.items = JSON.parse(order.items);
            } catch (e) {
                order.items = [];
            }
        });
        
        res.json(results);
    });
});

// Get revenue statistics
app.get('/api/orders/revenue/daily', (req, res) => {
    const sql = `
        SELECT 
            DATE(order_date) as date,
            COUNT(*) as order_count,
            SUM(total_amount) as daily_revenue
        FROM orders 
        GROUP BY DATE(order_date)
        ORDER BY date DESC
        LIMIT 30
    `;
    
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching revenue stats:', err);
            res.status(500).json({ error: 'Failed to fetch statistics' });
            return;
        }
        
        res.json(results);
    });
});

// Helper function to get status text
function getStatusText(status) {
    const statusMap = {
        'received': 'Order Received - We have received your order',
        'preparing': 'Preparing - Your order is being prepared',
        'ready': 'Ready for Pickup - Your order is ready for pickup',
        'completed': 'Completed - Order has been picked up'
    };
    return statusMap[status] || 'Unknown Status';
}

// Helper function to create status timeline
function getStatusTimeline(currentStatus, orderDate) {
    const timeline = [
        {
            status: 'received',
            title: 'Order Received',
            description: 'We have received your order',
            completed: true,
            active: currentStatus === 'received',
            time: new Date(orderDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        },
        {
            status: 'preparing',
            title: 'Preparing',
            description: 'Your order is being prepared',
            completed: ['preparing', 'ready', 'completed'].includes(currentStatus),
            active: currentStatus === 'preparing',
            time: null
        },
        {
            status: 'ready',
            title: 'Ready for Pickup',
            description: 'Your order is ready for pickup',
            completed: ['ready', 'completed'].includes(currentStatus),
            active: currentStatus === 'ready',
            time: null
        },
        {
            status: 'completed',
            title: 'Completed',
            description: 'Order has been picked up',
            completed: currentStatus === 'completed',
            active: currentStatus === 'completed',
            time: null
        }
    ];
    
    return timeline;
}

// =============================================
// PAGES ROUTES
// =============================================

// Serve order tracking page
app.get('/track-order', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track-order.html'));
});

// Serve admin pages
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Serve admin login page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

// Serve admin dashboard
app.get('/admin-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// =============================================
// SIMPLE ADMIN AUTHENTICATION MIDDLEWARE
// =============================================

const checkAdmin = (req, res, next) => {
    // In production, use proper authentication like JWT
    const token = req.headers['x-admin-token'];
    
    if (token === 'serados-admin-token') {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// =============================================
// START SERVER
// =============================================

app.listen(PORT, async () => {
    await initializeMenu();
    console.log(`🚀 Serados Cafe Server running on http://localhost:${PORT}`);
    console.log(`📊 Using MySQL database: serados_cafe_db`);
    console.log(`📞 Orders API: http://localhost:${PORT}/api/order`);
    console.log(`📋 Order Tracking: http://localhost:${PORT}/track-order`);
    console.log(`📱 Phone Tracking Endpoint: http://localhost:${PORT}/api/track-orders-by-phone/{phone}`);
    console.log(`🛡️ Admin Dashboard: http://localhost:${PORT}/admin-dashboard.html`);
});
