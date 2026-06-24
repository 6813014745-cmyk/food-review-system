const state = {
  menus: [],
  selectedMenuId: null,
  selectedMenu: null
};

const menuList = document.getElementById('menuList');
const menuCount = document.getElementById('menuCount');
const reviewCount = document.getElementById('reviewCount');
const overallAverage = document.getElementById('overallAverage');
const detailEmptyState = document.getElementById('detailEmptyState');
const detailView = document.getElementById('detailView');
const detailCategory = document.getElementById('detailCategory');
const detailName = document.getElementById('detailName');
const detailDescription = document.getElementById('detailDescription');
const detailAverage = document.getElementById('detailAverage');
const reviewForm = document.getElementById('reviewForm');
const scoreBreakdown = document.getElementById('scoreBreakdown');
const reviewList = document.getElementById('reviewList');
const reviewMeta = document.getElementById('reviewMeta');
const addMenuButton = document.getElementById('addMenuButton');
const menuDialog = document.getElementById('menuDialog');
const menuForm = document.getElementById('menuForm');
const menuFormTitle = document.getElementById('menuFormTitle');
const closeMenuDialog = document.getElementById('closeMenuDialog');
const cancelMenuButton = document.getElementById('cancelMenuButton');
const menuIdInput = document.getElementById('menuId');
const menuNameInput = document.getElementById('menuName');
const menuCategoryInput = document.getElementById('menuCategory');
const menuDescriptionInput = document.getElementById('menuDescription');
const templateChips = document.getElementById('templateChips');
const menuNameSuggestions = document.getElementById('menuNameSuggestions');
const menuCategorySuggestions = document.getElementById('menuCategorySuggestions');

const reviewFields = [
  { key: 'appearance_score', label: 'ความน่ารับประทาน' },
  { key: 'taste_score', label: 'รสชาติ' },
  { key: 'cleanliness_score', label: 'ความสะอาด' },
  { key: 'price_score', label: 'ราคา' },
  { key: 'value_score', label: 'ความคุ้มค่าโดยรวม' }
];

const menuTemplates = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์');
  }
  return payload;
}

function openMenuDialog(menu = null) {
  menuForm.reset();
  if (menu) {
    menuFormTitle.textContent = 'แก้ไขเมนู';
    menuIdInput.value = menu.id;
    menuNameInput.value = menu.name || '';
    menuCategoryInput.value = menu.category || '';
    menuDescriptionInput.value = menu.description || '';
  } else {
    menuFormTitle.textContent = 'เพิ่มเมนู';
    menuIdInput.value = '';
  }
  menuDialog.showModal();
}

function setTemplateFields(template) {
  if (!template) return;
  menuNameInput.value = template.name || '';
  menuCategoryInput.value = template.category || '';
  menuDescriptionInput.value = template.description || '';
  menuNameInput.focus();
}

function renderTemplateHelpers(templates) {
  const categories = [...new Set(templates.map((item) => item.category).filter(Boolean))];

  menuNameSuggestions.innerHTML = templates
    .map((item) => `<option value="${escapeHtml(item.name)}"></option>`)
    .join('');

  menuCategorySuggestions.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join('');

  templateChips.innerHTML = categories
    .map((category) => {
      const items = templates.filter((item) => item.category === category).slice(0, 4);
      return `
        <div class="template-group">
          <div class="template-group-title">${escapeHtml(category)}</div>
          <div class="template-group-chips">
            ${items
              .map(
                (item) =>
                  `<button type="button" class="template-chip" data-template-name="${escapeHtml(item.name)}">${escapeHtml(item.name)}</button>`
              )
              .join('')}
          </div>
        </div>
      `;
    })
    .join('');
}

function syncTemplateFromName() {
  const match = menuTemplates.find((item) => item.name === menuNameInput.value.trim());
  if (!match) return;
  if (!menuCategoryInput.value.trim()) {
    menuCategoryInput.value = match.category || '';
  }
  if (!menuDescriptionInput.value.trim()) {
    menuDescriptionInput.value = match.description || '';
  }
}

function closeDialog() {
  menuDialog.close();
}

