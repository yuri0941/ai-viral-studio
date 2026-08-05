// [v6.4] Webhook-only owner bot entry point.
// The actual implementation lives in services/ownerBot.js to avoid duplication.
export { initOwnerBot, getOwnerBot, sendOwnerAlert, alertOwner, alertNewUser, alertPayment, alertError } from '../../services/ownerBot.js'
