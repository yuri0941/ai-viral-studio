import { OwnerLegalInfo } from '../models/index.js'

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
    const legalInfo = await OwnerLegalInfo.findOne().sort({ updatedAt: -1 }).lean()

    const fallback = {
      operatorName: process.env.OWNER_NAME || '[Укажите в Юридических настройках владельца]',
      operatorType: 'self_employed',
      contactEmail: process.env.OWNER_EMAIL || '[Укажите email в настройках]',
      siteUrl: process.env.SITE_URL || 'app.aiviral.studio',
      operatorAddress: process.env.OWNER_ADDRESS || '[Укажите адрес в настройках]'
    }

    if (!legalInfo) {
      return res.json({ success: true, legalInfo: fallback })
    }

    return res.json({
      success: true,
      legalInfo: {
        operatorName: legalInfo.operatorName || fallback.operatorName,
        operatorType: legalInfo.operatorType || fallback.operatorType,
        contactEmail: legalInfo.contactEmail || fallback.contactEmail,
        siteUrl: legalInfo.siteUrl || fallback.siteUrl,
        operatorAddress: legalInfo.operatorAddress || fallback.operatorAddress
      }
    })
  } catch (err) {
    console.error('[ownerLegalInfoController:getPublicLegalInfo]', err.message)
    return res.status(500).json({ success: false, error: err.message })
  }
}
