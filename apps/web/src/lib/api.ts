import axios, { AxiosError } from 'axios';
import type {
    AuthResponse,
    LoginCredentials,
    RegisterData,
    Organization,
    UserOrganization,
    Election,
    ElectionWithDetails,
    Race,
    RaceFormData,
    Candidate,
    CandidateFormData,
    VoterStatusResponse,
    VoteData,
    ResultsResponse,
    Voter,
    OrgMember,
    Invitation,
    InvitationValidation,
    BulkUploadResult,
    OrgRequest,
    OrgRequestFormData,
} from '@/types';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token AND organization context
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add current organization ID to all requests
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            try {
                const authState = JSON.parse(authStorage);
                const currentOrgId = authState.state?.currentOrganization?.organization_id;
                if (currentOrgId) {
                    config.headers['X-Organization-Id'] = currentOrgId.toString();
                    console.log('🌐 API Request with org:', currentOrgId, config.url);
                }
            } catch (e) {
                console.error('Failed to parse auth storage:', e);
            }
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        if (error.response?.status === 401) {
            // Token expired, logout user
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post('/auth/login', credentials);
        return response.data;
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
};

// Organizations API
export const organizationsApi = {
    create: async (data: { organization_name: string; organization_type: string; organization_code: string }): Promise<Organization> => {
        const response = await api.post('/orgs', data);
        return response.data;
    },

    list: async (): Promise<Organization[]> => {
        const response = await api.get('/orgs');
        return response.data.organizations || [];
    },

    getById: async (id: number): Promise<Organization> => {
        const response = await api.get(`/orgs/${id}`);
        return response.data.organization;
    },

    getMembers: async (id: number): Promise<OrgMember[]> => {
        const response = await api.get(`/orgs/${id}/members`);
        return response.data.members || [];
    },

    addMember: async (orgId: number, userId: number, roleName: string): Promise<void> => {
        await api.post(`/orgs/${orgId}/members`, { user_id: userId, role_name: roleName });
    },

    removeMember: async (orgId: number, userId: number): Promise<void> => {
        await api.delete(`/orgs/${orgId}/members/${userId}`);
    },

    // Delete organization (OWNER only) - cascades to all related data
    deleteOrganization: async (orgId: number): Promise<void> => {
        await api.delete(`/orgs/${orgId}`);
    },

    // Get user's organizations with roles
    getUserOrganizations: async (): Promise<UserOrganization[]> => {
        const response = await api.get('/orgs/my/organizations');
        return response.data.organizations || [];
    },

    // Get user's role in specific organization
    // Get user's role in specific organization
    getUserRole: async (orgId: number): Promise<{ role: string; is_active: boolean }> => {
        const response = await api.get(`/orgs/${orgId}/my-role`);
        return response.data;
    },

    // Create invitation (Organizer)
    createInvite: async (orgId: number, email: string) => {
        const response = await api.post(`/orgs/${orgId}/invites`, { email });
        return response.data; // { ok, token, email }
    },

    // Join organization (User)
    join: async (token: string) => {
        const response = await api.post(`/orgs/join`, { token });
        return response.data;
    },

    // Get all organizations (for browsing)
    getAll: async (): Promise<Organization[]> => {
        const response = await api.get('/orgs/all');
        return response.data.organizations || [];
    },
};

// Elections API
export const electionsApi = {
    create: async (data: { organization_id: number; election_name: string; description?: string }): Promise<Election> => {
        const response = await api.post('/elections', data);
        return response.data;
    },

    list: async (organizationId: number): Promise<Election[]> => {
        const response = await api.get(`/elections?organization_id=${organizationId}`);
        return response.data.elections || [];
    },

    getById: async (id: number): Promise<ElectionWithDetails> => {
        const response = await api.get(`/elections/${id}`);
        return response.data.election;
    },

    update: async (id: number, data: { election_name: string; description?: string; start_at?: string; end_at?: string }): Promise<void> => {
        await api.put(`/elections/${id}`, data);
    },

    schedule: async (id: number, start_datetime: string, end_datetime: string): Promise<void> => {
        await api.post(`/elections/${id}/schedule`, { start_datetime, end_datetime });
    },

    open: async (id: number): Promise<void> => {
        await api.post(`/elections/${id}/open`);
    },

    close: async (id: number): Promise<void> => {
        await api.post(`/elections/${id}/close`);
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/elections/${id}`);
    },

    getReport: async (id: number): Promise<any[]> => {
        const response = await api.get(`/elections/${id}/report`);
        return response.data.report || [];
    },

    getSummary: async (id: number): Promise<any> => {
        const response = await api.get(`/elections/${id}/summary`);
        return response.data.summary;
    },
};

// Races API
export const racesApi = {
    create: async (data: RaceFormData): Promise<Race> => {
        const response = await api.post('/races', data);
        return response.data;
    },

    listByElection: async (electionId: number): Promise<Race[]> => {
        const response = await api.get(`/races/election/${electionId}`);
        return response.data.races || [];
    },

    getById: async (id: number): Promise<Race> => {
        const response = await api.get(`/races/${id}`);
        return response.data.race;
    },

    update: async (id: number, data: Partial<RaceFormData>): Promise<void> => {
        await api.put(`/races/${id}`, data);
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/races/${id}`);
    },
};

