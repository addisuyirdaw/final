const express = require('express');
const router = express.Router({ mergeParams: true }); // Access :clubId and :projectId
const mongoose = require('mongoose');
const Club = require('../models/Club');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Helper: determine if user is authorized to manage a specific club (from projects.js)
// ---------------------------------------------------------------------------
const isClubAuthorized = (club, user) => {
  if (!user || !club) return false;
  const userIdStr = (user._id || user.id || '').toString();
  const getLeaderId = (leader) => {
    if (!leader) return '';
    return (leader._id || leader).toString();
  };

  const isLeader =
    getLeaderId(club.leadership?.president) === userIdStr ||
    getLeaderId(club.leadership?.vicePresident) === userIdStr ||
    getLeaderId(club.leadership?.secretary) === userIdStr ||
    getLeaderId(club.leadership?.treasurer) === userIdStr;

  const privilegedRoles = ['admin', 'president', 'council_president', 'system_admin', 'clubs_coordinator'];
  const executiveNames = ['Giziew', 'Sintayew', 'Sintayehu', 'Genete', 'Kalkidan'];
  const isExecutive = user.name && executiveNames.some((name) => user.name.includes(name));

  const isElevated =
    user.isAdmin === true ||
    privilegedRoles.includes(user.role) ||
    user.username === 'dbu10101040' ||
    user.username === 'dbu10101030' ||
    isExecutive;

  return Boolean(isLeader || isElevated);
};

// ---------------------------------------------------------------------------
// Helper: Resolve Project and Club strictly
// ---------------------------------------------------------------------------
const resolveContext = async (clubId, projectId, res) => {
  if (!mongoose.Types.ObjectId.isValid(clubId)) {
    res.status(400).json({ success: false, message: 'Invalid club ID' });
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400).json({ success: false, message: 'Invalid project ID' });
    return null;
  }

  const club = await Club.findById(clubId).select('leadership status members name');
  if (!club) {
    res.status(404).json({ success: false, message: 'Club not found' });
    return null;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404).json({ success: false, message: 'Project not found' });
    return null;
  }

  // Cross-club isolation verification
  if (project.clubId.toString() !== clubId.toString()) {
    res.status(403).json({
      success: false,
      message: 'Mismatched project and club. Project does not belong to this club.',
    });
    return null;
  }

  return { club, project };
};

// ---------------------------------------------------------------------------
// Helper: Check if user is an approved member of the club
// ---------------------------------------------------------------------------
const isApprovedMember = (club, userId) => {
  if (!club.members || !Array.isArray(club.members)) return false;
  const userIdStr = userId.toString();
  return club.members.some(
    (m) => m.user && m.user.toString() === userIdStr && m.status === 'approved'
  );
};

