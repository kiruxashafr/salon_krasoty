const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const sharp = require('sharp');

const app = express();
const PORT = 3011;


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
app.post('/api/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }

        let filePath = req.file.path;
        let filename = req.file.filename;

        // Проверяем, является ли файл HEIC/HEIF
        if (req.file.mimetype === 'image/heic' || req.file.mimetype === 'image/heif' || path.extname(filename).toLowerCase() === '.heic') {
            // Конвертируем в JPEG
            const newFilename = filename.replace(/\.[^/.]+$/, ".jpg"); // Заменяем расширение на .jpg
            const newFilePath = path.join(path.dirname(filePath), newFilename);

            await sharp(filePath)
                .jpeg({ quality: 90 }) // Качество 90% для баланса размера/качества
                .toFile(newFilePath);

            // Удаляем оригинальный HEIC
            fs.unlinkSync(filePath);

            // Обновляем пути
            filePath = newFilePath;
            filename = newFilename;
        }

        console.log('Файл сохранен по пути:', filePath);
        console.log('Имя файла:', filename);

        res.json({
            message: "success",
            filePath: 'photo/работники/' + filename
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
                        телефон TEXT NOT NULL UNIQUE,
                        tg_id TEXT
                    )
        `);
        db.run(`
    CREATE TABLE IF NOT EXISTS настройки (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ключ TEXT UNIQUE NOT NULL,
        значение TEXT NOT NULL,
        описание TEXT
    )
`);


        db.run(`
            CREATE TABLE IF NOT EXISTS страницы (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                страница TEXT NOT NULL,
                элемент TEXT NOT NULL,
                текст TEXT,
                порядок INTEGER DEFAULT 0,
                UNIQUE(страница, элемент)
            )
        `);


        db.run(`
            CREATE TABLE IF NOT EXISTS ссылки (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                тип TEXT NOT NULL UNIQUE,
                url TEXT NOT NULL,
                описание TEXT
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
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
                доступен INTEGER DEFAULT 1,
                tg_id TEXT
            )
        `);

        // server.js - исправленная схема таблицы уведомлений
        // server.js - исправленная схема таблицы уведомлений
        db.run(`
            CREATE TABLE IF NOT EXISTS уведомления (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                запись_id INTEGER NOT NULL,
                тип TEXT NOT NULL CHECK(тип IN ('daily', 'hourly', 'new', 'masternew')), -- Добавьте 'masternew'
                отправлено INTEGER DEFAULT 0,
                время_отправки DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (запись_id) REFERENCES записи(id),
                UNIQUE(запись_id, тип)
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
// server.js - добавить API endpoints для страниц

// Получить контент страницы
app.get('/api/pages/:pageName', (req, res) => {
    const pageName = req.params.pageName;
    
    const sql = "SELECT элемент, текст FROM страницы WHERE страница = ? ORDER BY порядок";
    
    db.all(sql, [pageName], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const content = {};
        rows.forEach(row => {
            content[row.элемент] = row.текст;
        });
        
        res.json({
            message: "success",
            data: content
        });
    });
});


app.get('/api/home-content', (req, res) => {
    const sql = "SELECT элемент, текст FROM страницы WHERE страница = 'главная' ORDER BY порядок";
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const content = {};
        rows.forEach(row => {
            content[row.элемент] = row.текст;
        });
        
        res.json({
            message: "success",
            data: content
        });
    });
});


app.get('/api/links', (req, res) => {
    const sql = "SELECT тип, url, описание FROM ссылки";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const links = {};
        rows.forEach(row => {
            links[row.тип] = row.url;
        });
        
        res.json({
            message: "success",
            data: links
        });
    });
});

// Обновить ссылку
app.put('/api/links/:type', (req, res) => {
    const linkType = req.params.type;
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL обязателен' });
    }
    
    const sql = `
        INSERT INTO ссылки (тип, url) 
        VALUES (?, ?) 
        ON CONFLICT(тип) 
        DO UPDATE SET url = excluded.url
    `;
    
    db.run(sql, [linkType, url], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                тип: linkType,
                url: url
            }
        });
    });
});

