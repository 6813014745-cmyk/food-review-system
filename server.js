const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const app = express();
const port = process.env.PORT || 3000;

const bundledDataFilePath = path.join(__dirname, 'data', 'mock-data.json');
const runtimeDataFilePath = process.env.DATA_FILE_PATH
  || (process.env.VERCEL ? path.join('/tmp', 'food-review-data.json') : bundledDataFilePath);
const dataFilePath = runtimeDataFilePath;

const scoreFields = [
  'appearance_score',
  'taste_score',
  'cleanliness_score',
  'price_score',
  'value_score'
];

const scoreLabels = {
  appearance_score: 'ความน่ารับประทาน',
  taste_score: 'รสชาติ',
  cleanliness_score: 'ความสะอาด',
  price_score: 'ราคา',
  value_score: 'ความคุ้มค่าโดยรวม'
};

const menuTemplates = [
  { name: 'ข้าวกะเพราไก่ไข่ดาว', category: 'อาหารจานเดียว', description: 'เมนูอาหารจานเดียวรสจัด' },
  { name: 'ข้าวผัดกุ้ง', category: 'อาหารจานเดียว', description: 'ข้าวผัดหอมกลิ่นกระทะ เสิร์ฟพร้อมกุ้งสด' },
  { name: 'ข้าวมันไก่', category: 'อาหารจานเดียว', description: 'ข้าวมันหอม เสิร์ฟกับไก่นุ่มและน้ำจิ้มสูตรพิเศษ' },
  { name: 'ผัดไทยกุ้งสด', category: 'อาหารจานเดียว', description: 'เส้นเหนียวนุ่มกับซอสผัดไทยสูตรเข้มข้น' },
  { name: 'ต้มยำกุ้ง', category: 'อาหารไทย', description: 'ซุปต้มยำรสจัดจ้าน หอมสมุนไพรไทย' },
  { name: 'แกงเขียวหวานไก่', category: 'อาหารไทย', description: 'แกงกะทิหอมเครื่องแกงแบบไทยแท้' },
  { name: 'ส้มตำไทย', category: 'ส้มตำ', description: 'รสเปรี้ยว หวาน เค็ม เผ็ด ครบ' },
  { name: 'ส้มตำปูปลาร้า', category: 'ส้มตำ', description: 'เข้มข้นถึงเครื่องปลาร้า' },
  { name: 'ชาเย็น', category: 'เครื่องดื่ม', description: 'เครื่องดื่มหวานหอมแบบไทย' },
  { name: 'กาแฟเย็น', category: 'เครื่องดื่ม', description: 'กาแฟหอมเข้ม ดื่มง่าย' },
  { name: 'ไก่ทอดกระเทียม', category: 'กับข้าว', description: 'ไก่ทอดกรอบนอกนุ่มใน โรยกระเทียมหอม' },
  { name: 'ไข่เจียวหมูสับ', category: 'กับข้าว', description: 'ไข่เจียวฟู ๆ กับหมูสับร้อน ๆ' },
  { name: 'ก๋วยเตี๋ยวเรือ', category: 'ก๋วยเตี๋ยว', description: 'น้ำซุปเข้มข้น เสิร์ฟเครื่องแน่น' },
  { name: 'เย็นตาโฟ', category: 'ก๋วยเตี๋ยว', description: 'เส้นนุ่ม น้ำซุปสีสวย รสกลมกล่อม' },
  { name: 'ไอศกรีมกะทิ', category: 'ของหวาน', description: 'หอมมัน เย็นสดชื่น' }
];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function averageFromReview(review) {
  const total = scoreFields.reduce((sum, field) => sum + Number(review[field] || 0), 0);
  return Number((total / scoreFields.length).toFixed(2));
}

function validateScore(value) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

function validateMenuPayload(body) {
  const name = String(body.name || '').trim();
  if (!name) {
    return 'กรุณาระบุชื่อเมนู';
  }

  return null;
}

