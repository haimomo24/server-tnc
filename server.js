const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Kết nối MySQL
const db = mysql.createPool({
  host: 'sql12.freemysqlhosting.net',
  user: 'sql12744721',
  password: 'DUS9RQJlKM',
  database: 'sql12744721',
});

// Kiểm tra kết nối cơ sở dữ liệu
db.getConnection()
  .then(() => console.log('Kết nối thành công tới cơ sở dữ liệu'))
  .catch((err) => console.error('Không thể kết nối tới cơ sở dữ liệu:', err));

// Cấu hình multer để upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/product-images/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware xử lý lỗi
const asyncHandler = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// API: Lấy danh sách người dùng
app.get(
  '/users',
  asyncHandler(async (req, res) => {
    const [users] = await db.query('SELECT * FROM user');
    res.status(200).json(users);
  })
);

// API: Đăng ký
app.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { fullname, email, password, phone, address, level, avatar } = req.body;

    if (!fullname || !email || !password || !phone || !address || !level || !avatar) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const [existingUser] = await db.query('SELECT * FROM user WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email này đã được sử dụng.' });
    }

    const [result] = await db.query(
      'INSERT INTO user (fullname, email, password, phone, address, level, avatar) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullname, email, password, phone, address, level, avatar]
    );
    res.status(201).json({ message: 'Đăng ký thành công!', userId: result.insertId });
  })
);

// API: Lấy danh sách sản phẩm
app.get(
  '/products',
  asyncHandler(async (req, res) => {
    const [products] = await db.query('SELECT * FROM product');
    res.status(200).json(products);
  })
);

// API: Thêm sản phẩm mới
app.post(
  '/products',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagge_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const { name, price, description, category, cpu, ram, sd, manhinh, card } = req.body;

    const image = req.files['image'] ? '/uploads/product-images/' + req.files['image'][0].filename : null;
    const imagge_2 = req.files['imagge_2'] ? '/uploads/product-images/' + req.files['imagge_2'][0].filename : null;
    const image_3 = req.files['image_3'] ? '/uploads/product-images/' + req.files['image_3'][0].filename : null;

    const query =
      'INSERT INTO product (name, price, description, category, image, imagge_2, image_3, cpu, ram, sd, manhinh, card) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';

    const [result] = await db.query(query, [
      name,
      price,
      description,
      category,
      image,
      imagge_2,
      image_3,
      cpu,
      ram,
      sd,
      manhinh,
      card,
    ]);

    res.status(201).json({ message: 'Thêm sản phẩm thành công', productId: result.insertId });
  })
);

// API: Lấy chi tiết sản phẩm
app.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [product] = await db.query('SELECT * FROM product WHERE id = ?', [id]);

    if (product.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.status(200).json(product[0]);
  })
);

// API: Sửa sản phẩm
app.put(
  '/products/:id',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'imagge_2', maxCount: 1 },
    { name: 'image_3', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, price, description, category, cpu, ram, sd, manhinh, card } = req.body;

    const image = req.files['image'] ? '/uploads/product-images/' + req.files['image'][0].filename : null;
    const imagge_2 = req.files['imagge_2'] ? '/uploads/product-images/' + req.files['imagge_2'][0].filename : null;
    const image_3 = req.files['image_3'] ? '/uploads/product-images/' + req.files['image_3'][0].filename : null;

    const query =
      'UPDATE product SET name = ?, price = ?, description = ?, category = ?, image = ?, imagge_2 = ?, image_3 = ?, cpu = ?, ram = ?, sd = ?, manhinh = ?, card = ? WHERE id = ?';

    const [result] = await db.query(query, [
      name,
      price,
      description,
      category,
      image,
      imagge_2,
      image_3,
      cpu,
      ram,
      sd,
      manhinh,
      card,
      id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.status(200).json({ message: 'Sản phẩm đã được sửa thành công' });
  })
);

// API: Xóa sản phẩm
app.delete(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const [result] = await db.query('DELETE FROM product WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
    }

    res.status(200).json({ message: 'Sản phẩm đã được xóa' });
  })
);

// API: Thêm đơn hàng
app.post(
  '/orders',
  asyncHandler(async (req, res) => {
    const { name, image, price, Address, phone, name_user } = req.body;
    const query = 'INSERT INTO `order` (name, image, price, Address, phone, name_user) VALUES (?, ?, ?, ?, ?, ?)';

    const [result] = await db.query(query, [name, image, price, Address, phone, name_user]);

    res.status(201).json({ message: 'Đơn hàng đã được tạo', orderId: result.insertId });
  })
);

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Lỗi hệ thống' });
});

app.listen(port, () => {
  console.log(`Server đang chạy trên cổng ${port}`);
});
