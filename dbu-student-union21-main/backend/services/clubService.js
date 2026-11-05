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
    const { fullName, department, year, background, applicationData } = joinDetails;

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

    const isRotaract = Boolean(club.name && /rotaract/i.test(club.name));

    const resolvedFullName = fullName || applicationData?.fullName || authUser.name;
    const resolvedDepartment = department || applicationData?.department || authUser.department;
    const resolvedYear = year || applicationData?.year || authUser.year;

    if (!resolvedFullName || !resolvedDepartment || !resolvedYear) {
      return {
        success: false,
        statusCode: 400,
        message: 'Full name, department, and academic year are required'
      };
    }

    const resolvedBackground = (background || applicationData?.motivation || '').trim();

    if (!resolvedBackground) {
      return {
        success: false,
        statusCode: 400,
        message: isRotaract
          ? 'Please specify why you want to join the Rotaract club'
          : 'Please specify why you want to join this club'
      };
    }

    if (isRotaract && applicationData) {
      // Validate key recruitment questionnaire requirements
      const requiredFields = [
        { key: 'gender', label: 'Gender' },
        { key: 'age', label: 'Age' },
        { key: 'phone', label: 'Phone number' },
        { key: 'telegram', label: 'Telegram username' },
        { key: 'institution', label: 'University/Institution' },
        { key: 'knowledge', label: 'What you know about Rotaract club' },
        { key: 'motivation', label: 'Why you want to join the Rotaract club' },
        { key: 'expectations', label: 'What you hope to gain' },
        { key: 'contribution', label: 'How you can contribute' },
        { key: 'willingToParticipate', label: 'Willingness to participate in meetings' },
        { key: 'timeCommitment', label: 'Dedicated weekly time commitment' }
      ];

      for (const field of requiredFields) {
        if (!applicationData[field.key] || !String(applicationData[field.key]).trim()) {
          return {
            success: false,
            statusCode: 400,
            message: `Rotaract recruitment requirement missing: ${field.label}`
          };
        }
      }
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

    // For Rotaract, verification is strictly required based on the recruitment questionnaire
    const isAutoApprove = !isRotaract && club.requireApproval === false;
    const memberStatus = isAutoApprove ? 'approved' : 'pending';

    club.members.push({
      user: authUser._id,
      fullName: resolvedFullName,
      department: resolvedDepartment,
      year: resolvedYear,
      background: resolvedBackground,
      applicationData: applicationData || null,
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
      message: isRotaract
        ? 'Rotaract recruitment application submitted successfully. Club leadership will verify your responses before approval.'
        : 'Join request submitted successfully. Waiting for admin approval.'
    };
  }
}

module.exports = new ClubService();