function validateReviewPayload(body) {
  for (const field of scoreFields) {
    if (!validateScore(body[field])) {
      return `คะแนน "${scoreLabels[field]}" ต้องเป็นเลขจำนวนเต็ม 1-5`;
    }
  }
  return null;
}

async function ensureDataDir() {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
}

function createSeedData() {
  return {
    menuTemplates,
    menus: menuTemplates.map((item, index) => ({
      id: index + 1,
      name: item.name,
      category: item.category,
      description: item.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })),
    reviews: [],
    counters: {
      menuId: menuTemplates.length,
      reviewId: 0
    }
  };
}

async function readBundledSeedData() {
  const raw = await fs.readFile(bundledDataFilePath, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    menuTemplates: Array.isArray(parsed.menuTemplates) && parsed.menuTemplates.length
      ? parsed.menuTemplates
      : menuTemplates,
    menus: Array.isArray(parsed.menus) ? parsed.menus : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    counters: {
      menuId: Number(parsed.counters?.menuId || 0),
      reviewId: Number(parsed.counters?.reviewId || 0)
    }
  };
}

async function loadData() {
  try {
    const raw = await fs.readFile(dataFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      menuTemplates: Array.isArray(parsed.menuTemplates) && parsed.menuTemplates.length
        ? parsed.menuTemplates
        : menuTemplates,
      menus: Array.isArray(parsed.menus) ? parsed.menus : [],
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
      counters: {
        menuId: Number(parsed.counters?.menuId || 0),
        reviewId: Number(parsed.counters?.reviewId || 0)
      }
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      const seed = dataFilePath === bundledDataFilePath
        ? createSeedData()
        : await readBundledSeedData().catch(() => createSeedData());
      await saveData(seed);
      return seed;
    }

    throw error;
  }
}

async function saveData(data) {
  await ensureDataDir();
  await fs.writeFile(dataFilePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function buildMenuSummary(menu, reviews) {
  const menuReviews = reviews.filter((review) => review.menu_id === menu.id);
  const reviewCount = menuReviews.length;
  const averageScore = reviewCount
    ? Number((menuReviews.reduce((sum, review) => sum + Number(review.average_score || 0), 0) / reviewCount).toFixed(2))
    : 0;

  return {
    ...menu,
    review_count: reviewCount,
    average_score: averageScore
  };
}

app.get('/api/health', async (_req, res) => {
  try {
    await loadData();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'ไม่สามารถอ่านข้อมูลสมมุติได้', error: error.message });
  }
});

app.get('/api/menu-templates', async (_req, res) => {
  try {
    const data = await loadData();
    res.json(data.menuTemplates);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงตัวอย่างเมนูได้', error: error.message });
  }
});

app.get('/api/menus', async (_req, res) => {
  try {
    const data = await loadData();
    const menus = data.menus
      .map((menu) => buildMenuSummary(menu, data.reviews))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);

    res.json(menus);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงรายการเมนูได้', error: error.message });
  }
});

app.get('/api/menus/:id', async (req, res) => {
  try {
    const menuId = Number(req.params.id);
    if (!Number.isInteger(menuId)) {
      return res.status(400).json({ message: 'รหัสเมนูไม่ถูกต้อง' });
    }

    const data = await loadData();
    const menu = data.menus.find((item) => item.id === menuId);
    if (!menu) {
      return res.status(404).json({ message: 'ไม่พบเมนูที่เลือก' });
    }

    const reviews = data.reviews
      .filter((review) => review.menu_id === menuId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);

    res.json({
      ...menu,
      review_count: reviews.length,
      average_score: reviews.length
        ? Number((reviews.reduce((sum, review) => sum + Number(review.average_score || 0), 0) / reviews.length).toFixed(2))
        : 0,
      reviews
    });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงรายละเอียดเมนูได้', error: error.message });
  }
});