// Обновить контент элемента страницы
app.put('/api/pages/:pageName/:element', (req, res) => {
    const pageName = req.params.pageName;
    const element = req.params.element;
    const { текст } = req.body;
    
    if (текст === undefined) {
        return res.status(400).json({ error: 'Текст обязателен' });
    }
    
    const sql = `
        INSERT INTO страницы (страница, элемент, текст) 
        VALUES (?, ?, ?) 
        ON CONFLICT(страница, элемент) 
        DO UPDATE SET текст = excluded.текст
    `;
    
    db.run(sql, [pageName, element, текст], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                страница: pageName,
                элемент: element,
                текст: текст
            }
        });
    });
});

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

// Более устойчивая версия с LEFT JOIN
app.get('/api/appointments', (req, res) => {
    const specialistId = req.query.specialistId;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const createdSince = req.query.createdSince;
    
    let sql = `
        SELECT 
            з.id,
            з.дата,
            з.время,
            з.цена,
            з.created_at,
            з.мастер_id,
            з.услуга_id,
            к.имя as клиент_имя,
            к.телефон as клиент_телефон,
            к.tg_id as клиент_tg_id,
            у.название as услуга_название,
            м.имя as мастер_имя,
            м.tg_id as мастер_tg_id
        FROM записи з
        LEFT JOIN клиенты к ON з.клиент_id = к.id
        LEFT JOIN услуги у ON з.услуга_id = у.id
        LEFT JOIN мастера м ON з.мастер_id = м.id
        WHERE з.id IS NOT NULL
    `;
    
    const params = [];
    
    if (specialistId) {
        sql += ' AND з.мастер_id = ?';
        params.push(specialistId);
    }
    
    if (startDate && endDate) {
        sql += ' AND з.дата BETWEEN ? AND ?';
        params.push(startDate, endDate);
    } else if (startDate) {
        sql += ' AND з.дата >= ?';
        params.push(startDate);
    } else if (endDate) {
        sql += ' AND з.дата <= ?';
        params.push(endDate);
    }
    
    if (createdSince) {
        sql += ' AND з.created_at >= ?';
        params.push(createdSince);
    }
    
    sql += ' ORDER BY з.дата ASC, з.время ASC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('SQL Error:', err.message);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: rows
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
    const createdSince = req.query.createdSince;
    
    let sql = `
        SELECT 
            з.id,
            з.дата,
            з.время,
            з.цена,
            з.created_at,
            к.имя as клиент_имя,
            к.телефон as клиент_телефон,
            к.tg_id as клиент_tg_id,
            у.название as услуга_название,
            м.имя as мастер_имя,
            м.tg_id as мастер_tg_id
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
    
    if (createdSince) {
        conditions.push('з.created_at >= ?');
        params.push(createdSince);
    }
    
    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    // ИСПРАВЛЕНИЕ: Добавляем сортировку по дате и времени
    sql += ' ORDER BY з.дата ASC, з.время ASC';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('SQL Error:', err.message);
            console.error('SQL Query:', sql);
            console.error('SQL Params:', params);
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
// API endpoint to update appointment - ИСПРАВЛЕННАЯ ВЕРСИЯ
app.put('/api/appointment/:id', (req, res) => {
    const appointmentId = req.params.id;
    const { date, time, clientName, clientPhone, serviceId } = req.body;
    
    if (!date || !time || !clientName || !clientPhone) {
        return res.status(400).json({ error: 'Дата, время, имя и телефон обязательны' });
    }
    
    // Start transaction
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // 1. Get current appointment data
        const getCurrentSql = `
            SELECT клиент_id, мастер_id, услуга_id, дата as old_date, время as old_time 
            FROM записи WHERE id = ?
        `;
        
        db.get(getCurrentSql, [appointmentId], (err, currentAppointment) => {
            if (err) {
                db.run("ROLLBACK");
                res.status(500).json({ error: err.message });
                return;
            }
            
            if (!currentAppointment) {
                db.run("ROLLBACK");
                res.status(404).json({ error: 'Запись не найдена' });
                return;
            }
            
            // 2. Free the old time slot if date or time changed
            if (currentAppointment.old_date !== date || currentAppointment.old_time !== time) {
                const freeOldTimeSql = `
                    UPDATE расписание 
                    SET доступно = 1 
                    WHERE мастер_id = ? 
                    AND услуга_id = ?
                    AND дата = ?
                    AND время = ?
                `;
                
                db.run(freeOldTimeSql, [
                    currentAppointment.мастер_id,
                    currentAppointment.услуга_id,
                    currentAppointment.old_date,
                    currentAppointment.old_time
                ], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    // Check if new time slot is available
                    checkNewTimeSlot();
                });
            } else {
                checkNewTimeSlot();
            }
            
            function checkNewTimeSlot() {
                // 3. Check if new time slot is available (if time changed)
                if (currentAppointment.old_date !== date || currentAppointment.old_time !== time) {
                    // Используем текущую услугу, если serviceId не передан
                    const finalServiceId = serviceId || currentAppointment.услуга_id;
                    
                    const checkTimeSql = `
                        SELECT id FROM расписание 
                        WHERE мастер_id = ? 
                        AND услуга_id = ?
                        AND дата = ?
                        AND время = ?
                        AND доступно = 1
                    `;
                    
                    db.get(checkTimeSql, [
                        currentAppointment.мастер_id,
                        finalServiceId,
                        date,
                        time
                    ], (err, row) => {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        if (!row) {
                            db.run("ROLLBACK");
                            res.status(409).json({ error: 'Новое время уже занято' });
                            return;
                        }
                        
                        const newScheduleId = row.id;
                        reserveNewTimeSlot(newScheduleId);
                    });
                } else {
                    // Time didn't change, just update client info and service (if changed)
                    updateAppointment(null);
                }
            }
            
            function reserveNewTimeSlot(scheduleId) {
                // 4. Reserve new time slot
                const reserveSql = "UPDATE расписание SET доступно = 0 WHERE id = ?";
                
                db.run(reserveSql, [scheduleId], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    updateAppointment(scheduleId);
                });
            }
            
            function updateAppointment(newScheduleId) {
                // 5. Update client information
                const updateClientSql = "UPDATE клиенты SET имя = ?, телефон = ? WHERE id = ?";
                
                db.run(updateClientSql, [clientName, clientPhone, currentAppointment.клиент_id], function(err) {
                    if (err) {
                        db.run("ROLLBACK");
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    
                    // 6. Определяем, нужно ли обновлять услугу и цену
                    const serviceChanged = serviceId && serviceId !== currentAppointment.услуга_id;
                    
                    if (serviceChanged) {
                        // Service changed - get new price
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
                            
                            const newPrice = serviceRow.цена;
                            updateAppointmentRecord(serviceId, newPrice);
                        });
                    } else {
                        // Service not changed - use current service and price
                        updateAppointmentRecord(currentAppointment.услуга_id, null);
                    }
                    
                    function updateAppointmentRecord(finalServiceId, newPrice) {
                        // 7. Update appointment record
                        let updateAppointmentSql;
                        let params;
                        
                        if (newPrice !== null) {
                            // Если цена изменилась
                            updateAppointmentSql = `
                                UPDATE записи 
                                SET услуга_id = ?, дата = ?, время = ?, цена = ?
                                WHERE id = ?
                            `;
                            params = [finalServiceId, date, time, newPrice, appointmentId];
                        } else {
                            // Если услуга не менялась, обновляем только дату и время
                            updateAppointmentSql = `
                                UPDATE записи 
                                SET дата = ?, время = ?
                                WHERE id = ?
                            `;
                            params = [date, time, appointmentId];
                        }
                        
                        db.run(updateAppointmentSql, params, function(err) {
                            if (err) {
                                db.run("ROLLBACK");
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // 8. Delete old notifications since appointment changed
                            const deleteNotificationsSql = "DELETE FROM уведомления WHERE запись_id = ?";
                            db.run(deleteNotificationsSql, [appointmentId], function(err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                
                                db.run("COMMIT", function(err) {
                                    if (err) {
                                        db.run("ROLLBACK");
                                        res.status(500).json({ error: err.message });
                                        return;
                                    }
                                    
                                    res.json({
                                        message: "success",
                                        data: {
                                            id: appointmentId,
                                            date,
                                            time,
                                            clientName,
                                            clientPhone,
                                            serviceId: finalServiceId
                                        }
                                    });
                                });
                            });
                        });
                    }
                });
            }
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
                        INSERT INTO записи (клиент_id, услуга_id, мастер_id, дата, время, цена, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+3 hours'))
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
    const sql = "SELECT id, имя, описание, фото, доступен, tg_id FROM мастера WHERE доступен != 0 ORDER BY доступен DESC, имя";    db.all(sql, [], (err, rows) => {
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
    const { имя, описание, фото, tg_id } = req.body;
    
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
    const { имя, описание, фото, tg_id } = req.body;
    
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


// API endpoint to get clients with statistics
app.get('/api/clients-with-stats', (req, res) => {
    const sql = `
        SELECT 
            к.id,
            к.имя,
            к.телефон,
            к.tg_id,
            COUNT(з.id) as recordsCount,
            COALESCE(SUM(з.цена), 0) as totalPrice,
            MAX(з.дата) as lastDate
        FROM клиенты к
        LEFT JOIN записи з ON к.id = з.клиент_id
        GROUP BY к.id, к.телефон
        ORDER BY totalPrice DESC, recordsCount DESC
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
// API endpoint to get client details with appointments
app.get('/api/client/:id/appointments', (req, res) => {
    const clientId = req.params.id;
    
    const clientSql = "SELECT id, имя, телефон, tg_id FROM клиенты WHERE id = ?";
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


// API endpoint для поиска клиента по номеру телефона
app.get('/api/client/by-phone/:phone', (req, res) => {
    const phone = req.params.phone;
    const sql = "SELECT * FROM клиенты WHERE телефон = ?";
    
    db.get(sql, [phone], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: row || null
        });
    });
});

// API endpoint для поиска клиента по tg_id
app.get('/api/client/by-tg/:tg_id', (req, res) => {
    const tg_id = req.params.tg_id;
    const sql = "SELECT * FROM клиенты WHERE tg_id = ?";
    
    db.get(sql, [tg_id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({
            message: "success",
            data: row || null
        });
    });
});

// API endpoint для создания нового клиента
app.post('/api/client', (req, res) => {
    const { имя, телефон, tg_id } = req.body;
    
    if (!имя || !телефон) {
        return res.status(400).json({ error: 'Имя и телефон обязательны' });
    }
    
    const sql = `INSERT INTO клиенты (имя, телефон, tg_id) VALUES (?, ?, ?)`;
    
    db.run(sql, [имя, телефон, tg_id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                имя,
                телефон,
                tg_id
            }
        });
    });
});

