import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, Home, Building2, Vote, BarChart3, Users } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import OrganizationSelector from './OrganizationSelector';

export default function Layout() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-8">
                            <Link to="/" className="flex items-center space-x-2">
                                <Vote className="w-8 h-8 text-primary-600" />
                                <span className="text-xl font-bold text-gray-900">Election System</span>
                            </Link>

                            <nav className="hidden md:flex space-x-4">
                                <Link to="/" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                                    <Home className="w-4 h-4" />
                                    <span>Dashboard</span>
                                </Link>
                                <Link to="/organizations" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                                    <Building2 className="w-4 h-4" />
                                    <span>Organizations</span>
                                </Link>
                                <Link to="/elections" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                                    <BarChart3 className="w-4 h-4" />
                                    <span>Elections</span>
                                </Link>
                                <Link to="/vote" className="flex items-center space-x-1 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition">
                                    <Users className="w-4 h-4" />
                                    <span>Vote</span>
                                </Link>
                            </nav>
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* Organization Selector */}
                            <OrganizationSelector />

                            <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                                    <p className="text-xs text-gray-500">{user?.email}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                                    title="Logout"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <p className="text-center text-sm text-gray-500">
                        © 2024 Election Management System. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
}