app.post('/api/menus', async (req, res) => {
  try {
    const validationError = validateMenuPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const data = await loadData();
    const now = new Date().toISOString();
    const menu = {
      id: data.counters.menuId + 1,
      name: String(req.body.name).trim(),
      description: String(req.body.description || '').trim(),
      category: String(req.body.category || '').trim(),
      created_at: now,
      updated_at: now
    };

    data.counters.menuId = menu.id;
    data.menus.push(menu);
    await saveData(data);

    res.status(201).json(buildMenuSummary(menu, data.reviews));
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถเพิ่มเมนูได้', error: error.message });
  }
});

app.put('/api/menus/:id', async (req, res) => {
  try {
    const menuId = Number(req.params.id);
    if (!Number.isInteger(menuId)) {
      return res.status(400).json({ message: 'รหัสเมนูไม่ถูกต้อง' });
    }

    const validationError = validateMenuPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const data = await loadData();
    const menuIndex = data.menus.findIndex((item) => item.id === menuId);
    if (menuIndex === -1) {
      return res.status(404).json({ message: 'ไม่พบเมนูที่ต้องการแก้ไข' });
    }

    const updatedMenu = {
      ...data.menus[menuIndex],
      name: String(req.body.name).trim(),
      description: String(req.body.description || '').trim(),
      category: String(req.body.category || '').trim(),
      updated_at: new Date().toISOString()
    };

    data.menus[menuIndex] = updatedMenu;
    await saveData(data);

    res.json(buildMenuSummary(updatedMenu, data.reviews));
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถแก้ไขเมนูได้', error: error.message });
  }
});

app.delete('/api/menus/:id', async (req, res) => {
  try {
    const menuId = Number(req.params.id);
    if (!Number.isInteger(menuId)) {
      return res.status(400).json({ message: 'รหัสเมนูไม่ถูกต้อง' });
    }

    const data = await loadData();
    const menuExists = data.menus.some((item) => item.id === menuId);
    if (!menuExists) {
      return res.status(404).json({ message: 'ไม่พบเมนูที่ต้องการลบ' });
    }

    data.menus = data.menus.filter((item) => item.id !== menuId);
    data.reviews = data.reviews.filter((review) => review.menu_id !== menuId);
    await saveData(data);

    res.json({ message: 'ลบเมนูเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถลบเมนูได้', error: error.message });
  }
});

app.post('/api/menus/:id/reviews', async (req, res) => {
  try {
    const menuId = Number(req.params.id);
    if (!Number.isInteger(menuId)) {
      return res.status(400).json({ message: 'รหัสเมนูไม่ถูกต้อง' });
    }

    const validationError = validateReviewPayload(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const data = await loadData();
    const menuExists = data.menus.some((item) => item.id === menuId);
    if (!menuExists) {
      return res.status(404).json({ message: 'ไม่พบเมนูที่ต้องการรีวิว' });
    }

    const review = {
      id: data.counters.reviewId + 1,
      menu_id: menuId,
      appearance_score: Number(req.body.appearance_score),
      taste_score: Number(req.body.taste_score),
      cleanliness_score: Number(req.body.cleanliness_score),
      price_score: Number(req.body.price_score),
      value_score: Number(req.body.value_score),
      average_score: averageFromReview(req.body),
      created_at: new Date().toISOString()
    };

    data.counters.reviewId = review.id;
    data.reviews.push(review);
    await saveData(data);

    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถบันทึกรีวิวได้', error: error.message });
  }
});

app.get('/api/menus/:id/reviews', async (req, res) => {
  try {
    const menuId = Number(req.params.id);
    if (!Number.isInteger(menuId)) {
      return res.status(400).json({ message: 'รหัสเมนูไม่ถูกต้อง' });
    }

    const data = await loadData();
    const reviews = data.reviews
      .filter((review) => review.menu_id === menuId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'ไม่สามารถดึงข้อมูลรีวิวได้', error: error.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Food Review System is running on http://localhost:${port}`);
    console.log('Using local JSON mock data instead of MySQL.');
  });
}

module.exports = app;
