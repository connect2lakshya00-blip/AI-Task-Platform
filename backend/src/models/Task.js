const mongoose = require('mongoose');

const OPERATIONS = ['uppercase', 'lowercase', 'reverse', 'wordcount'];
const STATUSES = ['pending', 'running', 'success', 'failed'];

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true },
  inputText: { type: String, required: true },
  operation: { type: String, enum: OPERATIONS, required: true },
  status: { type: String, enum: STATUSES, default: 'pending' },
  result: { type: String, default: null },
  logs: [{ message: String, timestamp: { type: Date, default: Date.now } }],
}, { timestamps: true });

taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Task', taskSchema);
