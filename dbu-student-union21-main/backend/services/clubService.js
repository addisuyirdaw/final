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
    const { 
      fullName, 
      studentId, 
      department, 
      year, 
      contact, 
      phone, 
      email, 
      background, 
      applicationData 
    } = (joinDetails || {});

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

    const isRotaract = Boolean(
      (club.name && /rotaract/i.test(club.name)) ||
      (club.description && /rotaract/i.test(club.description))
    );

    const resolvedFullName = (fullName || applicationData?.fullName || authUser?.name || '').trim();
    const resolvedDepartment = (department || applicationData?.department || authUser?.department || '').trim();
    const resolvedYear = (year || applicationData?.year || authUser?.year || '').trim();
    const resolvedStudentId = (studentId || applicationData?.studentId || authUser?.username || '').trim();
    let resolvedPhone = (phone || applicationData?.phone || authUser?.phoneNumber || authUser?.phone || '').trim();
    let resolvedEmail = (email || applicationData?.email || authUser?.email || '').trim().toLowerCase();
    const resolvedContact = (contact || resolvedPhone || resolvedEmail || '').trim();

    if (!resolvedEmail && resolvedContact.includes('@')) {
      resolvedEmail = resolvedContact.toLowerCase();
    }
    if (!resolvedPhone && resolvedContact && !resolvedContact.includes('@')) {
      resolvedPhone = resolvedContact;
    }

    if (!resolvedFullName || !resolvedDepartment || !resolvedYear) {
      return {
        success: false,
        statusCode: 400,
        message: 'Full name, department, and academic year are required'
      };
    }

    if (!authUser && !resolvedStudentId) {
      return {
        success: false,
        statusCode: 400,
        message: 'Student ID number is required'
      };
    }

    if (!authUser && !resolvedContact) {
      return {
        success: false,
        statusCode: 400,
        message: 'Please provide a contact phone number or email address'
      };
    }

    const resolvedBackground = (background || applicationData?.motivation || 'Applied to join the club').trim();

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

    // Attempt to associate with an existing User account if available
    let targetUser = authUser || null;
    if (!targetUser && (resolvedStudentId || resolvedEmail)) {
      try {
        const query = [];
        if (resolvedStudentId) {
          query.push({ username: new RegExp(`^${resolvedStudentId}$`, 'i') });
        }
        if (resolvedEmail) {
          query.push({ email: resolvedEmail });
        }
        if (query.length > 0) {
          const matched = await User.findOne({ $or: query });
          if (matched) {
            targetUser = matched;
          }
        }
      } catch (err) {
        console.warn('Matching user account lookup error:', err.message);
      }
    }

    // Check if user has already applied or is a member (Duplicate prevention)
    const existingMember = club.members.find(member => {
      // 1. Check by User ObjectId if linked
      if (targetUser && member.user && String(member.user._id || member.user) === String(targetUser._id)) {
        return true;
      }
      // 2. Check by Student ID
      const mStudentId = (member.studentId || member.applicationData?.studentId || '').trim().toLowerCase();
      if (resolvedStudentId && mStudentId && mStudentId === resolvedStudentId.toLowerCase()) {
        return true;
      }
      // 3. Check by Email
      const mEmail = (member.email || member.applicationData?.email || '').trim().toLowerCase();
      if (resolvedEmail && mEmail && mEmail === resolvedEmail) {
        return true;
      }
      // 4. Check by Phone
      const mPhone = (member.phone || member.applicationData?.phone || (!member.contact?.includes('@') ? member.contact : '') || '').trim();
      if (resolvedPhone && mPhone && mPhone === resolvedPhone) {
        return true;
      }
      // 5. Check by Direct Contact Match
      const mContact = (member.contact || '').trim().toLowerCase();
      if (resolvedContact && mContact && mContact === resolvedContact.toLowerCase()) {
        return true;
      }
      return false;
    });

    if (existingMember) {
      if (existingMember.status === 'pending') {
        return {
          success: false,
          statusCode: 400,
          message: 'An application with these student details is already pending approval for this club.'
        };
      }
      if (existingMember.status === 'approved') {
        return {
          success: false,
          statusCode: 400,
          message: 'This student is already an approved member of this club.'
        };
      }
    }

    // Unauthenticated/guest applications always require manual leadership review
    const isAutoApprove = Boolean(targetUser && !isRotaract && club.requireApproval === false);
    const memberStatus = isAutoApprove ? 'approved' : 'pending';

    club.members.push({
      user: targetUser ? targetUser._id : null,
      studentId: resolvedStudentId || (targetUser ? targetUser.username : ''),
      fullName: resolvedFullName,
      department: resolvedDepartment,
      year: resolvedYear,
      contact: resolvedContact,
      phone: resolvedPhone,
      email: resolvedEmail,
      background: resolvedBackground,
      applicationData: applicationData || null,
      role: 'member',
      status: memberStatus,
      joinedAt: new Date(),
      ...(isAutoApprove ? { approvedAt: new Date() } : {})
    });

    await club.save();

    if (isAutoApprove && targetUser) {
      // Automatically add club to user's joinedClubs
      await User.findByIdAndUpdate(targetUser._id, {
        $addToSet: { joinedClubs: club._id }
      });

      // Send confirmation email asynchronously
      try {
        if (targetUser.email) {
          await sendMemberApprovalEmail(targetUser.email, resolvedFullName, club.name);
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
        : `Your membership application to ${club.name} has been submitted successfully! Club leaders will review your application.`
    };
  }
}

module.exports = new ClubService();
