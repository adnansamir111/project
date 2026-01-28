import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization, UserOrganization } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    currentOrganization: Organization | null;
    currentOrganizationRole: 'OWNER' | 'ADMIN' | 'MEMBER' | null;
    userOrganizations: UserOrganization[];
    setUser: (user: User | null) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    setCurrentOrganization: (org: Organization | null) => void;
    setCurrentOrganizationRole: (role: 'OWNER' | 'ADMIN' | 'MEMBER' | null) => void;
    setUserOrganizations: (orgs: UserOrganization[]) => void;
    switchOrganization: (orgId: number) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            currentOrganization: null,
            currentOrganizationRole: null,
            userOrganizations: [],

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setTokens: (accessToken, refreshToken) => {
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                set({ accessToken, refreshToken, isAuthenticated: true });
            },

            setCurrentOrganization: (org) => set({ currentOrganization: org }),

            setCurrentOrganizationRole: (role) => set({ currentOrganizationRole: role }),

            setUserOrganizations: (orgs) => {
                set({ userOrganizations: orgs });

                // Auto-select first organization if none selected
                const current = get().currentOrganization;
                if (!current && orgs.length > 0) {
                    const firstOrg = orgs[0];
                    set({
                        currentOrganization: {
                            organization_id: firstOrg.organization_id,
                            organization_name: firstOrg.organization_name,
                            organization_type: firstOrg.organization_type,
                            organization_code: firstOrg.organization_code,
                            status: firstOrg.organization_status,
                        },
                        currentOrganizationRole: firstOrg.user_role,
                    });
                }
            },

            switchOrganization: (orgId) => {
                const orgs = get().userOrganizations;
                const targetOrg = orgs.find(o => o.organization_id === orgId);

                if (targetOrg) {
                    set({
                        currentOrganization: {
                            organization_id: targetOrg.organization_id,
                            organization_name: targetOrg.organization_name,
                            organization_type: targetOrg.organization_type,
                            organization_code: targetOrg.organization_code,
                            status: targetOrg.organization_status,
                        },
                        currentOrganizationRole: targetOrg.user_role,
                    });
                }
            },

            logout: () => {
                authApi.logout();
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    currentOrganization: null,
                    currentOrganizationRole: null,
                    userOrganizations: [],
                });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
                currentOrganization: state.currentOrganization,
                currentOrganizationRole: state.currentOrganizationRole,
                userOrganizations: state.userOrganizations,
            }),
        }
    )
);