// Candidates API
export const candidatesApi = {
    add: async (raceId: number, data: CandidateFormData): Promise<Candidate> => {
        const formData = new FormData();
        formData.append('full_name', data.full_name);
        if (data.affiliation_name) formData.append('affiliation_name', data.affiliation_name);
        if (data.bio) formData.append('bio', data.bio);
        if (data.manifesto) formData.append('manifesto', data.manifesto);
        if (data.ballot_order) formData.append('ballot_order', String(data.ballot_order));
        if (data.photo) formData.append('photo', data.photo);
        const response = await api.post(`/races/${raceId}/candidates`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    update: async (raceId: number, candidateId: number, data: CandidateFormData): Promise<void> => {
        const formData = new FormData();
        formData.append('full_name', data.full_name);
        if (data.affiliation_name) formData.append('affiliation_name', data.affiliation_name);
        if (data.bio) formData.append('bio', data.bio);
        if (data.manifesto) formData.append('manifesto', data.manifesto);
        if (data.photo) formData.append('photo', data.photo);
        await api.put(`/races/${raceId}/candidates/${candidateId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    remove: async (raceId: number, candidateId: number): Promise<void> => {
        await api.delete(`/races/${raceId}/candidates/${candidateId}`);
    },
};

// Voting API
export const votingApi = {
    register: async (organizationId: number): Promise<void> => {
        await api.post('/voting/register', { organization_id: organizationId });
    },

    approve: async (organizationId: number, userId: number): Promise<void> => {
        await api.post('/voting/approve', { organization_id: organizationId, user_id: userId });
    },

    castVote: async (data: VoteData): Promise<{ vote_id: number }> => {
        const response = await api.post('/voting/cast', data);
        return response.data;
    },

    getStatus: async (organizationId: number): Promise<VoterStatusResponse> => {
        const response = await api.get(`/voting/status?organization_id=${organizationId}`);
        return response.data;
    },

    getPendingVoters: async (organizationId: number): Promise<Voter[]> => {
        const response = await api.get(`/voting/pending?organization_id=${organizationId}`);
        return response.data.pending_voters || [];
    },

    getResults: async (electionId: number, raceId: number): Promise<ResultsResponse> => {
        const response = await api.get(`/voting/results?election_id=${electionId}&race_id=${raceId}`);
        return response.data;
    },

    getElectionResults: async (electionId: number): Promise<any> => {
        const response = await api.get(`/voting/election-results/${electionId}`);
        return response.data;
    },
};

// Registration Requests API
export const registrationApi = {
    // User requests to join organization
    requestToJoin: async (orgId: number, message?: string): Promise<{ request_id: number }> => {
        const response = await api.post(`/orgs/${orgId}/request-join`, { message });
        return response.data;
    },

    // Organizer gets pending join requests
    getJoinRequests: async (orgId: number): Promise<any[]> => {
        const response = await api.get(`/orgs/${orgId}/join-requests`);
        return response.data.requests || [];
    },

    // Organizer approves join request
    approveJoinRequest: async (requestId: number): Promise<{ token: string; user_email: string; user_name: string }> => {
        const response = await api.post(`/orgs/join-requests/${requestId}/approve`);
        return response.data;
    },

    // Organizer rejects join request
    rejectJoinRequest: async (requestId: number): Promise<void> => {
        await api.post(`/orgs/join-requests/${requestId}/reject`);
    },

    // User completes registration with token
    completeRegistration: async (token: string): Promise<{ organization_id: number; organization_name: string }> => {
        const response = await api.post('/orgs/complete-registration', { token });
        return response.data.organization;
    },
};

// Invitations API
export const invitationsApi = {
    // Upload CSV with emails (Owner/Admin)
    bulkUpload: async (orgId: number, file: File, options?: { role_name?: string; days_valid?: number; send_emails?: boolean }): Promise<BulkUploadResult> => {
        const formData = new FormData();
        formData.append('csv', file);
        if (options?.role_name) formData.append('role_name', options.role_name);
        if (options?.days_valid) formData.append('days_valid', options.days_valid.toString());
        if (options?.send_emails !== undefined) formData.append('send_emails', options.send_emails.toString());

        const response = await api.post(`/invitations/bulk-upload/${orgId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Validate invite token (public - no auth needed)
    validateToken: async (token: string): Promise<InvitationValidation> => {
        const response = await api.get(`/invitations/validate?token=${token}`);
        return response.data;
    },

    // Accept invitation (logged-in user)
    accept: async (token: string): Promise<{ ok: boolean; organization: { id: number; name: string; role: string } }> => {
        const response = await api.post('/invitations/accept', { token });
        return response.data;
    },

    // Register with invitation token (new user)
    registerWithInvite: async (data: { token: string; username: string; email: string; password: string }): Promise<AuthResponse & { organization: { id: number; name: string; role: string } }> => {
        const response = await api.post('/invitations/register', data);
        return response.data;
    },

    // Get organization's invitations (Admin/Owner)
    getOrgInvitations: async (orgId: number): Promise<Invitation[]> => {
        const response = await api.get(`/invitations/${orgId}`);
        return response.data.invitations || [];
    },

    // Resend invitation
    resend: async (inviteId: number): Promise<{ ok: boolean; email: string; expires_at: string }> => {
        const response = await api.post(`/invitations/${inviteId}/resend`);
        return response.data;
    },

    // Revoke invitation
    revoke: async (inviteId: number): Promise<void> => {
        await api.delete(`/invitations/${inviteId}`);
    },

    // Get batch upload history
    getBatches: async (orgId: number): Promise<any[]> => {
        const response = await api.get(`/invitations/batches/${orgId}`);
        return response.data.batches || [];
    },
};

// Admin / Organization Requests API
export const adminApi = {
    // Check if current user is super admin
    checkSuperAdmin: async (): Promise<boolean> => {
        try {
            const response = await api.get('/admin/check');
            return response.data.is_super_admin === true;
        } catch {
            return false;
        }
    },

    // Submit organization request (regular user)
    submitOrgRequest: async (data: OrgRequestFormData): Promise<{ request_id: number }> => {
        const formData = new FormData();
        formData.append('organization_name', data.organization_name);
        formData.append('organization_type', data.organization_type);
        formData.append('organization_code', data.organization_code);
        if (data.purpose) formData.append('purpose', data.purpose);
        if (data.expected_members) formData.append('expected_members', String(data.expected_members));
        if (data.proof_document) formData.append('proof_document', data.proof_document);
        const response = await api.post('/admin/org-requests', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    // Get my own requests
    getMyRequests: async (): Promise<OrgRequest[]> => {
        const response = await api.get('/admin/org-requests/my');
        return response.data.requests || [];
    },

    // Get all requests (super admin only)
    getAllRequests: async (status?: string): Promise<OrgRequest[]> => {
        const url = status ? `/admin/org-requests?status=${status}` : '/admin/org-requests';
        const response = await api.get(url);
        return response.data.requests || [];
    },

    // Approve request (super admin)
    approveRequest: async (requestId: number, adminNotes?: string): Promise<{ organization_id: number }> => {
        const response = await api.post(`/admin/org-requests/${requestId}/approve`, { admin_notes: adminNotes });
        return response.data;
    },

    // Reject request (super admin)
    rejectRequest: async (requestId: number, adminNotes?: string): Promise<void> => {
        await api.post(`/admin/org-requests/${requestId}/reject`, { admin_notes: adminNotes });
    },

    // Super admin direct create
    createOrganization: async (data: { organization_name: string; organization_type: string; organization_code: string }): Promise<Organization> => {
        const response = await api.post('/admin/org-create', data);
        return response.data;
    },

    // Platform stats (super admin)
    getStats: async (): Promise<{
        stats: {
            total_users: number;
            total_organizations: number;
            total_elections: number;
            total_votes: number;
            pending_requests: number;
        };
        recent_users: { user_id: number; username: string; email: string; created_at: string }[];
        organizations: {
            organization_id: number;
            organization_name: string;
            organization_type: string;
            organization_code: string;
            created_at: string;
            member_count: number;
            election_count: number;
        }[];
    }> => {
        const response = await api.get('/admin/stats');
        return response.data;
    },
};

export default api;
