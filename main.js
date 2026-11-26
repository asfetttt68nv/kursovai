'use strict';

const STORAGE_KEY = 'spsz_products_v2';
const LOW_STOCK_THRESHOLD = 5000;

// Номенклатура заполнена по чертежам, переданным для курсового проекта.
const initialProducts = [
    { id: 1, article: 'А-005', name: 'Бутылка 0,75 л', type: 'бутылка', volume: 0.75, color: 'прозрачное', stock: 12500, image: 'А-005.jpg' },
    { id: 2, article: 'А-738', name: 'Бутылка 0,25 л', type: 'бутылка', volume: 0.25, color: 'прозрачное', stock: 8400, image: 'А-738.png' },
    { id: 3, article: 'А-251', name: 'Бутылка 1 л', type: 'бутылка', volume: 1, color: 'прозрачное', stock: 9700, image: 'А-251.jpg' },
    { id: 4, article: 'А-840', name: 'Бутылка 0,7 л', type: 'бутылка', volume: 0.7, color: 'прозрачное', stock: 6200, image: 'А-840.jpg' },
    { id: 5, article: 'А-1065', name: 'Бутылка 0,5 л', type: 'бутылка', volume: 0.5, color: 'прозрачное', stock: 11300, image: 'А-1065.jpg' },
    { id: 6, article: 'А-617', name: 'Бутылка 1 л', type: 'бутылка', volume: 1, color: 'прозрачное', stock: 7600, image: 'А-617.jpg' }
];

function getProducts() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return initialProducts.map(p => ({ ...p }));
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : initialProducts.map(p => ({ ...p }));
    } catch (error) {
        console.warn('Не удалось прочитать складские данные:', error);
        return initialProducts.map(p => ({ ...p }));
    }
}

function saveProducts(products) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function generateId(products) {
    return products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
}

function formatVolume(value) {
    return Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

function renderCatalog(products) {
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = '<p class="catalog__empty">Ничего не найдено</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const low = Number(p.stock) < LOW_STOCK_THRESHOLD;
        const image = p.image
            ? `<img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.article)}" loading="lazy">`
            : `<span aria-hidden="true">🍾</span>`;
        return `
          <article class="product-card">
            <div class="product-card__img">${image}</div>
            <div class="product-card__body">
              <div class="product-card__article">${escapeHTML(p.article)}</div>
              <div class="product-card__name">${escapeHTML(p.name)}</div>
              <div class="product-card__meta">
                Тип: ${escapeHTML(p.type)}<br>
                Объём: ${formatVolume(p.volume)} л<br>
                Цвет: ${escapeHTML(p.color)}
              </div>
              <div class="product-card__stock ${low ? 'product-card__stock--low' : 'product-card__stock--ok'}">
                Остаток: ${Number(p.stock).toLocaleString('ru-RU')} шт.
              </div>
            </div>
          </article>`;
    }).join('');
}

