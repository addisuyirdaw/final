const Club = require('../models/Club');
const User = require('../models/User');
const { sendMemberApprovalEmail } = require('../utils/emailService');

class ClubService {
  /**
   * Joins a club for the authenticated user.
   * @param {string} clubId - The ID of the club to join.
   * @param {Object} authUser - The authenticated user object (e.g., req.user).
   * @param {Object} joinDetails - Details provided in the join request.
   * @param {string} joinDetails.fullName
   * @param {string} joinDetails.department
   * @param {string} joinDetails.year
   * @param {string} joinDetails.background
   * @returns {Object} Result indicating success, autoApproved status, message, and statusCode.
   */
  async joinClub(clubId, authUser, joinDetails) {
    const { fullName, department, year, background } = joinDetails;

    const resolvedFullName = fullName || authUser.name;
    const resolvedDepartment = department || authUser.department;
    const resolvedYear = year || authUser.year;

    if (!resolvedFullName || !resolvedDepartment || !resolvedYear) {
      return {
        success: false,
        statusCode: 400,
        message: 'Full name, department, and academic year are required'
      };
    }

    if (!background || !background.trim()) {
      return {
        success: false,
        statusCode: 400,
        message: 'Please specify why you want to join this club'
      };
    }

    const club = await Club.findById(clubId);
    if (!club) {
      return {
        success: false,
        statusCode: 404,
        message: 'Club not found'
      };
    }

    if (club.status !== 'active') {
      return {
        success: false,
        statusCode: 400,
        message: 'Cannot join inactive club'
      };
    }

    // Check if user is already a member
    const existingMember = club.members.find(member =>
      member.user.toString() === authUser._id.toString()
    );

    if (existingMember) {
      if (existingMember.status === 'pending') {
        return {
          success: false,
          statusCode: 400,
          message: 'Your join request is already pending approval'
        };
      }
      if (existingMember.status === 'approved') {
        return {
          success: false,
          statusCode: 400,
          message: 'You are already a member of this club'
        };
      }
    }

    // Check requireApproval configuration:
    // If false: Auto-approve upon join!
    // If true (or undefined): Member stays pending until manually approved.
    const isAutoApprove = club.requireApproval === false;
    const memberStatus = isAutoApprove ? 'approved' : 'pending';

    club.members.push({
      user: authUser._id,
      fullName: resolvedFullName,
      department: resolvedDepartment,
      year: resolvedYear,
      background: background.trim(),
      role: 'member',
      status: memberStatus,
      joinedAt: new Date(),
      ...(isAutoApprove ? { approvedAt: new Date() } : {})
    });

    await club.save();

    if (isAutoApprove) {
      // Automatically add club to user's joinedClubs
      await User.findByIdAndUpdate(authUser._id, {
        $addToSet: { joinedClubs: club._id }
      });

      // Send confirmation email asynchronously
      try {
        if (authUser.email) {
          await sendMemberApprovalEmail(authUser.email, resolvedFullName, club.name);
        }
      } catch (emailErr) {
        console.warn('Auto-approval email dispatch failed:', emailErr.message);
      }

      return {
        success: true,
        statusCode: 200,
        autoApproved: true,
        message: `Welcome to ${club.name}! Auto-approval is enabled, you have joined immediately.`
      };
    }

    return {
      success: true,
      statusCode: 200,
      autoApproved: false,
      message: 'Join request submitted successfully. Waiting for admin approval.'
    };
  }
}

module.exports = new ClubService();
