import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  LogOut, 
  User as UserIcon,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/Button';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'My Groups', path: '/groups' },
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden h-16 border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
          SplitHive
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-800 bg-[#0f172a] transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:inset-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="hidden lg:block p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            SplitHive
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 mt-4">
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <Link 
            to="/groups" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex lg:hidden items-center space-x-3 p-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-200"
          >
            <PlusCircle size={20} />
            <span className="font-medium">New Expense</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-800 mt-auto">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-gray-900 font-bold shadow-lg">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold truncate text-white">{user?.user_metadata?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 border-b border-gray-800 bg-[#0f172a]/80 backdrop-blur-md items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/groups">
              <Button size="sm" className="hidden sm:flex rounded-full">
                New Expense
              </Button>
            </Link>
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden hover:border-gray-600 transition-colors cursor-pointer">
              <UserIcon size={20} className="text-gray-400" />
            </div>
          </div>
        </header>

        {/* Page Body */}
        <div className="p-4 sm:p-8 flex-1">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
