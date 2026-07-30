import { Invoice, OwnerRequisites } from '../models/index.js';

function generateInvoiceNumber(prefix = 'INV') {
  const date = new Date();
  const ts = date.getTime().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${ts}-${random}`;
}

export const getMyInvoices = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { status, type, page = 1, limit = 20 } = req.query;
    const query = { ownerId: userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [invoices, total] = await Promise.all([
      Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Invoice.countDocuments(query),
    ]);

    return res.json({ success: true, invoices, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('[invoiceController:getMyInvoices]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const invoice = await Invoice.findOne({ _id: req.params.id, ownerId: userId }).lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Not found' });

    return res.json({ success: true, invoice });
  } catch (err) {
    console.error('[invoiceController:getInvoiceById]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createInvoice = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      clientId,
      subscriptionId,
      amount,
      currency = 'RUB',
      type = 'manual',
      description,
      items,
      dueDate,
      provider = 'manual',
      providerPaymentId,
      paymentUrl,
    } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, error: 'Amount is required and must be > 0' });
    }

    // Pull owner requisites snapshot if available
    const requisites = await OwnerRequisites.findOne({ ownerId: userId }).lean();
    const snapshot = requisites
      ? {
          name: requisites.name,
          inn: requisites.inn,
          kpp: requisites.kpp,
          accountNumber: requisites.accountNumber,
          bank: requisites.bank,
          bik: requisites.bik,
          address: requisites.address,
          email: requisites.email,
          phone: requisites.phone,
          vatRate: requisites.vatRate,
        }
      : {};

    const invoiceItems = Array.isArray(items) && items.length > 0
      ? items.map((item) => ({
          name: item.name || 'Услуга',
          description: item.description,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0),
        }))
      : [{ name: description || 'Услуга', quantity: 1, price: Number(amount) }];

    const invoice = await Invoice.create({
      ownerId: userId,
      clientId: clientId || undefined,
      subscriptionId: subscriptionId || undefined,
      invoiceNumber: generateInvoiceNumber(),
      amount: Number(amount),
      currency: ['USD', 'EUR'].includes(currency) ? currency : 'RUB',
      status: 'draft',
      type,
      description,
      items: invoiceItems,
      requisites: snapshot,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      provider,
      providerPaymentId,
      paymentUrl,
    });

    return res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error('[invoiceController:createInvoice]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const allowed = ['status', 'description', 'dueDate', 'paymentUrl', 'providerPaymentId', 'metadata'];
    const update = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, ownerId: userId },
      { $set: update },
      { new: true }
    ).lean();

    if (!invoice) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, invoice });
  } catch (err) {
    console.error('[invoiceController:updateInvoice]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const markInvoicePaid = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { providerPaymentId, provider } = req.body || {};
    const update = {
      status: 'paid',
      paidAt: new Date(),
    };
    if (providerPaymentId) update.providerPaymentId = providerPaymentId;
    if (provider) update.provider = provider;

    const invoice = await Invoice.findOneAndUpdate(
      { _id: req.params.id, ownerId: userId, status: { $ne: 'paid' } },
      { $set: update },
      { new: true }
    ).lean();

    if (!invoice) return res.status(404).json({ success: false, error: 'Not found or already paid' });
    return res.json({ success: true, invoice });
  } catch (err) {
    console.error('[invoiceController:markInvoicePaid]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, ownerId: userId }).lean();
    if (!invoice) return res.status(404).json({ success: false, error: 'Not found' });
    return res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('[invoiceController:deleteInvoice]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
