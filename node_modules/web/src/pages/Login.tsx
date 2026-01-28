import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Vote, Mail, Lock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
    const navigate = useNavigate();
    const { setTokens, setUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await authApi.login(formData);

            if (response.ok && response.accessToken && response.refreshToken && response.user_id) {
                // Set tokens first
                setTokens(response.accessToken, response.refreshToken);

                // Set user data
                setUser({
                    user_id: response.user_id,
                    username: formData.email.split('@')[0], // Extract username from email
                    email: formData.email,
                    role_id: 4, // Default role ID
                    is_active: true,
                });

                toast.success('Login successful!');
                navigate('/');
            } else {
                toast.error(response.error || 'Login failed');
            }
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-full mb-4">
                        <Vote className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Election System</h1>
                    <p className="text-gray-600 mt-2">Sign in to manage your elections</p>
                </div>

                {/* Login Form */}
                <div className="card animate-fade-in">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="label">
                                <Mail className="w-4 h-4 inline mr-2" />
                                Email
                            </label>
                            <input
                                type="email"
                                required
                                className="input"
                                placeholder="your@email.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="label">
                                <Lock className="w-4 h-4 inline mr-2" />
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                className="input"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center space-x-2"
                        >
                            {loading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <span>Sign In</span>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Demo Credentials */}
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900 font-medium mb-2">Demo Credentials:</p>
                    <p className="text-xs text-blue-700">Email: admin@test.com</p>
                    <p className="text-xs text-blue-700">Password: password123</p>
                </div>
            </div>
        </div>
    );
}