// API endpoint для обновления клиента
app.patch('/api/client/:id', (req, res) => {
    const clientId = req.params.id;
    const { tg_id } = req.body;
    
    if (!tg_id) {
        return res.status(400).json({ error: 'tg_id обязателен' });
    }
    
    const sql = `UPDATE клиенты SET tg_id = ? WHERE id = ?`;
    
    db.run(sql, [tg_id, clientId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        if (this.changes === 0) {
            res.status(404).json({ error: 'Клиент не найден' });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: clientId,
                tg_id
            }
        });
    });
});

// API endpoint для установки Telegram ID мастера
app.patch('/api/specialist/:id/tg-id', (req, res) => {
    const specialistId = req.params.id;
    const { tg_id } = req.body;
    
    const sql = `UPDATE мастера SET tg_id = ? WHERE id = ?`;
    
    db.run(sql, [tg_id, specialistId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: specialistId,
                tg_id
            }
        });
    });
});




// server.js - добавить в существующие endpoints
app.patch('/api/specialist/:id/tg-id', (req, res) => {
    const specialistId = req.params.id;
    const { tg_id } = req.body;
    
    const sql = `UPDATE мастера SET tg_id = ? WHERE id = ?`;
    
    db.run(sql, [tg_id, specialistId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: specialistId,
                tg_id
            }
        });
    });
});

