const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;

const app = express();
const port = 5000;

// Cấu hình Cloudinary
cloudinary.config({ 
  cloud_name: 'haidinh',
  api_key: '437439486722378',
  api_secret: 'fck2-6TlAZXD5mu7_6MKfzlVeoQ'
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

// Cấu hình multer để xử lý upload file
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // giới hạn 5MB
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
        console.error('Lỗi khi thêm người dùng mới:', err);
        return res.status(500).json({ error: 'Lỗi hệ thống' });
      }
      res.status(201).json({ message: 'Đăng ký thành công!', userId: results.insertId });
    });
  });
});

// API lấy danh sách sản phẩm
app.get('/products', (req, res) => {
  const query = 'SELECT * FROM product';
  db.execute(query, (err, results) => {
    if (err) {
      console.error('Lỗi khi truy vấn bảng sản phẩm:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
    res.status(200).json(results);
  });
});

// API thêm sản phẩm mới với Cloudinary
app.post('/products', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'imagge_2', maxCount: 1 },
  { name: 'image_3', maxCount: 1 }
]), async (req, res) => {
  try {
      const { name, price, description, category, cpu, ram, sd, manhinh, card } = req.body;

      // Kiểm tra dữ liệu đầu vào
      if (!name || !price || !description || !category) {
          return res.status(400).json({
              error: 'Thiếu thông tin sản phẩm cần thiết'
          });
      }

      // Upload ảnh lên Cloudinary
      const uploadToCloudinary = async (file) => {
          if (!file) return null;
          const b64 = Buffer.from(file.buffer).toString('base64');
          const dataURI = "data:" + file.mimetype + ";base64," + b64;
          const result = await cloudinary.uploader.upload(dataURI);
          return result.secure_url;
      };

      const image = req.files['image'] ? await uploadToCloudinary(req.files['image'][0]) : null;
      const imagge_2 = req.files['imagge_2'] ? await uploadToCloudinary(req.files['imagge_2'][0]) : null;
      const image_3 = req.files['image_3'] ? await uploadToCloudinary(req.files['image_3'][0]) : null;

      // Sử dụng Promise để xử lý database
      const insertProduct = () => {
          return new Promise((resolve, reject) => {
              const query = 'INSERT INTO product (name, price, description, category, image, imagge_2, image_3, cpu, ram, sd, manhinh, card) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
              
              db.execute(query, [
                  name,
                  Number(price),
                  description,
                  category,
                  image,
                  imagge_2,
                  image_3,
                  cpu || '',
                  ram || '',
                  sd || '',
                  manhinh || '',
                  card || ''
              ], (err, results) => {
                  if (err) reject(err);
                  else resolve(results);
              });
          });
      };

      const result = await insertProduct();
      
      res.status(201).json({
          message: 'Thêm sản phẩm thành công',
          productId: result.insertId
      });

  } catch (error) {
      console.error('Chi tiết lỗi:', error);
      res.status(500).json({
          error: 'Lỗi khi lưu vào database',
          details: error.message
      });
  }
});



// API lấy chi tiết sản phẩm theo ID
app.get('/products/:id', (req, res) => {
  const productId = req.params.id;
  const query = 'SELECT * FROM product WHERE id = ?';

  db.execute(query, [productId], (err, results) => {
    if (err) {
      console.error('Lỗi khi truy vấn chi tiết sản phẩm:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.status(200).json(results[0]);
  });
});

// API sửa sản phẩm với Cloudinary
app.put('/products/:id', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagge_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 }
]), async (req, res) => {
    try {
      console.log('Files received:', req.files);
        const productId = req.params.id;
        const { name, price, description, category, cpu, ram, sd, manhinh, card } = req.body;

        const uploadToCloudinary = async (file) => {
            if (!file) return null;
            console.log('Uploading file:', file.originalname);
            const b64 = Buffer.from(file.buffer).toString('base64');
            const dataURI = "data:" + file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI);
            console.log('Upload result:', result);
            return result.secure_url;
        };

        const [image, imagge_2, image_3] = await Promise.all([
            uploadToCloudinary(req.files['image']?.[0]),
            uploadToCloudinary(req.files['imagge_2']?.[0]),
            uploadToCloudinary(req.files['image_3']?.[0])
        ]);

        const query = `
            UPDATE product 
            SET name = ?, price = ?, description = ?, category = ?, 
                image = COALESCE(?, image), 
                imagge_2 = COALESCE(?, imagge_2), 
                image_3 = COALESCE(?, image_3),
                cpu = ?, ram = ?, sd = ?, manhinh = ?, card = ? 
            WHERE id = ?
        `;

        db.execute(query, [
            name, price, description, category, 
            image, imagge_2, image_3,
            cpu, ram, sd, manhinh, card, 
            productId
        ], (err, results) => {
            if (err) {
                console.error('Lỗi khi cập nhật sản phẩm:', err);
                return res.status(500).json({ error: 'Lỗi hệ thống' });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
            }
            res.status(200).json({ message: 'Cập nhật sản phẩm thành công' });
        });
    } catch (error) {
      console.log('Detailed error:', error);
        res.status(500).json({ error: 'Lỗi upload ảnh' });
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

    res.status(200).json({ message: 'Sản phẩm đã được xóa' });
  });
});

// API lấy danh sách đơn hàng
app.get('/orders', (req, res) => {
  const query = 'SELECT * FROM `order`';
  db.execute(query, (err, results) => {
    if (err) {
      console.error('Lỗi khi truy vấn bảng order:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
    res.status(200).json(results);
  });
});

// API thêm đơn hàng
app.post('/orders', (req, res) => {
  const { name, image, price, Address, phone, name_user, day } = req.body;

  if (!name || !image || !price || !Address || !phone || !name_user || !day) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
  }

  const query = 'INSERT INTO `order` (name, image, price, Address, phone, name_user, day) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.execute(query, [name, image, price, Address, phone, name_user, day], (err, results) => {
    if (err) {
      console.error('Lỗi khi thêm đơn hàng:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }
    res.status(201).json({
      message: 'Đơn hàng đã được thêm thành công',
      orderId: results.insertId
    });
  });
});

// API xóa đơn hàng
app.delete('/orders/:id', (req, res) => {
  const orderId = req.params.id;
  const query = 'DELETE FROM `order` WHERE id = ?';

  db.execute(query, [orderId], (err, results) => {
    if (err) {
      console.error('Lỗi khi xóa đơn hàng:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    res.status(200).json({ message: 'Đơn hàng đã được xóa thành công' });
  });
});

// API xóa người dùng
app.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = 'DELETE FROM user WHERE id = ?';

  db.execute(query, [userId], (err, results) => {
    if (err) {
      console.error('Lỗi khi xóa tài khoản người dùng:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng' });
    }

    res.status(200).json({ message: 'Tài khoản người dùng đã được xóa thành công' });
  });
});

// API sửa thông tin người dùng
app.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const { fullname, email, password, phone, address, level, avatar } = req.body;

  const query = `
    UPDATE user 
    SET fullname = ?, email = ?, password = ?, phone = ?, address = ?, level = ?, avatar = ? 
    WHERE id = ?
  `;

  db.execute(query, [fullname, email, password, phone, address, level, avatar, userId], (err, results) => {
    if (err) {
      console.error('Lỗi khi cập nhật thông tin người dùng:', err);
      return res.status(500).json({ error: 'Lỗi hệ thống' });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản người dùng' });
    }

    res.status(200).json({ message: 'Thông tin người dùng đã được cập nhật thành công' });
  });
});




// Khởi động server  
app.listen(port, () => {
  console.log(`Server đang chạy tại http://localhost:${port}`);
});