function renderAccountingTable(products) {
    const tbody = document.getElementById('accountingBody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => `
      <tr>
        <td>${escapeHTML(p.article)}</td>
        <td>${escapeHTML(p.name)}</td>
        <td>${escapeHTML(p.type)}</td>
        <td>${formatVolume(p.volume)}</td>
        <td>${escapeHTML(p.color)}</td>
        <td class="${Number(p.stock) < LOW_STOCK_THRESHOLD ? 'stock-low' : 'stock-ok'}">${Number(p.stock).toLocaleString('ru-RU')}</td>
        <td>
          <button class="btn-action btn-action--edit" data-id="${Number(p.id)}" title="Редактировать" aria-label="Редактировать">✎</button>
          <button class="btn-action btn-action--delete" data-id="${Number(p.id)}" title="Удалить" aria-label="Удалить">🗑</button>
        </td>
      </tr>`).join('');

    tbody.querySelectorAll('.btn-action--edit').forEach(btn =>
        btn.addEventListener('click', () => openEditModal(Number(btn.dataset.id))));
    tbody.querySelectorAll('.btn-action--delete').forEach(btn =>
        btn.addEventListener('click', () => deleteProduct(Number(btn.dataset.id))));
}

function updateDashboard(products) {
    document.getElementById('totalPositions').textContent = products.length;
    document.getElementById('totalStock').textContent =
        products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0).toLocaleString('ru-RU');
    document.getElementById('lowStockCount').textContent =
        products.filter(p => Number(p.stock) < LOW_STOCK_THRESHOLD).length;
}

function getFilteredProducts() {
    const products = getProducts();
    const search = document.getElementById('searchInput').value.trim().toLocaleLowerCase('ru-RU');
    const type = document.getElementById('filterType').value;
    const color = document.getElementById('filterColor').value;
    return products.filter(p =>
        (!search || `${p.name} ${p.article}`.toLocaleLowerCase('ru-RU').includes(search)) &&
        (!type || p.type === type) &&
        (!color || p.color === color)
    );
}

function refreshViews() {
    const all = getProducts();
    renderCatalog(getFilteredProducts());
    renderAccountingTable(all);
    updateDashboard(all);
    fillOrderProducts();
}

const modal = document.getElementById('productModal');
const productForm = document.getElementById('productForm');

function openAddModal() {
    document.getElementById('modalTitle').textContent = 'Добавить продукцию';
    productForm.reset();
    document.getElementById('productId').value = '';
    modal.classList.add('active');
}

function openEditModal(id) {
    const product = getProducts().find(p => p.id === id);
    if (!product) return;
    document.getElementById('modalTitle').textContent = 'Редактировать продукцию';
    document.getElementById('productId').value = product.id;
    document.getElementById('article').value = product.article;
    document.getElementById('name').value = product.name;
    document.getElementById('type').value = product.type;
    document.getElementById('volume').value = product.volume;
    document.getElementById('color').value = product.color;
    document.getElementById('stock').value = product.stock;
    modal.classList.add('active');
}

function closeModal() {
    modal.classList.remove('active');
}

function deleteProduct(id) {
    if (!confirm('Вы уверены, что хотите удалить эту позицию?')) return;
    saveProducts(getProducts().filter(p => p.id !== id));
    refreshViews();
}

productForm.addEventListener('submit', event => {
    event.preventDefault();
    const id = document.getElementById('productId').value;
    const article = document.getElementById('article').value.trim();
    const name = document.getElementById('name').value.trim();
    const type = document.getElementById('type').value;
    const volume = Number(document.getElementById('volume').value);
    const color = document.getElementById('color').value;
    const stock = Number(document.getElementById('stock').value);
    let products = getProducts();

    if (products.some(p => p.article.toLocaleLowerCase('ru-RU') === article.toLocaleLowerCase('ru-RU') && p.id !== Number(id))) {
        alert('Продукция с таким артикулом уже существует!');
        return;
    }

    if (id) {
        const index = products.findIndex(p => p.id === Number(id));
        if (index !== -1) {
            // Сохраняем исходное изображение при редактировании позиции.
            products[index] = { ...products[index], article, name, type, volume, color, stock };
        }
    } else {
        products.push({ id: generateId(products), article, name, type, volume, color, stock, image: '' });
    }

    saveProducts(products);
    closeModal();
    refreshViews();
});

document.getElementById('btnAddProduct').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });

document.getElementById('searchInput').addEventListener('input', () => renderCatalog(getFilteredProducts()));
document.getElementById('filterType').addEventListener('change', () => renderCatalog(getFilteredProducts()));
document.getElementById('filterColor').addEventListener('change', () => renderCatalog(getFilteredProducts()));

function initSlider() {
    const track = document.getElementById('sliderTrack');
    const prev = document.getElementById('sliderPrev');
    const next = document.getElementById('sliderNext');
    if (!track || !prev || !next) return;
    let index = 0;

    function visibleCount() {
        if (window.innerWidth <= 600) return 1;
        if (window.innerWidth <= 950) return 2;
        return 3;
    }
    function update() {
        const images = track.querySelectorAll('.products__image');
        const max = Math.max(0, images.length - visibleCount());
        index = Math.min(index, max);
        if (!images.length) return;
        const gap = parseFloat(getComputedStyle(track).gap) || 20;
        track.style.transform = `translateX(-${index * (images[0].getBoundingClientRect().width + gap)}px)`;
        prev.disabled = index === 0;
        next.disabled = index >= max;
    }
    prev.addEventListener('click', () => { index = Math.max(0, index - 1); update(); });
    next.addEventListener('click', () => { index++; update(); });
    window.addEventListener('resize', update);
    track.querySelectorAll('img').forEach(img => img.addEventListener('load', update));
    update();
}

const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');

function fillOrderProducts() {
    const select = document.getElementById('orderProduct');
    if (!select) return;
    const previous = select.value;
    const products = getProducts();
    select.innerHTML = products.length
        ? products.map(p => `<option value="${Number(p.id)}">${escapeHTML(p.article)} — ${escapeHTML(p.name)} (${escapeHTML(p.color)})</option>`).join('')
        : '<option value="">Нет доступной продукции</option>';
    if (products.some(p => String(p.id) === previous)) select.value = previous;
    updateOrderStockInfo();
}

function updateOrderStockInfo() {
    const id = Number(document.getElementById('orderProduct').value);
    const product = getProducts().find(p => p.id === id);
    const info = document.getElementById('orderStockInfo');
    const quantity = document.getElementById('orderQuantity');
    if (!product) {
        info.textContent = 'Сейчас нет продукции для заказа.';
        quantity.max = '';
        return;
    }
    info.textContent = `Остаток на складе: ${Number(product.stock).toLocaleString('ru-RU')} шт.`;
    quantity.max = product.stock;
}

function openOrderModal() {
    orderForm.reset();
    fillOrderProducts();
    orderModal.classList.add('active');
    orderModal.setAttribute('aria-hidden', 'false');
}

function closeOrderModal() {
    orderModal.classList.remove('active');
    orderModal.setAttribute('aria-hidden', 'true');
}

function submitOrder(event) {
    event.preventDefault();
    const product = getProducts().find(p => p.id === Number(document.getElementById('orderProduct').value));
    const quantity = Number(document.getElementById('orderQuantity').value);
    const customer = document.getElementById('orderCustomer').value.trim();
    const phone = document.getElementById('orderPhone').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const comment = document.getElementById('orderComment').value.trim();

    if (!product) return alert('Выберите продукцию из каталога.');
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(product.stock))
        return alert('Укажите корректное количество, не превышающее остаток на складе.');
    if (!customer || !phone) return alert('Заполните обязательные контактные поля.');

    const subject = `Заявка на заказ тары — ${product.article}`;
    const body = [
        'Заявка на заказ стеклотары', '',
        `Артикул: ${product.article}`,
        `Наименование: ${product.name}`,
        `Тип: ${product.type}`,
        `Объём: ${formatVolume(product.volume)} л`,
        `Количество: ${quantity} шт.`,
        `Заказчик: ${customer}`,
        `Телефон: ${phone}`,
        `E-mail: ${email || 'не указан'}`,
        `Комментарий: ${comment || 'нет'}`
    ].join('\n');

    // Открывает почтовую программу пользователя; сервер для отправки писем не требуется.
    window.location.href = `mailto:sbyt@avangard-steklo.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeOrderModal();
}

document.getElementById('openOrderModal').addEventListener('click', openOrderModal);
document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
document.getElementById('orderCancel').addEventListener('click', closeOrderModal);
document.getElementById('orderProduct').addEventListener('change', updateOrderStockInfo);
orderForm.addEventListener('submit', submitOrder);
orderModal.addEventListener('click', event => { if (event.target === orderModal) closeOrderModal(); });

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeModal();
        closeOrderModal();
    }
});

refreshViews();
initSlider();
