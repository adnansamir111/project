import { useEffect } from 'react';
import { Building2, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { organizationsApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function OrganizationSelector() {
    const {
        currentOrganization,
        currentOrganizationRole,
        userOrganizations,
        setUserOrganizations,
        switchOrganization
    } = useAuthStore();

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        try {
            const orgs = await organizationsApi.getUserOrganizations();
            setUserOrganizations(orgs);
        } catch (error: any) {
            console.error('Failed to load organizations:', error);
            toast.error('Failed to load your organizations');
        }
    };

    const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const orgId = parseInt(e.target.value);
        if (orgId) {
            switchOrganization(orgId);
            toast.success('Organization switched');
            // Reload page to refresh data
            window.location.reload();
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'OWNER':
                return 'bg-yellow-100 text-yellow-800';
            case 'ADMIN':
                return 'bg-blue-100 text-blue-800';
            case 'MEMBER':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'OWNER':
                return '👑';
            case 'ADMIN':
                return '⚡';
            case 'MEMBER':
                return '👤';
            default:
                return '👤';
        }
    };

    if (userOrganizations.length === 0) {
        return (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Building2 className="w-4 h-4" />
                <span>No organizations</span>
            </div>
        );
    }

    return (
        <div className="flex items-center space-x-3">
            {/* Organization Selector */}
            <div className="relative">
                <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-gray-600" />
                    <select
                        value={currentOrganization?.organization_id || ''}
                        onChange={handleOrgChange}
                        className="bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer"
                    >
                        {userOrganizations.map((org) => (
                            <option key={org.organization_id} value={org.organization_id}>
                                {org.organization_name} ({org.user_role})
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Role Badge */}
            {currentOrganizationRole && (
                <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(currentOrganizationRole)}`}>
                    <span>{getRoleIcon(currentOrganizationRole)}</span>
                    <span>{currentOrganizationRole}</span>
                </span>
            )}

            {/* Status Indicator */}
            {currentOrganization?.status === 'ACTIVE' && (
                <CheckCircle className="w-4 h-4 text-green-500" title="Active Organization" />
            )}
            {currentOrganization?.status === 'PENDING' && (
                <span className="text-xs text-orange-600 font-medium">⏳ Pending Approval</span>
            )}
        </div>
    );
}
