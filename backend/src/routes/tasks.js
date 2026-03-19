const router = require('express').Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const redis = require('../config/redis');

// Create task
router.post('/', auth, async (req, res) => {
  try {
    const { title, inputText, operation } = req.body;
    if (!title || !inputText || !operation) {
      return res.status(400).json({ error: 'title, inputText, and operation are required' });
    }

    const task = await Task.create({
      userId: req.userId,
      title,
      inputText,
      operation,
      logs: [{ message: 'Task created' }],
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List tasks for current user
router.get('/', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Queue task for processing
router.post('/:id/run', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.userId });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    if (task.status === 'running') {
      return res.status(409).json({ error: 'Task is already running' });
    }

    // Reset task state
    task.status = 'pending';
    task.result = null;
    task.logs = [{ message: 'Task queued for processing' }];
    await task.save();

    // Push job to Redis queue
    const job = JSON.stringify({
      taskId: task._id.toString(),
      operation: task.operation,
      inputText: task.inputText,
    });
    await redis.rpush('task_queue', job);

    res.json({ message: 'Task queued', taskId: task._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