db.get("SELECT COUNT(*) as count FROM настройки", [], (err, row) => {
    if (err) {
        console.error('Error checking settings table:', err.message);
    } else if (row.count === 0) {
        console.log('Adding default settings...');
        const defaultSettings = [
            ['show_specialists', '1', 'Показывать блок специалистов на сайте'],
            ['show_services', '1', 'Показывать блок услуг на сайте'],
            ['show_contacts', '1', 'Показывать блок контактов на сайте']
        ];
        
        const insertSql = "INSERT INTO настройки (ключ, значение, описание) VALUES (?, ?, ?)";
        defaultSettings.forEach(setting => {
            db.run(insertSql, setting);
        });
    }
});

// API endpoint to get settings
app.get('/api/settings', (req, res) => {
    const sql = "SELECT ключ, значение, описание FROM настройки";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const settings = {};
        rows.forEach(row => {
            settings[row.ключ] = row.значение;
        });
        
        res.json({
            message: "success",
            data: settings
        });
    });
});

// API endpoint to update setting
app.put('/api/settings/:key', (req, res) => {
    const key = req.params.key;
    const { значение } = req.body;
    
    if (значение === undefined) {
        return res.status(400).json({ error: 'Значение обязательно' });
    }
    
    const sql = `
        INSERT INTO настройки (ключ, значение) 
        VALUES (?, ?) 
        ON CONFLICT(ключ) 
        DO UPDATE SET значение = excluded.значение
    `;
    
    db.run(sql, [key, значение], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                ключ: key,
                значение: значение
            }
        });
    });
});

