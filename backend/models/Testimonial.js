import mongoose from 'mongoose'

// [P1.6-PREP] реальные отзывы для лендинга — управляются владельцем, без выдуманных данных
const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, default: '', trim: true, maxlength: 120 },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    visible: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const Testimonial = mongoose.models.Testimonial || mongoose.model('Testimonial', testimonialSchema)
export default Testimonial
