export const checkConsent = (req, res, next) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  if (!user.acceptedTerms || !user.acceptedPrivacy || !user.acceptedConsent || !user.isAdult) {
    return res.status(403).json({
      success: false,
      error: 'Необходимо принять условия использования, политику конфиденциальности, согласие на обработку ПДн и подтвердить возраст 18+'
    })
  }
  next()
}
