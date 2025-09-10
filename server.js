const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('sh'));
app.use(express.static('back')); // Serve static files from 'back'
app.use('/photo', express.static('photo'));
// Добавьте в начало server.js для отладки
console.log('Текущая директория:', __dirname);
console.log('Путь к папке фото:', path.join(__dirname, 'photo/работники/'));
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

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Используем абсолютный путь к папке
        const dir = path.join(__dirname, 'photo/работники/');
        // Создаем папку если ее нет
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Генерируем уникальное имя файла
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const safeName = `master_${timestamp}${extension}`;
        
        cb(null, safeName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Проверяем что файл является изображением
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// API endpoint для загрузки фото
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }
        
        console.log('Файл сохранен по пути:', req.file.path);
        console.log('Имя файла:', req.file.filename);
        
        // Возвращаем относительный путь к файлу
        res.json({
            message: "success",
            filePath: 'photo/работники/' + req.file.filename
        });
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        res.status(500).json({ error: 'Ошибка загрузки фото' });
    }
});

// Добавить после существующего upload-photo endpoint
const serviceStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, 'photo/услуги/');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now();
        const extension = path.extname(file.originalname);
        const safeName = `service_${timestamp}${extension}`;
        cb(null, safeName);
    }
});

const uploadService = multer({ 
    storage: serviceStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Только изображения разрешены'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

app.post('/api/upload-service-photo', uploadService.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }
        
        res.json({
            message: "success",
            filePath: 'photo/услуги/' + req.file.filename
        });
    } catch (error) {
        console.error('Ошибка загрузки фото услуги:', error);
        res.status(500).json({ error: 'Ошибка загрузки фото' });
    }
});

// Добавить endpoint для получения всех услуг
app.get('/api/services-all', (req, res) => {
    const sql = "SELECT * FROM услуги WHERE доступен != 0 ORDER BY доступен DESC, категория, название";
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

// Обработчик ошибок multer
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Размер файла слишком большой (макс. 5MB)' });
        }
    }
    res.status(400).json({ error: error.message });
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
                доступен INTEGER DEFAULT 1
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS мастера (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            имя TEXT,
            описание TEXT,
            фото TEXT,
            доступен INTEGER DEFAULT 1
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
    const sql = "SELECT * FROM услуги WHERE доступен = 1 ORDER BY категория, название";
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


// API endpoint to add service
app.post('/api/services-new', (req, res) => {
    const { категория, название, описание, цена, фото, доступен } = req.body;
    
    if (!категория || !название || !цена) {
        return res.status(400).json({ error: 'Категория, название и цена обязательны' });
    }
    
    const sql = `INSERT INTO услуги (категория, название, описание, цена, фото, доступен) 
                 VALUES (?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [категория, название, описание, цена, фото, доступен || 1], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
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
                фото,
                доступен: доступен || 1
            }
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

// API endpoint to update service
// API endpoint to update service
app.put('/api/service/:id', (req, res) => {
    const serviceId = req.params.id;
    const { категория, название, описание, цена, фото, доступен } = req.body;
    
    if (!категория || !название || !цена) {
        return res.status(400).json({ error: 'Категория, название и цена обязательны' });
    }
    
    // Создаем динамический SQL запрос в зависимости от переданных полей
    let sql = `UPDATE услуги SET категория = ?, название = ?, описание = ?, 
               цена = ?, фото = ?`;
    let params = [категория, название, описание, цена, фото];
    
    // Добавляем поле доступен только если оно передано
    if (доступен !== undefined) {
        sql += ', доступен = ?';
        params.push(доступен);
    }
    
    sql += ' WHERE id = ?';
    params.push(serviceId);
    
    db.run(sql, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Услуга не найдена' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: serviceId,
                категория,
                название,
                описание,
                цена,
                фото,
                доступен: доступен !== undefined ? доступен : null // возвращаем текущее значение
            }
        });
    });
});

// API endpoint to update service visibility
// API endpoint to update service visibility - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.patch('/api/service/:id/visibility', (req, res) => {
    const serviceId = req.params.id;
    const { доступен } = req.body;
    
    // Разрешаем значения 1 и 2 (было только [0, 1])
    if (![1, 2].includes(доступен)) {
        return res.status(400).json({ error: 'Неверное значение доступности. Допустимо: 1 (активна) или 2 (скрыта)' });
    }
    
    const sql = `UPDATE услуги SET доступен = ? WHERE id = ?`;
    
    db.run(sql, [доступен, serviceId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Услуга не найдена' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: serviceId,
                доступен
            }
        });
    });
});
// API endpoint to delete service (set доступен = 0)
app.delete('/api/service/:id', (req, res) => {
    const serviceId = req.params.id;
    
    const sql = `UPDATE услуги SET доступен = 0 WHERE id = ?`;
    
    db.run(sql, [serviceId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Услуга не найдена' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: serviceId,
                deleted: true
            }
        });
    });
});

// API endpoint to get all specialists
app.get('/api/specialists', (req, res) => {
    const sql = "SELECT id, имя, описание, фото FROM мастера WHERE доступен = 1 ORDER BY имя";
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
// API endpoint to get specialist's services (из расписания)
app.get('/api/specialist/:id/services', (req, res) => {
    const specialistId = req.params.id;
    const sql = `
        SELECT DISTINCT у.* 
        FROM услуги у
        JOIN расписание р ON у.id = р.услуга_id
        WHERE р.мастер_id = ?
        AND у.доступен = 1
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
        AND м.доступен = 1
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



// API endpoint to get appointments with date range
app.get('/api/appointments', (req, res) => {
    const specialistId = req.query.specialistId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
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
    const conditions = [];
    
    if (specialistId) {
        conditions.push('з.мастер_id = ?');
        params.push(specialistId);
    }
    
    if (startDate && endDate) {
        conditions.push('з.дата BETWEEN ? AND ?');
        params.push(startDate, endDate);
    } else if (startDate) {
        conditions.push('з.дата >= ?');
        params.push(startDate);
    } else if (endDate) {
        conditions.push('з.дата <= ?');
        params.push(endDate);
    }
    
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
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


app.get('/api/appointments-range', (req, res) => {
    const specialistId = req.query.specialistId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!specialistId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Specialist ID and date range are required' });
    }
    
    const sql = `
        SELECT 
            з.дата,
            COUNT(з.id) as appointment_count
        FROM записи з
        WHERE з.мастер_id = ?
        AND з.дата BETWEEN ? AND ?
        GROUP BY з.дата
        ORDER BY з.дата
    `;
    
    db.all(sql, [specialistId, startDate, endDate], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const result = {};
        rows.forEach(row => {
            result[row.дата] = row.appointment_count;
        });
        
        res.json({
            message: "success",
            data: result
        });
    });
});

// API endpoint to add specialist
app.post('/api/specialists', (req, res) => {
    const { имя, описание, фото } = req.body;
    
    if (!имя) {
        return res.status(400).json({ error: 'Имя мастера обязательно' });
    }
    
    const sql = `INSERT INTO мастера (имя, описание, фото) VALUES (?, ?, ?)`;
    
    db.run(sql, [имя, описание, фото], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                имя,
                описание,
                фото
            }
        });
    });
});

