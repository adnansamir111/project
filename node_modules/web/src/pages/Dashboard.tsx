import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Building2,
    Vote,
    Users,
    TrendingUp,
    Clock,
    CheckCircle,
    AlertCircle,
    Plus,
    ArrowRight,
    BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';
import { organizationsApi, electionsApi, votingApi } from '@/lib/api';
import type { Organization, Election, VoterStatusResponse } from '@/types';

export default function Dashboard() {
    const { user, currentOrganization, currentOrganizationRole } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [elections, setElections] = useState<Election[]>([]);
    const [voterStatus, setVoterStatus] = useState<VoterStatusResponse | null>(null);
    const [stats, setStats] = useState({
        totalOrgs: 0,
        totalElections: 0,
        activeElections: 0,
        registeredVoter: false,
    });

    useEffect(() => {
        loadDashboardData();
    }, [currentOrganization]);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // Load organizations
            const orgsData = await organizationsApi.list();
            setOrganizations(orgsData);

            // Load elections for current organization
            if (currentOrganization) {
                const electionsData = await electionsApi.list(currentOrganization.organization_id);
                setElections(electionsData);

                // Check voter status
                try {
                    const voterStatusResponse = await votingApi.getStatus(currentOrganization.organization_id);
                    setVoterStatus(voterStatusResponse);
                } catch (error) {
                    // User might not be a voter yet
                    setVoterStatus(null);
                }

                // Calculate stats
                setStats({
                    totalOrgs: orgsData.length,
                    totalElections: electionsData.length,
                    activeElections: electionsData.filter(e => e.status === 'OPEN').length,
                    registeredVoter: voterStatus?.registered || false,
                });
            } else {
                setStats({
                    totalOrgs: orgsData.length,
                    totalElections: 0,
                    activeElections: 0,
                    registeredVoter: false,
                });
            }
        } catch (error: any) {
            toast.error('Failed to load dashboard data');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN':
                return 'bg-green-100 text-green-800';
            case 'DRAFT':
                return 'bg-gray-100 text-gray-800';
            case 'CLOSED':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN':
                return <CheckCircle className="w-4 h-4" />;
            case 'DRAFT':
                return <Clock className="w-4 h-4" />;
            case 'CLOSED':
                return <AlertCircle className="w-4 h-4" />;
            default:
                return <Clock className="w-4 h-4" />;
        }
    };

    const getRoleBadge = () => {
        if (!currentOrganizationRole) return null;

        const roleColors = {
            OWNER: 'bg-yellow-100 text-yellow-800',
            ADMIN: 'bg-blue-100 text-blue-800',
            MEMBER: 'bg-gray-100 text-gray-800',
        };

        const roleIcons = {
            OWNER: '👑',
            ADMIN: '⚡',
            MEMBER: '👤',
        };

        return (
            <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${roleColors[currentOrganizationRole]}`}>
                <span>{roleIcons[currentOrganizationRole]}</span>
                <span>{currentOrganizationRole}</span>
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
                <h1 className="text-3xl font-bold mb-2">
                    Welcome back, {user?.username}! 👋
                </h1>
                <div className="flex items-center space-x-3">
                    <p className="text-primary-100">
                        {currentOrganization
                            ? `Managing ${currentOrganization.organization_name}`
                            : 'Select an organization to get started'
                        }
                    </p>
                    {currentOrganizationRole && getRoleBadge()}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Organizations */}
                <div className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Organizations</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.totalOrgs}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <Link
                        to="/organizations"
                        className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                        Manage organizations <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                {/* Total Elections */}
                <div className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Elections</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.totalElections}</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <Link
                        to="/elections"
                        className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                        View all elections <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                {/* Active Elections */}
                <div className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Active Elections</p>
                            <p className="text-3xl font-bold text-gray-900">{stats.activeElections}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <Link
                        to="/vote"
                        className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                    >
                        Go vote <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                </div>

                {/* Voter Status */}
                <div className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">
                                Voter Status
                                {currentOrganization && (
                                    <span className="text-xs text-gray-500"> in {currentOrganization.organization_name}</span>
                                )}
                            </p>
                            <p className="text-lg font-semibold text-gray-900">
                                {voterStatus?.registered
                                    ? voterStatus.voter?.status || 'Registered'
                                    : 'Not Registered'
                                }
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <Users className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                    {!voterStatus?.registered && currentOrganization && (
                        <Link
                            to="/vote"
                            className="mt-4 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                        >
                            Register to vote <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        to="/organizations"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center text-center"
                    >
                        <Plus className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="font-medium text-gray-700">Create Organization</span>
                    </Link>

                    <Link
                        to="/elections"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center text-center"
                    >
                        <Plus className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="font-medium text-gray-700">Create Election</span>
                    </Link>

                    <Link
                        to="/vote"
                        className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center text-center"
                    >
                        <Vote className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="font-medium text-gray-700">Cast Your Vote</span>
                    </Link>
                </div>
            </div>

            {/* Recent Elections */}
            {elections.length > 0 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Recent Elections</h2>
                        <Link
                            to="/elections"
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                        >
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="space-y-3">
                        {elections.slice(0, 5).map((election) => (
                            <Link
                                key={election.election_id}
                                to={`/elections/${election.election_id}`}
                                className="block p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {election.election_name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-2">
                                            {election.description || 'No description'}
                                        </p>
                                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                                            <span>Created {new Date(election.created_at).toLocaleDateString()}</span>
                                            {election.start_datetime && (
                                                <span>Starts {new Date(election.start_datetime).toLocaleDateString()}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(election.status)}`}>
                                            {getStatusIcon(election.status)}
                                            <span>{election.status}</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Organizations List */}
            {organizations.length > 0 && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Your Organizations</h2>
                        <Link
                            to="/organizations"
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
                        >
                            View all <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {organizations.slice(0, 4).map((org) => (
                            <div
                                key={org.organization_id}
                                className="p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start space-x-3">
                                    <div className="p-2 bg-primary-100 rounded-lg">
                                        <Building2 className="w-5 h-5 text-primary-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            {org.organization_name}
                                        </h3>
                                        <p className="text-sm text-gray-600">
                                            {org.organization_type}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Code: {org.organization_code}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {organizations.length === 0 && (
                <div className="card text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                        <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Organizations Yet
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Create your first organization to start managing elections
                    </p>
                    <Link to="/organizations" className="btn-primary inline-flex items-center">
                        <Plus className="w-5 h-5 mr-2" />
                        Create Organization
                    </Link>
                </div>
            )}
        </div>
    );
}
