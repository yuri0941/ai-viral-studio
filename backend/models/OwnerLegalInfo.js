import mongoose from 'mongoose'

const ownerLegalInfoSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    operatorName: {
      type: String,
      required: [true, 'Operator name is required'],
      trim: true,
      maxlength: [200, 'Operator name cannot exceed 200 characters']
    },
    operatorType: {
      type: String,
      enum: ['self_employed', 'ip', 'ooo'],
      default: 'self_employed'
    },
    operatorInn: {
      type: String,
      trim: true,
      default: ''
    },
    operatorAddress: {
      type: String,
      trim: true,
      default: ''
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      default: ''
    },
    contactPhone: {
      type: String,
      trim: true,
      default: ''
    },
    siteUrl: {
      type: String,
      trim: true,
      default: 'app.aiviral.studio'
    }
  },
  {
    timestamps: true
  }
)

const OwnerLegalInfo = mongoose.model('OwnerLegalInfo', ownerLegalInfoSchema)
export default OwnerLegalInfo
