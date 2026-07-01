const API_BASE = 'https://v2.mishnatyosef.org/api';
const IMAGE_BASE = 'https://images.mishnatyosef.org/images/items/';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

async function apiGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = { message: await response.text() };
  }

  if (!response.ok) {
    const err = new Error(payload?.message || `API error ${response.status}`);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

function pickSale(openSalesResponse, requestedSaleId) {
  const sales = Array.isArray(openSalesResponse?.data) ? openSalesResponse.data : [];
  if (!sales.length) return null;

  if (requestedSaleId) {
    const requested = sales.find(sale => String(sale.id) === String(requestedSaleId));
    if (requested) return requested;
  }

  return sales.find(sale => sale.order?.id) || sales[0];
}

function imageUrl(filename) {
  if (!filename || filename === 'no-image.png') return '';
  return `${IMAGE_BASE}${filename}`;
}

function normalizeProduct(item, saleId) {
  const product = item.product || {};
  const category = product.category || {};
  const manufacturer = product.manufacturer || {};
  const productId = item.itemID || item.itemId || item.item_id || product.id || item.id;
  const itemSalesId = item.item_salesID || item.item_sales_id || item.id;
  const name = item.full_name || item.name || product.full_name || product.name || '';
  const unitParts = [
    item.item_type?.name,
    item.approx ? 'כ-' : '',
    item.units ? String(item.units) : '',
    item.item_unit?.name
  ].filter(Boolean);

  return {
    id: String(itemSalesId || productId || name),
    source: 'mishnat-yosef',
    saleId: saleId ? String(saleId) : '',
    itemSalesId: itemSalesId ? String(itemSalesId) : '',
    productId: productId ? String(productId) : '',
    name,
    fullName: item.full_name || product.full_name || name,
    category: category.name || item.category || 'אחר',
    price: Number(item.price ?? item.price1 ?? 0),
    regularPrice: Number(item.regular_price ?? 0),
    available: item.available ?? null,
    maxPerCustomer: item.max_per_man ?? null,
    unitText: unitParts.join(' ').replace(/\s+/g, ' ').trim(),
    image: imageUrl(product.featured_image || item.featured_image),
    brand: manufacturer.name || '',
    brandLogo: manufacturer.logo ? `https://images.mishnatyosef.org/images/brands/${manufacturer.logo}` : '',
    barcode: product.barcodes?.[0]?.barcode || '',
    updatedAt: new Date().toISOString(),
    raw: item
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const token = String(body.token || '').trim();
    const requestedSaleId = body.saleId ? String(body.saleId).trim() : '';

    if (!token) {
      return json(400, { error: 'missing_token', message: 'חסר טוקן כניסה של משנת יוסף' });
    }

    const openSales = await apiGet('/profile/open_sales', token);
    const sale = pickSale(openSales, requestedSaleId);

    if (!sale) {
      return json(404, {
        error: 'no_open_sales',
        message: 'לא נמצאה מכירה פתוחה בחשבון הזה'
      });
    }

    if (!sale.order?.id) {
      return json(409, {
        error: 'order_required',
        message: 'נמצאה מכירה, אבל עדיין אין הזמנה פתוחה. פתח הזמנה באתר משנת יוסף ואז סנכרן שוב.',
        sale: {
          id: sale.id,
          name: sale.parent?.week || sale.parent?.description || `מכירה ${sale.id}`
        }
      });
    }

    const orderId = sale.order.id;
    const saleId = sale.id;
    const firstPage = await apiGet(`/get_items_for_sale/${orderId}/null?page=1&limit=50`, token);
    let items = [];

    if (firstPage?.pagination) {
      items = Array.isArray(firstPage.data) ? [...firstPage.data] : [];
      const totalPages = Number(firstPage.pagination.total_pages || 1);
      const requests = [];

      for (let page = 2; page <= totalPages; page += 1) {
        requests.push(apiGet(`/get_items_for_sale/${orderId}/null?page=${page}&limit=50`, token));
      }

      const pages = await Promise.all(requests);
      for (const page of pages) {
        if (Array.isArray(page.data)) items.push(...page.data);
      }
    } else if (Array.isArray(firstPage?.data)) {
      items = firstPage.data;
    } else if (Array.isArray(firstPage)) {
      items = firstPage;
    } else {
      const fallback = await apiGet(`/get_items_for_sale/${orderId}/null`, token);
      items = Array.isArray(fallback?.data) ? fallback.data : Array.isArray(fallback) ? fallback : [];
    }

    let categories = [];
    try {
      const categoriesResponse = await apiGet(`/get_categories/${saleId}`, token);
      categories = Array.isArray(categoriesResponse) ? categoriesResponse : categoriesResponse?.data || [];
    } catch {
      categories = [];
    }

    const products = items
      .filter(item => !item.sub_item)
      .map(item => normalizeProduct(item, saleId))
      .filter(product => product.name);

    return json(200, {
      ok: true,
      fetchedAt: new Date().toISOString(),
      sale: {
        id: String(saleId),
        orderId: String(orderId),
        name: sale.parent?.week || sale.parent?.description || `מכירה ${saleId}`,
        description: sale.parent?.description || '',
        end: sale.end || '',
        supplyBegin: sale.supply_begin || ''
      },
      categories,
      products
    });
  } catch (err) {
    console.error(err);
    return json(err.status || 500, {
      error: err.status === 401 ? 'unauthorized' : 'sync_failed',
      message: err.status === 401
        ? 'הטוקן לא תקין או שפג תוקף ההתחברות. התחבר שוב למשנת יוסף ונסה מחדש.'
        : err.message || 'שגיאה בסנכרון המוצרים',
      details: err.payload || null
    });
  }
};