// server.js - исправленный endpoint статистики
// API endpoint для статистики с фильтрацией
app.get('/api/statistics', (req, res) => {
    const range = req.query.range || 'all';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    const masterId = req.query.masterId;
    const serviceId = req.query.serviceId;

    let dateCondition = '';
    let params = [];

    // Определяем условия для дат
    if (range === 'today') {
        dateCondition = ' AND з.дата = date("now")';
    } else if (range === 'week') {
        dateCondition = ' AND з.дата >= date("now", "weekday 1", "-7 days") AND з.дата <= date("now")';
    } else if (range === 'month') {
        dateCondition = ' AND з.дата >= date("now", "start of month") AND з.дата <= date("now")';
    } else if (range === 'custom' && startDate && endDate) {
        dateCondition = ' AND з.дата BETWEEN ? AND ?';
        params.push(startDate, endDate);
    }

    // Запрос для общей статистики
    const revenueSql = `
        SELECT 
            COUNT(з.id) as totalAppointments,
            COALESCE(SUM(з.цена), 0) as totalRevenue,
            CASE 
                WHEN COUNT(DISTINCT з.дата) > 0 THEN ROUND(COALESCE(SUM(з.цена), 0) / COUNT(DISTINCT з.дата))
                ELSE 0 
            END as dailyAverage
        FROM записи з
        WHERE 1=1 ${dateCondition}
        ${masterId ? ' AND з.мастер_id = ?' : ''}
        ${serviceId ? ' AND з.услуга_id = ?' : ''}
    `;

    // Запрос для статистики по услугам
    const servicesSql = `
        SELECT 
            у.id,
            у.название,
            COUNT(з.id) as count,
            COALESCE(SUM(з.цена), 0) as revenue
        FROM услуги у
        LEFT JOIN записи з ON у.id = з.услуга_id
        WHERE 1=1 ${dateCondition}
        ${masterId ? ' AND з.мастер_id = ?' : ''}
        ${serviceId ? ' AND у.id = ?' : ''}
        AND у.доступен = 1
        GROUP BY у.id
        HAVING count > 0
        ORDER BY revenue DESC
    `;

    // Запрос для статистики по мастерам
    const mastersSql = `
        SELECT 
            м.id,
            м.имя,
            COUNT(з.id) as count,
            COALESCE(SUM(з.цена), 0) as revenue
        FROM мастера м
        LEFT JOIN записи з ON м.id = з.мастер_id
        WHERE 1=1 ${dateCondition}
        ${masterId ? ' AND м.id = ?' : ''}
        ${serviceId ? ' AND з.услуга_id = ?' : ''}
        AND м.доступен = 1
        GROUP BY м.id
        HAVING count > 0
        ORDER BY revenue DESC
    `;

    // Добавляем параметры фильтрации
    const revenueParams = [...params];
    const servicesParams = [...params];
    const mastersParams = [...params];

    if (masterId) {
        revenueParams.push(masterId);
        servicesParams.push(masterId);
        mastersParams.push(masterId);
    }

    if (serviceId) {
        revenueParams.push(serviceId);
        servicesParams.push(serviceId);
        mastersParams.push(serviceId);
    }

    // Выполняем все запросы
    Promise.all([
        new Promise((resolve, reject) => {
            db.get(revenueSql, revenueParams, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(servicesSql, servicesParams, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        }),
        new Promise((resolve, reject) => {
            db.all(mastersSql, mastersParams, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        })
    ])
    .then(([revenueData, servicesData, mastersData]) => {
        // Рассчитываем проценты
        const totalRevenue = revenueData.totalRevenue || 0;
        
        const servicesWithPercentage = servicesData.map(service => ({
            ...service,
            percentage: totalRevenue > 0 ? Math.round((service.revenue / totalRevenue) * 100 * 10) / 10 : 0
        }));

        const mastersWithPercentage = mastersData.map(master => ({
            ...master,
            percentage: totalRevenue > 0 ? Math.round((master.revenue / totalRevenue) * 100 * 10) / 10 : 0
        }));

        res.json({
            message: "success",
            data: {
                totalRevenue: totalRevenue,
                totalAppointments: revenueData.totalAppointments || 0,
                dailyAverage: revenueData.dailyAverage || 0,
                byService: servicesWithPercentage,
                byMaster: mastersWithPercentage
            }
        });
    })
    .catch(err => {
        console.error('Ошибка загрузки статистики:', err);
        res.status(500).json({ error: 'Ошибка загрузки статистики' });
    });
});



// server.js - добавьте этот endpoint
app.post('/api/upload-default-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не был загружен' });
        }
        
        const type = req.body.type; // 'Master' или 'Service'
        const destinationDir = type === 'Master' ? 'работники' : 'услуги';
        const defaultPath = path.join(__dirname, 'photo', destinationDir, 'default.jpg');
        
        // Переименовываем загруженный файл в default.jpg
        fs.renameSync(req.file.path, defaultPath);
        
        res.json({
            message: "success",
            filePath: `photo/${destinationDir}/default.jpg`
        });
    } catch (error) {
        console.error('Ошибка загрузки фото по умолчанию:', error);
        res.status(500).json({ error: 'Ошибка загрузки фото' });
    }
});



