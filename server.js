const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config(); // Đảm bảo bạn đã cài đặt dotenv

const app = express();
const port = 5000;

// Cấu hình Cloudinary từ biến môi trường
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình MySQL kết nối
const db = mysql.createConnection({
    host: 'sql12.freemysqlhosting.net',
    user: 'sql12744721',
    password: 'DUS9RQJlKM',
    database: 'sql12744721',
});

// Kết nối MySQL
db.connect((err) => {
    if (err) {
        console.error('Không thể kết nối tới cơ sở dữ liệu:', err);
    } else {
        console.log('Kết nối thành công tới cơ sở dữ liệu');
    }
});

// Cấu hình CORS
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/product-images/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// API lấy danh sách người dùng
app.get('/users', (req, res) => {
    const query = 'SELECT * FROM user';
    db.execute(query, (err, results) => {
        if (err) {
            console.error('Lỗi khi truy vấn bảng user:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống' });
        }
        res.status(200).json(results);
    });
});

// API đăng ký
app.post('/register', (req, res) => {
    const { fullname, email, password, phone, address, level, avatar } = req.body;

    if (!fullname || !email || !password || !phone || !address || !level || !avatar) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const checkUserQuery = 'SELECT * FROM user WHERE email = ?';
    db.execute(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Lỗi khi kiểm tra email:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống' });
        }

        if (results.length > 0) {
            return res.status(400).json({ error: 'Email này đã được sử dụng.' });
        }

        const insertUserQuery = 'INSERT INTO user (fullname, email, password, phone, address, level, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)';
        db.execute(insertUserQuery, [fullname, email, password, phone, address, level, avatar], (err, results) => {
            if (err) {
                console.error('Lỗi khi thêm người dùng mới:', err.message);
                return res.status(500).json({ error: 'Lỗi hệ thống' });
            }
            res.status(201).json({ message: 'Đăng ký thành công!', userId: results.insertId });
        });
    });
});

// API thêm sản phẩm mới
app.post('/products', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagge_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 }
]), async (req, res) => {
    try {
        const { name, price, description, category, cpu, ram, sd, manhinh, card } = req.body;

        console.log('Dữ liệu nhận được:', {
            body: req.body,
            files: req.files
        });

        const uploadToCloudinary = async (file) => {
            if (!file) return null;
            const result = await cloudinary.uploader.upload(file.path);
            return result.secure_url;
        };

        const imageUrls = {
            image: req.files?.image ? await uploadToCloudinary(req.files['image'][0]) : null,
            imagge_2: req.files?.imagge_2 ? await uploadToCloudinary(req.files['imagge_2'][0]) : null,
            image_3: req.files?.image_3 ? await uploadToCloudinary(req.files['image_3'][0]) : null
        };

        const query = `
            INSERT INTO product 
            (name, price, description, category, image, imagge_2, image_3, cpu, ram, sd, manhinh, card) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            name,
            Number(price),
            description,
            category,
            imageUrls.image,
            imageUrls.imagge_2,
            imageUrls.image_3,
            cpu,
            ram,
            sd,
            manhinh,
            card
        ];

        db.execute(query, values, (err, result) => {
            if (err) {
                console.error('Lỗi database:', err);
                return res.status(500).json({ error: 'Lỗi database', details: err.message });
            }
            
            res.status(201).json({
                message: 'Thêm sản phẩm thành công',
                productId: result.insertId,
                imageUrls
            });
        });

    } catch (error) {
        console.error('Lỗi server:', error);
        res.status(500).json({ error: 'Lỗi server', details: error.message });
    }
});

// API xóa sản phẩm
app.delete('/products/:id', (req, res) => {
    const productId = req.params.id;
    const query = 'DELETE FROM product WHERE id = ?';

    db.execute(query, [productId], (err, results) => {
        if (err) {
            console.error('Lỗi khi xóa sản phẩm:', err);
            return res.status(500).json({ error: 'Lỗi hệ thống' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        res.status(200).json({ message: 'Xóa sản phẩm thành công' });
    });
});

// Khởi động server
app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});