// ---------------------------------------------------------------------------
// @desc    Get all tasks for a project
// @route   GET /api/clubs/:clubId/projects/:projectId/tasks
// @access  Authenticated
// ---------------------------------------------------------------------------
router.get('/', protect, async (req, res) => {
  try {
    const context = await resolveContext(req.params.clubId, req.params.projectId, res);
    if (!context) return;

    const tasks = await Task.find({
      projectId: req.params.projectId,
      clubId: req.params.clubId,
    })
      .populate('assignee', 'name username profileImage')
      .populate('createdBy', 'name username')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching tasks',
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Get a single task
// @route   GET /api/clubs/:clubId/projects/:projectId/tasks/:taskId
// @access  Authenticated
// ---------------------------------------------------------------------------
router.get('/:taskId', protect, async (req, res) => {
  try {
    const context = await resolveContext(req.params.clubId, req.params.projectId, res);
    if (!context) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
      clubId: req.params.clubId,
    })
      .populate('assignee', 'name username profileImage')
      .populate('createdBy', 'name username');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({ success: true, task });
  } catch (error) {
    console.error('Get task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching task',
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Create a task
// @route   POST /api/clubs/:clubId/projects/:projectId/tasks
// @access  Club leader / Coordinator / Admin
// ---------------------------------------------------------------------------
router.post('/', protect, async (req, res) => {
  try {
    const context = await resolveContext(req.params.clubId, req.params.projectId, res);
    if (!context) return;
    const { club, project } = context;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club leadership privileges required to create tasks.',
      });
    }

    const { title, description, status, priority, assignee, dueDate } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    // Assignee validation
    if (assignee) {
      if (!isApprovedMember(club, assignee)) {
        return res.status(400).json({
          success: false,
          message: 'Assignee must be an approved member of this club',
        });
      }
    }

    const taskData = {
      projectId: project._id,
      clubId: club._id,
      title: title.trim(),
      description: description ? description.trim() : undefined,
      status: status || 'todo',
      priority: priority || 'medium',
      assignee: assignee || undefined,
      createdBy: req.user._id,
      dueDate: dueDate || undefined,
    };

    if (taskData.status === 'completed') {
      taskData.completedAt = new Date();
    }

    const task = await Task.create(taskData);

    const populated = await task.populate([
      { path: 'assignee', select: 'name username profileImage' },
      { path: 'createdBy', select: 'name username' },
    ]);

    return res.status(201).json({ success: true, task: populated });
  } catch (error) {
    console.error('Create task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error creating task',
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Update a task
// @route   PATCH /api/clubs/:clubId/projects/:projectId/tasks/:taskId
// @access  Club leader / Coordinator / Admin OR Assigned Member (limited)
// ---------------------------------------------------------------------------
router.patch('/:taskId', protect, async (req, res) => {
  try {
    const context = await resolveContext(req.params.clubId, req.params.projectId, res);
    if (!context) return;
    const { club } = context;

    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const task = await Task.findOne({
      _id: req.params.taskId,
      projectId: req.params.projectId,
      clubId: req.params.clubId,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const isAuthorizedLeader = isClubAuthorized(club, req.user);
    const isAssignedMember = task.assignee && task.assignee.toString() === req.user._id.toString();

    if (!isAuthorizedLeader && !isAssignedMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must be a club leader or assigned to this task to update it.',
      });
    }

    // Critical security requirement: explicitly whitelist fields for assigned members
    if (!isAuthorizedLeader && isAssignedMember) {
      const { status } = req.body;
      if (status !== undefined) {
        task.status = status;
        if (status === 'completed' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (status !== 'completed') {
          task.completedAt = undefined;
        }
      }
      // Explicitly ignoring all other fields if an assigned member tries to patch them.
    } else {
      // Authorized leader: allowed to update all editable fields
      const { title, description, status, priority, assignee, dueDate } = req.body;

      if (title !== undefined) task.title = title.trim();
      if (description !== undefined) task.description = description.trim();
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate || undefined;
      
      if (assignee !== undefined) {
        if (assignee && !isApprovedMember(club, assignee)) {
          return res.status(400).json({
            success: false,
            message: 'Assignee must be an approved member of this club',
          });
        }
        task.assignee = assignee || undefined;
      }

      if (status !== undefined) {
        task.status = status;
        if (status === 'completed' && !task.completedAt) {
          task.completedAt = new Date();
        } else if (status !== 'completed') {
          task.completedAt = undefined;
        }
      }
    }

    // Never allow updating projectId or clubId
    // ... ensured because we are only modifying the loaded document's safe fields.

    await task.save();

    const populated = await task.populate([
      { path: 'assignee', select: 'name username profileImage' },
      { path: 'createdBy', select: 'name username' },
    ]);

    return res.json({ success: true, task: populated });
  } catch (error) {
    console.error('Update task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error updating task',
    });
  }
});

// ---------------------------------------------------------------------------
// @desc    Delete a task
// @route   DELETE /api/clubs/:clubId/projects/:projectId/tasks/:taskId
// @access  Club leader / Coordinator / Admin
// ---------------------------------------------------------------------------
router.delete('/:taskId', protect, async (req, res) => {
  try {
    const context = await resolveContext(req.params.clubId, req.params.projectId, res);
    if (!context) return;
    const { club } = context;

    if (!isClubAuthorized(club, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Club leadership privileges required to delete tasks.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.taskId)) {
      return res.status(400).json({ success: false, message: 'Invalid task ID' });
    }

    const task = await Task.findOneAndDelete({
      _id: req.params.taskId,
      projectId: req.params.projectId,
      clubId: req.params.clubId,
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    return res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting task',
    });
  }
});

module.exports = router;