function renderSummary() {
  const menuTotal = state.menus.length;
  const reviewTotal = state.menus.reduce((sum, menu) => sum + Number(menu.review_count || 0), 0);
  const averageTotal = reviewTotal
    ? state.menus.reduce((sum, menu) => sum + Number(menu.average_score || 0) * Number(menu.review_count || 0), 0) / reviewTotal
    : 0;

  menuCount.textContent = menuTotal.toString();
  reviewCount.textContent = reviewTotal.toString();
  overallAverage.textContent = averageTotal.toFixed(2);
}

function renderMenuList() {
  if (state.menus.length === 0) {
    menuList.innerHTML = `
      <div class="empty-state">
        <h3>ยังไม่มีเมนู</h3>
        <p>กดปุ่มเพิ่มเมนูเพื่อเริ่มต้นใช้งาน</p>
      </div>
    `;
    renderSummary();
    return;
  }

  menuList.innerHTML = state.menus
    .map((menu) => {
      const active = menu.id === state.selectedMenuId ? 'active' : '';
      return `
        <article class="menu-card ${active}">
          <div class="menu-card-top">
            <div>
              <h3>${escapeHtml(menu.name)}</h3>
              <div class="menu-meta">
                ${menu.category ? `<span class="tag">${escapeHtml(menu.category)}</span>` : ''}
                <span>${Number(menu.review_count || 0)} รีวิว</span>
                <span>เฉลี่ย ${Number(menu.average_score || 0).toFixed(2)}</span>
              </div>
            </div>
            <div class="tag">${Number(menu.average_score || 0).toFixed(2)}</div>
          </div>
          ${menu.description ? `<p>${escapeHtml(menu.description)}</p>` : ''}
          <div class="menu-actions">
            <button class="primary" data-action="select" data-id="${menu.id}">ดูรีวิว</button>
            <button class="ghost" data-action="edit" data-id="${menu.id}">แก้ไข</button>
            <button class="ghost" data-action="delete" data-id="${menu.id}">ลบ</button>
          </div>
        </article>
      `;
    })
    .join('');

  renderSummary();
}

function renderReviewForm() {
  reviewForm.innerHTML = reviewFields
    .map(
      (field) => `
        <div class="field">
          <label>
            ${field.label}
            <select name="${field.key}" required>
              <option value="">เลือกคะแนน</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </label>
        </div>
      `
    )
    .join('');

  reviewForm.insertAdjacentHTML(
    'beforeend',
    '<button class="primary" type="submit">บันทึกรีวิว</button>'
  );
}

function renderScoreBreakdown(reviews) {
  const latest = reviews[0];
  if (!latest) {
    scoreBreakdown.innerHTML = `
      <div class="empty-state">
        <h3>ยังไม่มีรีวิว</h3>
        <p>เป็นคนแรกที่ให้คะแนนเมนูนี้ได้เลย</p>
      </div>
    `;
    return;
  }

  scoreBreakdown.innerHTML = reviewFields
    .map(
      (field) => `
        <div class="metric-card">
          <strong>${field.label}</strong>
          <span>${Number(latest[field.key]).toFixed(0)} / 5</span>
        </div>
      `
    )
    .join('');
}

function renderReviewList(reviews) {
  if (!reviews.length) {
    reviewList.innerHTML = `
      <div class="empty-state">
        <h3>ยังไม่มีรีวิว</h3>
        <p>รีวิวรายการแรกจะปรากฏที่นี่</p>
      </div>
    `;
    reviewMeta.textContent = '';
    return;
  }

  reviewMeta.textContent = `${reviews.length} รีวิว`;
  reviewList.innerHTML = reviews
    .map(
      (review) => `
        <article class="review-card">
          <div class="menu-meta">
            <span class="tag">เฉลี่ย ${Number(review.average_score).toFixed(2)}</span>
            <span>${new Date(review.created_at).toLocaleString('th-TH')}</span>
          </div>
          <div class="review-score-grid">
            ${reviewFields
              .map(
                (field) => `
                  <div class="review-score">
                    <strong>${Number(review[field.key]).toFixed(0)}</strong>
                    <span>${field.label}</span>
                  </div>
                `
              )
              .join('')}
          </div>
        </article>
      `
    )
    .join('');
}

