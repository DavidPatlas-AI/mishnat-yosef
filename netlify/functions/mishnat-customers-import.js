const API_BASE = 'https://v2.mishnatyosef.org/api';

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

async function apiGet(path, token) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }
  });
  let payload;
  try { payload = await res.json(); } catch { payload = { message: await res.text() }; }
  if (!res.ok) {
    const err = new Error(payload?.message || `API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return payload;
}

function pickSale(openSalesResponse, requestedSaleId) {
  const sales = Array.isArray(openSalesResponse?.data) ? openSalesResponse.data : [];
  if (!sales.length) return null;
  if (requestedSaleId) {
    const found = sales.find(s => String(s.id) === String(requestedSaleId));
    if (found) return found;
  }
  return sales.find(s => s.order?.id) || sales[0];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });

  try {
    const body = JSON.parse(event.body || '{}');
    const token = String(body.token || '').trim();
    const requestedSaleId = body.saleId ? String(body.saleId).trim() : '';

    if (!token) return json(400, { error: 'missing_token', message: 'חסר טוקן' });

    // Get active sale
    const openSales = await apiGet('/profile/open_sales', token);
    const sale = pickSale(openSales, requestedSaleId);
    if (!sale) return json(404, { error: 'no_open_sales', message: 'לא נמצאה מכירה פתוחה' });

    const saleId  = sale.id;
    const orderId = sale.order?.id;

    // Try multiple endpoint patterns to get customer orders
    let customers = [];

    const endpoints = [
      `/get_customers_for_sale/${saleId}`,
      `/sales/${saleId}/customers`,
      `/orders/${saleId}`,
      `/sale/${saleId}/customer_orders`,
    ];

    let rawCustomers = null;
    for (const ep of endpoints) {
      try {
        rawCustomers = await apiGet(ep, token);
        if (rawCustomers && (Array.isArray(rawCustomers) || Array.isArray(rawCustomers?.data))) break;
      } catch { rawCustomers = null; }
    }

    const rows = Array.isArray(rawCustomers) ? rawCustomers
      : Array.isArray(rawCustomers?.data) ? rawCustomers.data : [];

    customers = rows.map(c => {
      const items = (c.items || c.order_items || c.basket_items || []).map(item => ({
        name:  item.full_name || item.name || item.product?.name || '',
        qty:   item.qty || item.quantity || item.amount || 1,
        price: item.price || item.price1 || 0,
        productId: String(item.itemID || item.item_id || item.id || ''),
        status: ''
      })).filter(i => i.name);

      return {
        name:  c.name || c.full_name || c.customer?.name || '',
        email: (c.email || c.customer?.email || '').trim().toLowerCase(),
        phone: c.phone || c.customer?.phone || '',
        items,
        orderId: String(c.order_id || c.id || ''),
        total:   c.total || c.total_price || 0
      };
    }).filter(c => c.email || c.name);

    return json(200, {
      ok: true,
      fetchedAt: new Date().toISOString(),
      sale: {
        id: String(saleId),
        orderId: orderId ? String(orderId) : '',
        name: sale.parent?.week || sale.parent?.description || `מכירה ${saleId}`
      },
      customers,
      count: customers.length
    });

  } catch (err) {
    console.error(err);
    return json(err.status || 500, {
      error: err.status === 401 ? 'unauthorized' : 'import_failed',
      message: err.status === 401
        ? 'הטוקן לא תקין — התחבר שוב למשנת יוסף ונסה מחדש'
        : err.message || 'שגיאה בייבוא לקוחות'
    });
  }
};
