import { OwnerLegalInfo, OwnerRequisites, User } from '../models/index.js'

export const getMyLegalInfo = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const legalInfo = await OwnerLegalInfo.findOne({ ownerId: userId }).lean()
    if (!legalInfo) {
      return res.json({
        success: true,
        legalInfo: {
          operatorName: '',
          operatorType: 'self_employed',
          operatorInn: '',
          operatorAddress: '',
          contactEmail: '',
          contactPhone: '',
          siteUrl: 'app.aiviral.studio'
        }
      })
    }

    return res.json({ success: true, legalInfo })
  } catch (err) {
    console.error('[ownerLegalInfoController:getMyLegalInfo]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export const updateMyLegalInfo = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' })

    const {
      operatorName,
      operatorType,
      operatorInn,
      operatorAddress,
      contactEmail,
      contactPhone,
      siteUrl
    } = req.body || {}

    if (!operatorName || operatorName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'ФИО / Название обязательно (минимум 2 символа)' })
    }

    const update = {
      operatorName: operatorName.trim(),
      operatorType: ['self_employed', 'ip', 'ooo'].includes(operatorType) ? operatorType : 'self_employed',
      operatorInn: operatorInn?.trim() || '',
      operatorAddress: operatorAddress?.trim() || '',
      contactEmail: contactEmail?.trim().toLowerCase() || '',
      contactPhone: contactPhone?.trim() || '',
      siteUrl: siteUrl?.trim() || 'app.aiviral.studio'
    }

    const legalInfo = await OwnerLegalInfo.findOneAndUpdate(
      { ownerId: userId },
      { $set: update },
      { new: true, upsert: true }
    ).lean()

    return res.json({ success: true, legalInfo })
  } catch (err) {
    console.error('[ownerLegalInfoController:updateMyLegalInfo]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}

export const getPublicLegalInfo = async (req, res) => {
  try {
    // [HOTFIX-2026-08-08] read actual owner requisites so legal pages auto-update
    const owner = await User.findOne({ role: 'owner' }).select('_id email').lean()
    const requisites = owner
      ? await OwnerRequisites.findOne({ ownerId: owner._id }).lean()
      : null

    const fallback = {
      operatorName: process.env.OWNER_NAME || 'Тихонов Юрий Сергеевич',
      operatorType: 'Самозанятый',
      contactEmail: process.env.OWNER_EMAIL || 'tvinki05@yandex.ru',
      email: process.env.OWNER_EMAIL || 'tvinki05@yandex.ru',
      siteUrl: process.env.SITE_URL || 'app.aiviral.studio',
      operatorAddress: process.env.OWNER_ADDRESS || 'г.Волгоград, Волгоградская обл',
      phone: process.env.OWNER_PHONE || '+79623164478',
      inn: process.env.OWNER_INN || '344212910482'
    }

    const typeMap = {
      individual: 'Физическое лицо',
      company: 'Юридическое лицо',
      entrepreneur: 'Индивидуальный предприниматель',
      self_employed: 'Самозанятый'
    }

    if (!requisites) {
      return res.json({ success: true, legalInfo: fallback })
    }

    return res.json({
      success: true,
      legalInfo: {
        operatorName: requisites.name || fallback.operatorName,
        operatorType: typeMap[requisites.type] || requisites.type || fallback.operatorType,
        contactEmail: requisites.contactEmail || requisites.email || owner?.email || fallback.contactEmail,
        email: requisites.email || owner?.email || fallback.email,
        siteUrl: requisites.siteUrl || fallback.siteUrl,
        operatorAddress: requisites.address || fallback.operatorAddress,
        phone: requisites.phone || fallback.phone,
        inn: requisites.inn || fallback.inn
      }
    })
  } catch (err) {
    console.error('[ownerLegalInfoController:getPublicLegalInfo]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