// API endpoint to add service
app.post('/api/services-new', (req, res) => {
    const { категория, название, описание, цена, фото } = req.body;
    
    if (!категория || !название || !цена) {
        return res.status(400).json({ error: 'Категория, название и цена обязательны' });
    }
    
    const sql = `INSERT INTO услуги (категория, название, описание, цена, фото) VALUES (?, ?, ?, ?, ?)`;
    
    db.run(sql, [категория, название, описание, цена, фото], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
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


// API endpoint для админского добавления записи (без проверки расписания)
app.post('/api/admin/appointment', (req, res) => {
    const { specialistId, serviceId, date, time, clientName, clientPhone } = req.body;
    
    if (!specialistId || !serviceId || !date || !time || !clientName || !clientPhone) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
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
            }
        });
    });
});

// В API endpoint для получения всех мастеров изменим запрос
app.get('/api/specialists-all', (req, res) => {
    const sql = "SELECT id, имя, описание, фото, доступен FROM мастера WHERE доступен != 0 ORDER BY доступен DESC, имя";
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

// Add new specialist
app.post('/api/specialists', (req, res) => {
    const { имя, описание, фото } = req.body;
    
    if (!имя) {
        return res.status(400).json({ error: 'Имя мастера обязательно' });
    }
    
    const sql = `INSERT INTO мастера (имя, описание, фото, доступен) VALUES (?, ?, ?, 1)`;
    
    db.run(sql, [имя, описание, фото || 'photo/работники/default.jpg'], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                имя,
                описание,
                фото: фото || 'photo/работники/default.jpg',
                доступен: 1
            }
        });
    });
});

// Update specialist
app.put('/api/specialist/:id', (req, res) => {
    const specialistId = req.params.id;
    const { имя, описание, фото } = req.body;
    
    if (!имя) {
        return res.status(400).json({ error: 'Имя мастера обязательно' });
    }
    
    const sql = `UPDATE мастера SET имя = ?, описание = ?, фото = ? WHERE id = ?`;
    
    db.run(sql, [имя, описание, фото || 'photo/работники/default.jpg', specialistId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Мастер не найден' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: specialistId,
                имя,
                описание,
                фото: фото || 'photo/работники/default.jpg'
            }
        });
    });
});