app.get('/api/appointments-for-notifications', (req, res) => {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentDateTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    // Запись на завтра для daily уведомлений
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    // Запись через час для hourly уведомлений
    const oneHourLater = new Date();
    oneHourLater.setHours(oneHourLater.getHours() + 1);
    const oneHourLaterDateTime = oneHourLater.toISOString().replace('T', ' ').substring(0, 19);
    
    const sql = `
        SELECT 
            з.id,
            з.дата,
            з.время,
            з.created_at,
            к.имя as клиент_имя,
            к.телефон as клиент_телефон,
            к.tg_id as клиент_tg_id,
            у.название as услуга_название,
            у.цена as услуга_цена,
            м.имя as мастер_имя,
            м.tg_id as мастер_tg_id,
            -- Проверяем, нужно ли отправлять daily уведомление
            CASE 
                WHEN з.дата = ? AND з.время >= '00:00' 
                AND NOT EXISTS (
                    SELECT 1 FROM уведомления 
                    WHERE запись_id = з.id AND тип = 'daily' AND отправлено = 1
                ) THEN 1
                ELSE 0
            END as needs_daily_notification,
            -- Проверяем, нужно ли отправлять hourly уведомление
            CASE 
                WHEN CONCAT(з.дата, ' ', з.время) <= ? 
                AND NOT EXISTS (
                    SELECT 1 FROM уведомления 
                    WHERE запись_id = з.id AND тип = 'hourly' AND отправлено = 1
                ) THEN 1
                ELSE 0
            END as needs_hourly_notification
        FROM записи з
        JOIN клиенты к ON з.клиент_id = к.id
        JOIN услуги у ON з.услуга_id = у.id
        JOIN мастера м ON з.мастер_id = м.id
        WHERE з.дата >= ?
        AND (к.tg_id IS NOT NULL OR м.tg_id IS NOT NULL)
        ORDER BY з.дата, з.время
    `;
    
    db.all(sql, [tomorrowDate, oneHourLaterDateTime, currentDate], (err, rows) => {
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



// API endpoint для отметки уведомления как отправленного
app.post('/api/notification-sent', (req, res) => {
    const { запись_id, тип } = req.body;
    
    if (!запись_id || !тип) {
        return res.status(400).json({ error: 'Запись ID и тип обязательны' });
    }
    
    const sql = `
        INSERT INTO уведомления (запись_id, тип, отправлено) 
        VALUES (?, ?, 1)
        ON CONFLICT(запись_id, тип) 
        DO UPDATE SET отправлено = 1, время_отправки = CURRENT_TIMESTAMP
    `;
    
    db.run(sql, [запись_id, тип], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                id: this.lastID,
                запись_id,
                тип
            }
        });
    });
});



app.get('/api/check-notification', (req, res) => {
    const запись_id = req.query.запись_id;
    const тип = req.query.тип;
    
    const sql = "SELECT отправлено FROM уведомления WHERE запись_id = ? AND тип = ?";
    
    db.get(sql, [запись_id, тип], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            sent: row ? row.отправлено === 1 : false
        });
    });
});