function showDetailFallback() {
  detailEmptyState.classList.remove('hidden');
  detailView.classList.add('hidden');
  state.selectedMenu = null;
  state.selectedMenuId = null;
}

async function loadMenus() {
  const menus = await request('/api/menus');
  state.menus = menus;
  renderMenuList();

  if (state.selectedMenuId) {
    const stillExists = menus.some((menu) => menu.id === state.selectedMenuId);
    if (!stillExists) {
      showDetailFallback();
      renderMenuList();
      return;
    }
    await loadMenuDetail(state.selectedMenuId);
  } else if (menus.length > 0) {
    await loadMenuDetail(menus[0].id);
  }
}

async function loadMenuDetail(menuId) {
  const menu = await request(`/api/menus/${menuId}`);
  state.selectedMenu = menu;
  state.selectedMenuId = menu.id;

  detailEmptyState.classList.add('hidden');
  detailView.classList.remove('hidden');
  detailCategory.textContent = menu.category || 'ไม่มีประเภท';
  detailName.textContent = menu.name;
  detailDescription.textContent = menu.description || 'ไม่มีรายละเอียดเพิ่มเติม';
  detailAverage.textContent = Number(menu.average_score || 0).toFixed(2);

  renderReviewForm();
  renderScoreBreakdown(menu.reviews || []);
  renderReviewList(menu.reviews || []);
  renderMenuList();
}

async function handleMenuAction(action, id) {
  const menu = state.menus.find((item) => item.id === id);
  if (!menu) return;

  if (action === 'select') {
    await loadMenuDetail(menu.id);
    return;
  }

  if (action === 'edit') {
    openMenuDialog(menu);
    return;
  }

  if (action === 'delete') {
    const confirmDelete = window.confirm(`ต้องการลบเมนู "${menu.name}" ใช่หรือไม่`);
    if (!confirmDelete) return;

    await request(`/api/menus/${menu.id}`, { method: 'DELETE' });
    if (state.selectedMenuId === menu.id) {
      showDetailFallback();
    }
    await loadMenus();
  }
}

menuList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  try {
    await handleMenuAction(action, id);
  } catch (error) {
    window.alert(error.message);
  }
});

addMenuButton.addEventListener('click', () => openMenuDialog());
closeMenuDialog.addEventListener('click', closeDialog);
cancelMenuButton.addEventListener('click', closeDialog);

menuNameInput.addEventListener('change', syncTemplateFromName);
menuNameInput.addEventListener('blur', syncTemplateFromName);

templateChips.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-template-name]');
  if (!button) return;
  const template = menuTemplates.find((item) => item.name === button.dataset.templateName);
  setTemplateFields(template);
});

menuForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    name: menuNameInput.value.trim(),
    category: menuCategoryInput.value.trim(),
    description: menuDescriptionInput.value.trim()
  };

  try {
    const id = menuIdInput.value;
    if (id) {
      await request(`/api/menus/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
    } else {
      await request('/api/menus', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    closeDialog();
    await loadMenus();
  } catch (error) {
    window.alert(error.message);
  }
});

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedMenuId) return;

  const formData = new FormData(reviewForm);
  const payload = {};
  for (const field of reviewFields) {
    payload[field.key] = Number(formData.get(field.key));
  }

  try {
    await request(`/api/menus/${state.selectedMenuId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    await loadMenuDetail(state.selectedMenuId);
    await loadMenus();
  } catch (error) {
    window.alert(error.message);
  }
});

window.addEventListener('click', (event) => {
  if (event.target === menuDialog) {
    closeDialog();
  }
});

async function loadMenuTemplates() {
  try {
    const templates = await request('/api/menu-templates');
    menuTemplates.splice(0, menuTemplates.length, ...templates);
    renderTemplateHelpers(menuTemplates);
  } catch (error) {
    templateChips.innerHTML = `<span class="tag">โหลดตัวอย่างไม่ได้</span>`;
  }
}

Promise.all([loadMenuTemplates(), loadMenus()]).catch((error) => {
  menuList.innerHTML = `<div class="empty-state"><h3>โหลดข้อมูลไม่สำเร็จ</h3><p>${escapeHtml(error.message)}</p></div>`;
});