// Update specialist visibility
app.patch('/api/specialist/:id/visibility', (req, res) => {
    const specialistId = req.params.id;
    const { доступен } = req.body;
    
    if (![1, 2].includes(доступен)) {
        return res.status(400).json({ error: 'Неверное значение видимости' });
    }
    
    const sql = `UPDATE мастера SET доступен = ? WHERE id = ?`;
    
    db.run(sql, [доступен, specialistId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Мастер не найден' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: specialistId,
                доступен
            }
        });
    });
});

// Delete specialist (set доступен = 0)
app.delete('/api/specialist/:id', (req, res) => {
    const specialistId = req.params.id;
    
    const sql = `UPDATE мастера SET доступен = 0 WHERE id = ?`;
    
    db.run(sql, [specialistId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Мастер не найден' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: specialistId,
                deleted: true
            }
        });
    });
});




// API endpoint to get schedule by ID
app.get('/api/schedule/:id', (req, res) => {
    const scheduleId = req.params.id;
    const sql = `
        SELECT 
            р.*,
            м.имя as мастер_имя,
            у.название as услуга_название,
            у.цена as услуга_цена
        FROM расписание р
        JOIN мастера м ON р.мастер_id = м.id
        JOIN услуги у ON р.услуга_id = у.id
        WHERE р.id = ?
    `;
    
    db.get(sql, [scheduleId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Schedule not found' });
            return;
        }
        res.json({
            message: "success",
            data: row
        });
    });
});