// API endpoint для получения записей для hourly уведомлений
app.get('/api/appointments-for-hourly', (req, res) => {
    const startTime = req.query.startTime;
    const endTime = req.query.endTime;
    
    if (!startTime || !endTime) {
        return res.status(400).json({ error: 'Start and end times are required' });
    }
    
    const sql = `
        SELECT 
            з.id,
            з.дата,
            з.время,
            з.цена,
            к.имя as клиент_имя,
            к.телефон as клиент_телефон,
            к.tg_id as клиент_tg_id,
            у.название as услуга_название,
            м.имя as мастер_имя,
            м.tg_id as мастер_tg_id
        FROM записи з
        JOIN клиенты к ON з.клиент_id = к.id
        JOIN услуги у ON з.услуга_id = у.id
        JOIN мастера м ON з.мастер_id = м.id
        WHERE CONCAT(з.дата, ' ', з.время) BETWEEN ? AND ?
        AND (к.tg_id IS NOT NULL OR м.tg_id IS NOT NULL)
        ORDER BY з.дата, з.время
    `;
    
    db.all(sql, [startTime, endTime], (err, rows) => {
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
app.delete('/api/appointment/:id', (req, res) => {
    const appointmentId = req.params.id;

    // Start a transaction to ensure atomicity
    db.serialize(() => {
        // Get appointment details
        const getAppointmentSql = `
            SELECT мастер_id, услуга_id, дата, время 
            FROM записи 
            WHERE id = ?
        `;
        
        db.get(getAppointmentSql, [appointmentId], (err, appointment) => {
            if (err) {
                console.error('Error getting appointment:', err);
                return res.status(500).json({ error: 'Ошибка получения данных записи' });
            }
            
            if (!appointment) {
                return res.status(404).json({ error: 'Запись не найдена' });
            }
            
            // Delete the appointment
            const deleteSql = `DELETE FROM записи WHERE id = ?`;
            db.run(deleteSql, [appointmentId], function(err) {
                if (err) {
                    console.error('Error deleting appointment:', err);
                    return res.status(500).json({ error: 'Ошибка удаления записи' });
                }
                
                if (this.changes === 0) {
                    return res.status(404).json({ error: 'Запись не найдена' });
                }
                
                // Update corresponding schedule slot
                const updateScheduleSql = `
                    UPDATE расписание 
                    SET доступно = 1 
                    WHERE мастер_id = ? 
                    AND услуга_id = ? 
                    AND дата = ? 
                    AND время = ?
                `;
                
                db.run(updateScheduleSql, 
                    [appointment.мастер_id, appointment.услуга_id, appointment.дата, appointment.время], 
                    function(err) {
                        if (err) {
                            console.error('Error updating schedule:', err);
                            return res.status(500).json({ error: 'Ошибка обновления расписания' });
                        }
                        
                        // Log the update for debugging
                        console.log(`Updated schedule slot: master=${appointment.мастер_id}, service=${appointment.услуга_id}, date=${appointment.дата}, time=${appointment.время}, rows affected=${this.changes}`);
                        
                        res.json({
                            message: "success",
                            data: { 
                                id: appointmentId,
                                scheduleUpdated: this.changes > 0
                            }
                        });
                    }
                );
            });
        });
    });


});   



// server.js - добавить этот endpoint
app.get('/api/appointments-with-notifications', (req, res) => {
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
            к.tg_id as клиент_tg_id,
            у.название as услуга_название,
            м.имя as мастер_имя,
            м.tg_id as мастер_tg_id,
            увед_daily.отправлено as daily_sent
        FROM записи з
        JOIN клиенты к ON з.клиент_id = к.id
        JOIN услуги у ON з.услуга_id = у.id
        JOIN мастера м ON з.мастер_id = м.id
        LEFT JOIN уведомления увед_daily ON з.id = увед_daily.запись_id AND увед_daily.тип = 'daily'
        WHERE з.дата BETWEEN ? AND ?
        AND к.tg_id IS NOT NULL
    `;
    
    const params = [startDate, endDate];
    
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




// API endpoint для создания записи (клиентская версия)
app.post('/api/appointment', (req, res) => {
    const { specialistId, serviceId, date, time, clientName, clientPhone } = req.body;
    
    if (!specialistId || !serviceId || !date || !time || !clientName || !clientPhone) {
        return res.status(400).json({ error: 'Все поля обязательны для заполнения' });
    }
    
    // Start transaction
    db.serialize(() => {
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
                    
                    // 3. Check if time slot is available
                    const checkTimeSql = `
                        SELECT id FROM расписание 
                        WHERE мастер_id = ? 
                        AND услуга_id = ?
                        AND дата = ?
                        AND время = ?
                        AND доступно = 1
                    `;
                    
                    db.get(checkTimeSql, [specialistId, serviceId, date, time], (err, scheduleRow) => {
                        if (err) {
                            db.run("ROLLBACK");
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        
                        if (!scheduleRow) {
                            db.run("ROLLBACK");
                            res.status(409).json({ error: 'Выбранное время уже занято' });
                            return;
                        }
                        
                        const scheduleId = scheduleRow.id;
                        
                        // 4. Reserve the time slot
                        const reserveSql = "UPDATE расписание SET доступно = 0 WHERE id = ?";
                        db.run(reserveSql, [scheduleId], function(err) {
                            if (err) {
                                db.run("ROLLBACK");
                                res.status(500).json({ error: err.message });
                                return;
                            }
                            
                            // 5. Create appointment record
                            const insertAppointmentSql = `
                                INSERT INTO записи (клиент_id, услуга_id, мастер_id, дата, время, цена, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, datetime('now', '+3 hours'))
                            `;
                            
                            db.run(insertAppointmentSql, [clientId, serviceId, specialistId, date, time, price], function(err) {
                                if (err) {
                                    db.run("ROLLBACK");
                                    res.status(500).json({ error: err.message });
                                    return;
                                }
                                
                                const appointmentId = this.lastID;
                                
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
                                            id: appointmentId,
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
                });
            }
        });
    });
});


// Добавить после существующих endpoints для страниц

// API endpoint для получения всех элементов страницы с порядком
app.get('/api/page-content-full/:pageName', (req, res) => {
    const pageName = req.params.pageName;
    
    const sql = "SELECT элемент, текст, порядок FROM страницы WHERE страница = ? ORDER BY порядок";
    
    db.all(sql, [pageName], (err, rows) => {
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

// API endpoint для обновления порядка элементов
app.put('/api/page-content-order/:pageName', (req, res) => {
    const pageName = req.params.pageName;
    const { elements } = req.body;
    
    if (!elements || !Array.isArray(elements)) {
        return res.status(400).json({ error: 'Неверный формат данных' });
    }
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        elements.forEach((element, index) => {
            const sql = `
                UPDATE страницы 
                SET порядок = ? 
                WHERE страница = ? AND элемент = ?
            `;
            
            db.run(sql, [index, pageName, element]);
        });
        
        db.run("COMMIT", function(err) {
            if (err) {
                db.run("ROLLBACK");
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                message: "success",
                data: { updated: elements.length }
            });
        });
    });
});

// API endpoint для добавления нового элемента
app.post('/api/page-content/:pageName', (req, res) => {
    const pageName = req.params.pageName;
    const { элемент, текст } = req.body;
    
    if (!элемент || текст === undefined) {
        return res.status(400).json({ error: 'Элемент и текст обязательны' });
    }
    
    // Получаем максимальный порядок для установки нового элемента в конец
    const getMaxOrderSql = "SELECT MAX(порядок) as maxOrder FROM страницы WHERE страница = ?";
    
    db.get(getMaxOrderSql, [pageName], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        const newOrder = (row?.maxOrder || 0) + 1;
        
        const insertSql = `
            INSERT INTO страницы (страница, элемент, текст, порядок) 
            VALUES (?, ?, ?, ?)
        `;
        
        db.run(insertSql, [pageName, элемент, текст, newOrder], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            
            res.json({
                message: "success",
                data: {
                    id: this.lastID,
                    страница: pageName,
                    элемент: элемент,
                    текст: текст,
                    порядок: newOrder
                }
            });
        });
    });
});

// API endpoint для удаления элемента
app.delete('/api/page-content/:pageName/:element', (req, res) => {
    const pageName = req.params.pageName;
    const element = req.params.element;
    
    const sql = "DELETE FROM страницы WHERE страница = ? AND элемент = ?";
    
    db.run(sql, [pageName, element], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        
        res.json({
            message: "success",
            data: {
                deleted: true,
                страница: pageName,
                элемент: element
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
