const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('sh'));
app.use(express.static('back')); // Serve static files from 'back'
// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Database initialization
function initializeDatabase() {
    db.serialize(() => {
        // Create tables if they don't exist
        db.run(`
            CREATE TABLE IF NOT EXISTS клиенты (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                имя TEXT NOT NULL,
                телефон TEXT NOT NULL UNIQUE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS записи (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                клиент_id INTEGER,
                услуга_id INTEGER,
                мастер_id INTEGER,
                дата TEXT NOT NULL,
                время TEXT NOT NULL,
                цена REAL NOT NULL,
                FOREIGN KEY (клиент_id) REFERENCES клиенты(id),
                FOREIGN KEY (услуга_id) REFERENCES услуги(id),
                FOREIGN KEY (мастер_id) REFERENCES мастера(id)
            )
        `);
        db.run(`
            CREATE TABLE IF NOT EXISTS услуги (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                категория TEXT,
                название TEXT,
                описание TEXT,
                цена REAL,
                фото TEXT
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS мастера (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                имя TEXT,
                описание TEXT,
                фото TEXT
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS расписание (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                мастер_id INTEGER,
                услуга_id INTEGER,
                дата TEXT,
                время TEXT,
                доступно INTEGER DEFAULT 1,
                FOREIGN KEY (мастер_id) REFERENCES мастера(id),
                FOREIGN KEY (услуга_id) REFERENCES услуги(id)
            )
        `);

        // Insert sample data if tables are empty
        db.get("SELECT COUNT(*) as count FROM мастера", [], (err, row) => {
            if (err) {
                console.error('Error checking masters table:', err.message);
            } else if (row.count === 0) {
                console.log('Adding sample data...');
                insertSampleData();
            }
        });
    });
}


// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sh', 'главная.html'));
});
// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'back', 'admin.html'));
});

// API endpoint to get all services
app.get('/api/services', (req, res) => {
    const sql = "SELECT * FROM услуги ORDER BY категория, название";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});
app.get('/:page', (req, res) => {
    const page = req.params.page;
    if (page.endsWith('.html')) {
        const shPath = path.join(__dirname, 'sh', page);
        const backPath = path.join(__dirname, 'back', page);

        // Check if file exists in 'sh' folder
        if (require('fs').existsSync(shPath)) {
            res.sendFile(shPath);
        }
        // Check if file exists in 'back' folder
        else if (require('fs').existsSync(backPath)) {
            res.sendFile(backPath);
        }
        else {
            res.status(404).json({ error: 'Page not found' });
        }
    } else {
        res.status(404).json({ error: 'Page not found' });
    }
});

