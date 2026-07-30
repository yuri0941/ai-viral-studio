import { OwnerRequisites } from '../models/index.js';

export const getMyRequisites = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const requisites = await OwnerRequisites.findOne({ ownerId: userId }).lean();
    if (!requisites) {
      return res.json({
        success: true,
        requisites: {
          type: 'company',
          name: '',
          inn: '',
          kpp: '',
          ogrn: '',
          accountNumber: '',
          bank: '',
          bik: '',
          corrAccount: '',
          address: '',
          email: '',
          phone: '',
          director: '',
          currency: 'RUB',
          vatRate: 0,
          isDefault: true,
        },
      });
    }

    return res.json({ success: true, requisites });
  } catch (err) {
    console.error('[ownerRequisitesController:getMyRequisites]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const createOrUpdateRequisites = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const {
      type,
      name,
      inn,
      kpp,
      ogrn,
      accountNumber,
      bank,
      bik,
      corrAccount,
      address,
      email,
      phone,
      director,
      currency,
      vatRate,
    } = req.body || {};

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Название / ФИО обязательны (минимум 2 символа)' });
    }

    const update = {
      type: ['individual', 'company', 'entrepreneur', 'self_employed'].includes(type) ? type : 'company',
      name: name.trim(),
      inn: inn?.trim() || undefined,
      kpp: kpp?.trim() || undefined,
      ogrn: ogrn?.trim() || undefined,
      accountNumber: accountNumber?.trim() || undefined,
      bank: bank?.trim() || undefined,
      bik: bik?.trim() || undefined,
      corrAccount: corrAccount?.trim() || undefined,
      address: address?.trim() || undefined,
      email: email?.trim().toLowerCase() || undefined,
      phone: phone?.trim() || undefined,
      director: director?.trim() || undefined,
      currency: ['USD', 'EUR'].includes(currency) ? currency : 'RUB',
      vatRate: Math.max(0, Math.min(100, Number(vatRate) || 0)),
      isDefault: true,
      foreignAccount: {
        companyName: req.body.foreignAccount?.companyName?.trim() || '',
        bankName: req.body.foreignAccount?.bankName?.trim() || '',
        swift: req.body.foreignAccount?.swift?.trim() || '',
        iban: req.body.foreignAccount?.iban?.trim() || '',
        accountNumber: req.body.foreignAccount?.accountNumber?.trim() || '',
        bankAddress: req.body.foreignAccount?.bankAddress?.trim() || '',
        country: req.body.foreignAccount?.country?.trim() || '',
      },
    };

    const requisites = await OwnerRequisites.findOneAndUpdate(
      { ownerId: userId },
      { $set: update },
      { new: true, upsert: true }
    ).lean();

    return res.json({ success: true, requisites });
  } catch (err) {
    console.error('[ownerRequisitesController:createOrUpdateRequisites]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const deleteRequisites = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    await OwnerRequisites.findOneAndDelete({ ownerId: userId });
    return res.json({ success: true, message: 'Requisites deleted' });
  } catch (err) {
    console.error('[ownerRequisitesController:deleteRequisites]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
