import mongoose from 'mongoose';

// [v9.9.19.14] Персистентные координаты узлов Neural Graph — раскладка стабильна между визитами.
// nx/ny — нормализованные координаты (0..1 от размера канваса).
const GraphNodePositionSchema = new mongoose.Schema({
  nodeId: { type: String, required: true, unique: true, index: true },
  nx: { type: Number, required: true },
  ny: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.model('GraphNodePosition', GraphNodePositionSchema);