// API endpoint to get service by ID
app.get('/api/service/:id', (req, res) => {
    const serviceId = req.params.id;
    const sql = "SELECT * FROM услуги WHERE id = ?";
    
    db.get(sql, [serviceId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Service not found' });
            return;
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// API endpoint to get all specialists
app.get('/api/specialists', (req, res) => {
    const sql = "SELECT id, имя, описание, фото FROM мастера ORDER BY имя";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// API endpoint to get specialist's services (из расписания)
app.get('/api/specialist/:id/services', (req, res) => {
    const specialistId = req.params.id;
    const sql = `
        SELECT DISTINCT у.* 
        FROM услуги у
        JOIN расписание р ON у.id = р.услуга_id
        WHERE р.мастер_id = ?
        ORDER BY у.категория, у.название
    `;
    
    db.all(sql, [specialistId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// API endpoint to get specialists for a service (из расписания)
app.get('/api/service/:id/specialists', (req, res) => {
    const serviceId = req.params.id;
    const sql = `
        SELECT DISTINCT м.* 
        FROM мастера м
        JOIN расписание р ON м.id = р.мастер_id
        WHERE р.услуга_id = ?
        ORDER BY м.имя
    `;
    
    db.all(sql, [serviceId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// API endpoint to get specialist's schedule for specific service and date
app.get('/api/specialist/:specialistId/service/:serviceId/schedule/:date', (req, res) => {
    const specialistId = req.params.specialistId;
    const serviceId = req.params.serviceId;
    const date = req.params.date;
    
    const sql = `
        SELECT * FROM расписание 
        WHERE мастер_id = ? 
        AND услуга_id = ?
        AND дата = ? 
        AND доступно = 1
        ORDER BY время
    `;
    
    db.all(sql, [specialistId, serviceId, date], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// API endpoint to get available dates for specialist and service
app.get('/api/specialist/:specialistId/service/:serviceId/available-dates', (req, res) => {
    const specialistId = req.params.specialistId;
    const serviceId = req.params.serviceId;
    const startDate = req.query.start;
    const endDate = req.query.end;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start and end dates are required' });
    }
    
    const sql = `
        SELECT DISTINCT дата 
        FROM расписание 
        WHERE мастер_id = ? 
        AND услуга_id = ?
        AND дата BETWEEN ? AND ? 
        AND доступно = 1
        ORDER BY дата
    `;
    
    db.all(sql, [specialistId, serviceId, startDate, endDate], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const availableDates = rows.map(row => row.дата);
        
        res.json({
            message: "success",
            availableDates: availableDates
        });
    });
});


// API endpoint to get specialist by ID
app.get('/api/specialist/:id', (req, res) => {
    const specialistId = req.params.id;
    const sql = "SELECT * FROM мастера WHERE id = ?";
    
    db.get(sql, [specialistId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Specialist not found' });
            return;
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// API endpoint to book an appointment
// API endpoint to book an appointment
app.post('/api/appointment', (req, res) => {
    const { specialistId, serviceId, date, time, clientName, clientPhone } = req.body;
    
    if (!specialistId || !serviceId || !date || !time || !clientName || !clientPhone) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    // First check if the time slot is still available
    const checkSql = `
        SELECT id FROM расписание 
        WHERE мастер_id = ? 
        AND услуга_id = ?
        AND дата = ?
        AND время = ?
        AND доступно = 1
    `;
    
    db.get(checkSql, [specialistId, serviceId, date, time], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!row) {
            res.status(409).json({ error: 'Время уже занято' });
            return;
        }
        
        const scheduleId = row.id;
        
        // Start transaction
        db.serialize(() => {
            // Begin transaction
            db.run("BEGIN TRANSACTION");
            
            // 1. Check if client exists, if not - create
            const checkClientSql = "SELECT id FROM клиенты WHERE телефон = ?";
            db.get(checkClientSql, [clientPhone], (err, clientRow) => {
                if (err) {
                    db.run("ROLLBACK");
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                let clientId;
                if (clientRow) {
                    // Client exists
                    clientId = clientRow.id;
                    
                    // Update client name if needed
                    const updateClientSql = "UPDATE клиенты SET имя = ? WHERE id = ?";
                    db.run(updateClientSql, [clientName, clientId], function(err) {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        createAppointment(clientId);
                    });
                } else {
                    // Create new client
                    const insertClientSql = "INSERT INTO клиенты (имя, телефон) VALUES (?, ?)";
                    db.run(insertClientSql, [clientName, clientPhone], function(err) {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        clientId = this.lastID;
                        createAppointment(clientId);
                    });
                }
                
                function createAppointment(clientId) {
                    // 2. Get service price
                    const getPriceSql = "SELECT цена FROM услуги WHERE id = ?";
                    db.get(getPriceSql, [serviceId], (err, serviceRow) => {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        if (!serviceRow) {
                            db.run("ROLLBACK");
                            res.status(404).json({ error: 'Услуга не найдена' });
                            return;
                        }
                        
                        const price = serviceRow.цена;
                        
                        // 3. Create appointment record
                        const insertAppointmentSql = `
                            INSERT INTO записи (клиент_id, услуга_id, мастер_id, дата, время, цена)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        
                        db.run(insertAppointmentSql, [clientId, serviceId, specialistId, date, time, price], function(err) {
                            if (err) {
                                db.run("ROLLBACK");
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // 4. Mark time slot as unavailable
                            const updateScheduleSql = "UPDATE расписание SET доступно = 0 WHERE id = ?";
                            db.run(updateScheduleSql, [scheduleId], function(err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                
                                // Commit transaction
                                db.run("COMMIT", function(err) {
                                    if (err) {
                                        db.run("ROLLBACK");
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    
                                    res.json({
                                        message: "success",
                                        appointment: {
                                            id: this.lastID,
                                            clientId: clientId,
                                            specialistId: specialistId,
                                            serviceId: serviceId,
                                            date: date,
                                            time: time,
                                            price: price,
                                            clientName: clientName,
                                            clientPhone: clientPhone
                                        }
                                    });
                                });
                            });
                        });
                    });
                }
            });
        });
    });
});

// API endpoint to add a new service
app.post('/api/services', (req, res) => {
    const { категория, название, описание, цена, фото } = req.body;
    if (!категория || !название || !цена) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const sql = `INSERT INTO услуги (категория, название, описание, цена, фото) 
                 VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [категория, название, описание, цена, фото], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: { 
                id: this.lastID, 
                категория, 
                название, 
                описание, 
                цена, 
                фото 
            }
        });
    });
});



app.get('/api/appointments', (req, res) => {
    const specialistId = req.query.specialistId;
    const date = req.query.date;
    
    let sql = `
        SELECT 
            з.id,
            з.дата,
            з.время,
            з.цена,
            к.имя as клиент_имя,
            к.телефон as клиент_телефон,
            у.название as услуга_название,
            м.имя as мастер_имя
        FROM записи з
        JOIN клиенты к ON з.клиент_id = к.id
        JOIN услуги у ON з.услуга_id = у.id
        JOIN мастера м ON з.мастер_id = м.id
    `;
    
    const params = [];
    
    if (specialistId) {
        sql += ' WHERE з.мастер_id = ?';
        params.push(specialistId);
    }
    
    if (date) {
        if (specialistId) {
            sql += ' AND з.дата = ?';
        } else {
            sql += ' WHERE з.дата = ?';
        }
        params.push(date);
    }
    
    sql += ' ORDER BY з.дата DESC, з.время DESC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
        });
    });
});

// API endpoint to cancel appointment
app.delete('/api/appointments/:id', (req, res) => {
    const appointmentId = req.params.id;
    
    // Находим запись чтобы получить информацию о времени
    const findSql = `
        SELECT мастер_id, услуга_id, дата, время 
        FROM записи 
        WHERE id = ?
    `;
    
    db.get(findSql, [appointmentId], (err, appointment) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!appointment) {
            res.status(404).json({ error: 'Запись не найдена' });
            return;
        }
        
        // Начинаем транзакцию
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // 1. Удаляем запись
            const deleteSql = "DELETE FROM записи WHERE id = ?";
            db.run(deleteSql, [appointmentId], function(err) {
                if (err) {
                    db.run("ROLLBACK");
                    res.status(500).json({ error: err.message });
                    return;
                }
                
                // 2. Освобождаем время в расписании
                const updateScheduleSql = `
                    UPDATE расписание 
                    SET доступно = 1 
                    WHERE мастер_id = ? 
                    AND услуга_id = ?
                    AND дата = ?
                    AND время = ?
                `;
                
                db.run(updateScheduleSql, [
                    appointment.мастер_id,
                    appointment.услуга_id,
                    appointment.дата,
                    appointment.время
                ], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    // Коммитим транзакцию
                    db.run("COMMIT", function(err) {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        res.json({
                            message: "success",
                            deletedId: appointmentId
                        });
                    });
                });
            });
        });
    });
});

// Error handling for undefined routes
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', shutDown);
process.on('SIGINT', shutDown);

function shutDown() {
    console.log('Received shutdown signal, closing database...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        process.exit(0);
    });
}