// API endpoint to add schedule
app.post('/api/schedule', (req, res) => {
    const { дата, время, мастер_id, услуга_id, доступно } = req.body;
    
    if (!дата || !время || !мастер_id || !услуга_id) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    // Проверяем, не существует ли уже такой записи
    const checkSql = `
        SELECT id FROM расписание 
        WHERE мастер_id = ? 
        AND услуга_id = ?
        AND дата = ?
        AND время = ?
    `;
    
    db.get(checkSql, [мастер_id, услуга_id, дата, время], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row) {
            res.status(409).json({ error: 'Такое время уже существует для этого мастера и услуги' });
            return;
        }
        
        const insertSql = `
            INSERT INTO расписание (дата, время, мастер_id, услуга_id, доступно)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        db.run(insertSql, [дата, время, мастер_id, услуга_id, доступно || 1], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                message: "success",
                data: {
                    id: this.lastID,
                    дата,
                    время,
                    мастер_id,
                    услуга_id,
                    доступно: доступно || 1
                }
            });
        });
    });
});

// API endpoint to update schedule
app.put('/api/schedule/:id', (req, res) => {
    const scheduleId = req.params.id;
    const { дата, время, мастер_id, услуга_id } = req.body;
    
    if (!дата || !время || !мастер_id || !услуга_id) {
        return res.status(400).json({ error: 'Все поля обязательны' });
    }
    
    // Проверяем, не существует ли уже такой записи (кроме текущей)
    const checkSql = `
        SELECT id FROM расписание 
        WHERE мастер_id = ? 
        AND услуга_id = ?
        AND дата = ?
        AND время = ?
        AND id != ?
    `;
    
    db.get(checkSql, [мастер_id, услуга_id, дата, время, scheduleId], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (row) {
            res.status(409).json({ error: 'Такое время уже существует для этого мастера и услуги' });
            return;
        }
        
        const updateSql = `
            UPDATE расписание 
            SET дата = ?, время = ?, мастер_id = ?, услуга_id = ?
            WHERE id = ?
        `;
        
        db.run(updateSql, [дата, время, мастер_id, услуга_id, scheduleId], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (this.changes === 0) {
                res.status(404).json({ error: 'Расписание не найдено' });
                return;
            }
            
            res.json({
                message: "success",
                data: {
                    id: scheduleId,
                    дата,
                    время,
                    мастер_id,
                    услуга_id
                }
            });
        });
    });
});

// API endpoint to delete schedule
app.delete('/api/schedule/:id', (req, res) => {
    const scheduleId = req.params.id;
    
    const sql = "DELETE FROM расписание WHERE id = ?";
    
    db.run(sql, [scheduleId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Расписание не найдено' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: scheduleId,
                deleted: true
            }
        });
    });
});


app.get('/api/clients-with-stats', (req, res) => {
    const sql = `
        SELECT 
            к.id,
            к.имя,
            к.телефон,
            COUNT(з.id) as recordsCount,
            SUM(з.цена) as totalPrice,
            MAX(з.дата) as lastDate
        FROM клиенты к
        LEFT JOIN записи з ON к.id = з.клиент_id
        GROUP BY к.id, к.телефон
        HAVING COUNT(з.id) > 0
        ORDER BY totalPrice DESC
    `;
    
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

// API endpoint to get client details with appointments
app.get('/api/client/:id/appointments', (req, res) => {
    const clientId = req.params.id;
    
    const clientSql = "SELECT * FROM клиенты WHERE id = ?";
    const appointmentsSql = `
        SELECT 
            з.дата,
            з.время,
            з.цена,
            у.название as услуга_название,
            м.имя as мастер_имя
        FROM записи з
        JOIN услуги у ON з.услуга_id = у.id
        JOIN мастера м ON з.мастер_id = м.id
        WHERE з.клиент_id = ?
        ORDER BY з.дата DESC, з.время DESC
    `;
    
    db.get(clientSql, [clientId], (err, clientRow) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (!clientRow) {
            res.status(404).json({ error: 'Клиент не найден' });
            return;
        }
        
        db.all(appointmentsSql, [clientId], (err, appointmentRows) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            // Calculate statistics
            const recordsCount = appointmentRows.length;
            const totalPrice = appointmentRows.reduce((sum, row) => sum + (row.цена || 0), 0);
            const lastDate = appointmentRows.length > 0 ? appointmentRows[0].дата : null;
            
            res.json({
                message: "success",
                data: {
                    ...clientRow,
                    appointments: appointmentRows,
                    recordsCount,
                    totalPrice,
                    lastDate
                }
            });
        });
    });
});


// server.js

// API endpoint для расписания (с диапазоном дат)
app.get('/api/schedule-available', (req, res) => {
    const specialistId = req.query.specialistId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    let sql = `
        SELECT 
            р.*,
            м.имя as мастер_имя,
            у.название as услуга_название,
            у.цена as услуга_цена
        FROM расписание р
        JOIN мастера м ON р.мастер_id = м.id
        JOIN услуги у ON р.услуга_id = у.id
        WHERE р.доступно = 1
        AND р.дата BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];
    
    if (specialistId) {
        sql += ' AND р.мастер_id = ?';
        params.push(specialistId);
    }
    
    sql += ' ORDER BY р.дата, р.время';
    
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

// API endpoint для управления свободным временем (только от текущей даты)
app.get('/api/freetime-available', (req, res) => {
    const masterId = req.query.masterId;
    const fromDate = req.query.fromDate;
    const toDate = req.query.toDate;
    
    let sql = `
        SELECT 
            р.*,
            м.имя as мастер_имя,
            у.название as услуга_название,
            у.цена as услуга_цена
        FROM расписание р
        JOIN мастера м ON р.мастер_id = м.id
        JOIN услуги у ON р.услуга_id = у.id
        WHERE р.доступно = 1
    `;
    
    const params = [];
    
    if (fromDate) {
        sql += ' AND р.дата >= ?';
        params.push(fromDate);
    }
    
    if (toDate) {
        sql += ' AND р.дата <= ?';
        params.push(toDate);
    }
    
    if (masterId) {
        sql += ' AND р.мастер_id = ?';
        params.push(masterId);
    }
    
    sql += ' ORDER BY р.дата ASC, р.время ASC';
    
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

// API endpoint to get appointments with date range
// server.js - исправленный endpoint
app.get('/api/appointments-range', (req, res) => {
    const specialistId = req.query.specialistId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    
    if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Date range is required' });
    }
    
    let sql = `
        SELECT 
            з.дата,
            COUNT(з.id) as appointment_count
        FROM записи з
        WHERE з.дата BETWEEN ? AND ?
    `;
    
    const params = [startDate, endDate];
    
    if (specialistId) {
        sql += ' AND з.мастер_id = ?';
        params.push(specialistId);
    }
    
    sql += ' GROUP BY з.дата ORDER BY з.дата';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const result = {};
        rows.forEach(row => {
            result[row.дата] = row.appointment_count;
        });
        
        res.json({
            message: "success",
            data: result
        });
    });
});




// Добавить в server.js
const bcrypt = require('bcrypt');
const { PASSWORD_HASH } = require('./config/password');

// API endpoint для проверки пароля
app.post('/api/verify-password', express.json(), async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.status(400).json({ error: 'Пароль обязателен' });
        }
        
        // Сравниваем пароль с хешем
        const isValid = await bcrypt.compare(password, PASSWORD_HASH);
        
        res.json({ success: isValid });
    } catch (error) {
        console.error('Ошибка проверки пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API endpoint to update schedule availability
app.patch('/api/schedule/:id', (req, res) => {
    const scheduleId = req.params.id;
    const { доступно } = req.body;
    
    const sql = `UPDATE расписание SET доступно = ? WHERE id = ?`;
    
    db.run(sql, [доступно, scheduleId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Расписание не найдено' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: scheduleId,
                доступно
            }
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
