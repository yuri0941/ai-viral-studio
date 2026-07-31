import Joi from 'joi'

const registerSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    turnstileToken: Joi.string().required(),
})

const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    turnstileToken: Joi.string().required(),
})

export const validateRegister = (req, res, next) => {
    const { error } = registerSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message })
    }
    next()
}

export const validateLogin = (req, res, next) => {
    const { error } = loginSchema.validate(req.body)
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message })
    }
    next()
}

export default { validateRegister, validateLogin }
