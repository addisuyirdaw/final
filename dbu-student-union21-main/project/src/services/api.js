// In production the VITE_API_URL env var points to the Render backend.
// In development, dynamically resolve from window.location.hostname so that
// mobile phones and other devices on the same network don't drop to localhost.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? 'https://dbu-student-union-api.onrender.com/api'
    : `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000/api`);

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        'Content-Type': 'application/json',
        ...(user.token && { Authorization: `Bearer ${user.token}` })
      };
    } catch {
      return { 'Content-Type': 'application/json' };
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = { ...this.getAuthHeaders(), ...(options.headers || {}) };

    const isFormData = options.body && typeof options.body.append === 'function';
    if (isFormData) {
      delete headers['Content-Type'];
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        let msg = data.message || `HTTP error! status: ${response.status}`;
        if (data.error) msg += ` - Detail: ${data.error}`;
        
        // Handle unauthorized globally - force logout immediately
        if (response.status === 401) {
          console.warn("Session invalid or expired (401) - forcing logout");
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("token");
          sessionStorage.clear();
          // Only redirect if not already on login page to avoid loops
          if (!window.location.pathname.includes('/login')) {
            window.location.href = "/login";
          }
        }

        // Handle globally restricted accounts - kick out instantly
        if (response.status === 403 && data.isRestricted) {
          console.warn("Account restricted - redirecting to blocked page");
          // Update the stored user object to mark as restricted so the page shows the reason
          try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            storedUser.isRestricted = true;
            storedUser.restrictionReason = data.reason;
            localStorage.setItem('user', JSON.stringify(storedUser));
          } catch (e) { /* ignore */ }
          if (!window.location.pathname.includes('/blocked')) {
            window.location.href = "/blocked";
          }
        }

        const error = new Error(msg);
        error.status = response.status;
        error.response = { data };
        if (data.errors) {
          console.error('Validation errors:', data.errors);
        }
        throw error;
      }

      return data;
    } catch (error) {
      // Normalize TypeError (e.g. CORS / network failures) into a proper Error object
      if (!(error instanceof Error)) {
        const normalized = new Error('Network error or CORS issue. Please check the server.');
        normalized.original = error;
        throw normalized;
      }
      // TypeError with name 'TypeError' typically means network/CORS failure
      if (error.name === 'TypeError' && !error.status) {
        const normalized = new Error(`Network error: Unable to reach the server. (${endpoint})`);
        normalized.original = error;
        throw normalized;
      }
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async adminLogin(credentials) {
    return this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  async updateProfile(profileData) {
    // Accept both FormData (multipart/form-data) and plain objects (JSON)
    const isFormData = profileData instanceof FormData;
    return this.request('/auth/profile', {
      method: 'PUT',
      body: isFormData ? profileData : JSON.stringify(profileData)
    });
  }

  async changePassword(passwordData) {
    return this.request('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData)
    });
  }

  // Complaints endpoints
  async getComplaints(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/complaints${queryString ? `?${queryString}` : ''}`;
    const response = await this.request(endpoint);
    return response.complaints || response.data || response;
  }

  async getComplaint(id) {
    return this.request(`/complaints/${id}`);
  }

  async createComplaint(complaintData) {
    return this.request('/complaints', {
      method: 'POST',
      body: JSON.stringify(complaintData)
    });
  }

  async updateComplaintStatus(id, status) {
    return this.request(`/complaints/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  }

  async addComplaintResponse(id, responseData) {
    return this.request(`/complaints/${id}/responses`, {
      method: 'POST',
      body: JSON.stringify(responseData)
    });
  }

  async deleteComplaint(id) {
    if (!id || id === 'undefined') {
      throw new Error('Invalid complaint ID');
    }
    return this.request(`/complaints/${id}`, {
      method: 'DELETE'
    });
  }
  async getComplaintStats() {
    return this.request('/complaints/stats/overview');
  }

  // Public stats for student dashboard
  async getComplaintPublicStats() {
    return this.request('/complaints/public-stats');
  }

  async getBranches() {
    return this.request('/complaints/branches');
  }

  // Clubs endpoints
  async getClubs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/clubs${queryString ? `?${queryString}` : ''}`;
    const response = await this.request(endpoint);
    return response.clubs || response.data || response;
  }

  async getClub(id) {
    const response = await this.request(`/clubs/${id}`);
    return response.club || response;
  }

  async createClub(clubData) {
    return this.request('/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData)
    });
  }

  async updateClub(id, clubData) {
    return this.request(`/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData)
    });
  }

  async deleteClub(id) {
    return this.request(`/clubs/${id}`, {
      method: 'DELETE'
    });
  }

  async getClubCount() {
    const response = await this.request('/clubs?limit=1');
    return response.total || 0;
  }

  async joinClub(id, joinData) {
    return this.request(`/clubs/${id}/join`, {
      method: 'POST',
      body: JSON.stringify(joinData)
    });
  }

  async leaveClub(id) {
    return this.request(`/clubs/${id}/leave`, {
      method: 'POST'
    });
  }

  async getClubJoinRequests(id) {
    return this.request(`/clubs/${id}/join-requests`);
  }

  async approveClubMember(clubId, memberId) {
    return this.request(`/clubs/${clubId}/members/${memberId}/approve`, {
      method: 'PATCH'
    });
  }

  async rejectClubMember(clubId, memberId) {
    return this.request(`/clubs/${clubId}/members/${memberId}/reject`, {
      method: 'PATCH'
    });
  }

  async restrictClubMember(clubId, memberId, status, reason) {
    return this.request(`/clubs/${clubId}/members/${memberId}/restrict`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
  }

  async removeClubMember(clubId, memberId) {
    return this.request(`/clubs/${clubId}/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  async getClubStats() {
    return this.request('/clubs/stats/overview');
  }

  async assignClubLeader(clubId, userId) {
    return this.request(`/clubs/${clubId}/assign-leader`, {
      method: 'PATCH',
      body: JSON.stringify({ userId })
    });
  }

  // Reports Endpoints
  async submitClubReport(clubId, reportData) {
    const isFormData = reportData && typeof reportData.append === 'function';
    return this.request(`/reports/club/${clubId}`, {
      method: 'POST',
      body: isFormData ? reportData : JSON.stringify(reportData)
    });
  }

  async getClubReports(clubId) {
    const response = await this.request(`/reports/club/${clubId}`);
    return response.reports || [];
  }

  async getPendingReports() {
    const response = await this.request('/reports/pending');
    return response.reports || [];
  }

  async getPendingManagerReports(clubId) {
    const response = await this.request(`/reports/club/${clubId}/pending-manager`);
    return response.reports || [];
  }

  async reviewReport(reportId, reviewData) {
    return this.request(`/reports/${reportId}/review`, {
      method: 'PATCH',
      body: JSON.stringify(reviewData)
    });
  }

  async approveReport(reportId, reviewData) {
    return this.request(`/reports/${reportId}/approve`, {
      method: 'PUT',
      body: JSON.stringify(reviewData)
    });
  }

  async returnReport(reportId, reviewData) {
    return this.request(`/reports/${reportId}/return`, {
      method: 'PUT',
      body: JSON.stringify(reviewData)
    });
  }

  async getInboxReports() {
    const response = await this.request('/reports/inbox');
    return response.reports || [];
  }

  async deleteReport(reportId) {
    return this.request(`/reports/${reportId}`, {
      method: 'DELETE'
    });
  }

  // Public stats for student dashboard
  async getClubPublicStats() {
    return this.request('/clubs/public-stats');
  }

  // Elections endpoints
  async getElections(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/elections${queryString ? `?${queryString}` : ''}`;
    const response = await this.request(endpoint);
    return response.elections || response.data || response;
  }

  async getElection(id) {
    return this.request(`/elections/${id}`);
  }

  async createElection(electionData) {
    return this.request('/elections', {
      method: 'POST',
      body: JSON.stringify(electionData)
    });
  }

  async updateElection(id, electionData) {
    return this.request(`/elections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(electionData)
    });
  }

  async deleteElection(id) {
    return this.request(`/elections/${id}`, {
      method: 'DELETE'
    });
  }

  // Messaging Endpoints
  async submitClubMessage(clubId, content) {
    return this.request(`/messages/club/${clubId}`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  async getClubInbox(clubId) {
    const response = await this.request(`/messages/club/${clubId}`);
    return response.messages || [];
  }

  async replyToClubMessage(msgId, responseText) {
    return this.request(`/messages/${msgId}/reply`, {
      method: 'PATCH',
      body: JSON.stringify({ response: responseText })
    });
  }

  async getCommunicationLog() {
    const response = await this.request('/messages/log');
    return response.messages || [];
  }

  async voteInElection(electionId, candidateId) {
    return this.request(`/elections/${electionId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ candidateId })
    });
  }

  async announceElectionResults(id) {
    return this.request(`/elections/${id}/announce`, {
      method: 'POST'
    });
  }

  async getElectionStats() {
    return this.request('/elections/stats/overview');
  }

  // Public stats for student dashboard
  async getElectionPublicStats() {
    return this.request('/elections/public-stats');
  }

  // Posts endpoints
  async getPosts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/posts${queryString ? `?${queryString}` : ''}`;
    const response = await this.request(endpoint);
    return response.posts || response.data || response;
  }

  async getPost(id) {
    return this.request(`/posts/${id}`);
  }

  async createPost(postData) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  }

  async updatePost(id, postData) {
    return this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    });
  }

  async deletePost(id) {
    return this.request(`/posts/${id}`, {
      method: 'DELETE'
    });
  }

  async likePost(id) {
    return this.request(`/posts/${id}/like`, {
      method: 'POST'
    });
  }

  async addComment(id, commentData) {
    return this.request(`/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData)
    });
  }

  async registerForEvent(id) {
    return this.request(`/posts/${id}/register`, {
      method: 'POST'
    });
  }

  async getPostStats() {
    return this.request('/posts/stats/overview');
  }

  // Contact endpoints
  async submitContact(contactData) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  }

  async getContacts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/contact${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getContact(id) {
    return this.request(`/contact/${id}`);
  }

  async updateContactStatus(id, statusData) {
    return this.request(`/contact/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    });
  }

  async replyToContact(id, replyData) {
    return this.request(`/contact/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify(replyData)
    });
  }

  async getContactStats() {
    return this.request('/contact/stats/overview');
  }

  // Users endpoints (Admin only)
  async getUsers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/users${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }

  async getUser(id) {
    return this.request(`/users/${id}`);
  }

  async updateUser(id, userData) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async deleteUser(id) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  async getUserStats() {
    return this.request('/users/stats/overview');
  }

  // Public stats for student dashboard
  async getUserPublicStats() {
    return this.request('/users/public-stats');
  }

  async resetUserPassword(id, passwordData) {
    return this.request(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify(passwordData)
    });
  }

  async unlockUser(id) {
    return this.request(`/users/${id}/unlock`, {
      method: 'POST'
    });
  }

  // Contact form submission
  async submitContactForm(contactData) {
    return this.request('/contact', {
      method: 'POST',
      body: JSON.stringify(contactData)
    });
  }

  // AI Assistant Endpoints
  async sendChatMessage(message) {
    return this.request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }

  // ── CLUB LIVE CHECK-IN & CERTIFICATION UPGRADE ──
  async checkInClub(checkInData) {
    return this.request('/clubs/checkin', {
      method: 'POST',
      body: JSON.stringify(checkInData)
    });
  }

  async createClubEvent(clubId, eventData) {
    return this.request(`/clubs/${clubId}/events`, {
      method: 'POST',
      body: JSON.stringify(eventData)
    });
  }

  async startCheckInSession(clubId, eventId) {
    return this.request(`/clubs/${clubId}/events/${eventId}/checkin/start`, {
      method: 'POST'
    });
  }

  async endCheckInSession(clubId, eventId) {
    return this.request(`/clubs/${clubId}/events/${eventId}/checkin/end`, {
      method: 'POST'
    });
  }

  async verifyCertificateEligibility(clubId, userId) {
    const query = userId ? `?userId=${userId}` : '';
    return this.request(`/clubs/${clubId}/certificate/verify${query}`);
  }

  async toggleCertificateDownload(clubId) {
    return this.request(`/clubs/${clubId}/toggle-certificates`, {
      method: 'POST'
    });
  }

  // ── Global Admin Template Repository ──────────────────────────────────────

  /** Fetch all uploaded admin templates (accessible to all logged-in users) */
  async getTemplates() {
    return this.request('/templates');
  }

  /**
   * Upload a new template PDF (Admin only).
   * @param {FormData} formData  Must contain: file (PDF), title, description, category
   */
  async uploadTemplate(formData) {
    return this.request('/templates/upload', {
      method: 'POST',
      body: formData,
    });
  }

  /** Delete a template by ID (Admin only) */
  async deleteTemplate(id) {
    return this.request(`/templates/${id}`, { method: 'DELETE' });
  }

  /** Delete a directive by ID (Admin/Coordinator only) */
  async deleteDirective(id) {
    return this.deletePost(id);
  }

  // ── Leadership Departments ─────────────────────────────────────────────────

  /** Fetch all top-level leadership departments (public) */
  async getDepartments() {
    return this.request('/departments');
  }

  /** Create a new top-level leadership branch (Admin only) */
  async createDepartment(data) {
    return this.request('/departments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /** Delete a leadership department by ID (Admin only) */
  async deleteDepartment(id) {
    return this.request(`/departments/${id}`, { method: 'DELETE' });
  }

  /** Fetch the current Student Union President (priority=1 in student_union group) */
  async getStudentUnionPresident() {
    const res = await this.request('/leadership/group/student_union');
    if (res?.success && Array.isArray(res.profiles)) {
      // Sorted by priority asc — priority 1 = President
      return res.profiles.find(p => p.priority === 1) || res.profiles[0] || null;
    }
    return null;
  }

  // ── System Configuration ──────────────────────────────────────────────────

  /** Fetch global system config (public — no auth needed) */
  async getSystemConfig() {
    return this.request('/config');
  }

  /** Toggle election portal visibility (Admin only) */
  async toggleElectionVisibility() {
    return this.request('/config/toggle-election', { method: 'POST' });
  }

  /** Toggle any feature visibility (Admin only) */
  async toggleFeatureVisibility(key) {
    return this.request(`/config/toggle/${key}`, { method: 'POST' });
  }

  /** Toggle a certificate rule (Required ↔ Optional) (Club Admin only) */
  async toggleCertRule(key) {
    return this.request(`/config/toggle-cert-rule/${key}`, { method: 'POST' });
  }
}

export const apiService = new ApiService();