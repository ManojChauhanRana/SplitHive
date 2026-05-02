import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, Users, Receipt, ArrowRight, 
  Activity, Filter, BarChart3, PieChart as PieIcon, Calendar,
  ArrowUpRight, ArrowDownLeft, ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { GroupService } from '../../services/group';
import { BalanceService } from '../../services/balance';
import { ExpenseService } from '../../services/expense';

const COLORS = ['#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16'];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
  const [groups, setGroups] = useState<any[]>([]);
  const [allExpenses, setAllExpenses] = useState<any[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);
  const [detailedBalances, setDetailedBalances] = useState<{ youOwe: any[], owesYou: any[] }>({ youOwe: [], owesYou: [] });
  
  // Filters
  const [filterType, setFilterType] = useState<'all' | 'month' | 'week' | 'day' | 'custom'>('month');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar');

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardStats, userGroups, expenses, detailedBalancesData] = await Promise.all([
        BalanceService.getUserDashboardStats(user!.id),
        GroupService.getGroups(),
        ExpenseService.getUserExpenses(user!.id),
        BalanceService.getDetailedUserBalances(user!.id)
      ]);
      
      setStats(dashboardStats);
      setGroups(userGroups);
      setAllExpenses(expenses);
      setRecentExpenses(expenses.slice(0, 5));
      setDetailedBalances(detailedBalancesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return allExpenses.filter(exp => {
      const expDate = new Date(exp.created_at);
      
      // Group Filter
      if (selectedGroupId !== 'all' && exp.group_id !== selectedGroupId) return false;

      // Time Filter
      if (filterType === 'day') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return expDate >= today;
      }
      if (filterType === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return expDate >= weekAgo;
      }
      if (filterType === 'month') {
        const monthAgo = new Date();
        monthAgo.setDate(1); // Start of month
        monthAgo.setHours(0, 0, 0, 0);
        return expDate >= monthAgo;
      }
      if (filterType === 'custom' && startDate && endDate) {
        return expDate >= new Date(startDate) && expDate <= new Date(endDate);
      }
      return true;
    });
  }, [allExpenses, filterType, selectedGroupId, startDate, endDate]);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
  }, [filteredExpenses]);

  const spendingData = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const title = exp.title.length > 15 ? exp.title.substring(0, 15) + '...' : exp.title;
      categories[title] = (categories[title] || 0) + Number(exp.total_amount);
    });
    return Object.entries(categories)
      .map(([name, amount]) => ({ 
        name, 
        amount,
        percent: totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, totalSpent]);

  const oweTotal = useMemo(() => detailedBalances.youOwe.reduce((sum, item) => sum + item.amount, 0), [detailedBalances]);
  const owedTotal = useMemo(() => detailedBalances.owesYou.reduce((sum, item) => sum + item.amount, 0), [detailedBalances]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-1000">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-yellow-500 mb-2">
            <Activity size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hive Network Status: Active</span>
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter">
            Dashboard<span className="text-yellow-500">.</span>
          </h1>
          <p className="text-gray-500 mt-2 font-medium">Tracking your personal growth and social harmony.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/groups">
            <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold rounded-2xl transition-all backdrop-blur-md">
              Groups
            </button>
          </Link>
          <Link to="/groups">
            <button className="px-8 py-3 bg-yellow-500 text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-yellow-500/20">
              Add Record
            </button>
          </Link>
        </div>
      </header>

      {/* Hero Analytics Card */}
      <section className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-gray-900/60 border border-white/5 backdrop-blur-3xl rounded-[2.5rem] overflow-hidden">
          {/* Subtle Mesh Gradient Background */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="p-10">
            <div className="flex flex-wrap items-center justify-between gap-6 mb-12">
              <div className="space-y-1">
                <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Personal Outflow</p>
                <div className="flex items-baseline space-x-3">
                  <h2 className="text-6xl font-black text-white tracking-tighter">₹{totalSpent.toLocaleString()}</h2>
                  <span className="text-yellow-500/40 font-bold text-xl uppercase tracking-tighter">Spent</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
                  {(['all', 'month', 'week', 'day'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-tighter ${
                        filterType === type ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <select 
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="bg-black/40 border border-white/5 rounded-2xl px-5 py-2 text-xs font-bold text-white outline-none hover:bg-black/60 transition-all cursor-pointer"
                >
                  <option value="all">All Hives</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>

                <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5">
                  <button
                    onClick={() => setChartView('bar')}
                    className={`p-2 rounded-xl transition-all ${
                      chartView === 'bar' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <BarChart3 size={18} />
                  </button>
                  <button
                    onClick={() => setChartView('pie')}
                    className={`p-2 rounded-xl transition-all ${
                      chartView === 'pie' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <PieIcon size={18} />
                  </button>
                </div>
              </div>
            </div>

            <div className="h-[400px] w-full animate-in fade-in slide-in-from-top-4 duration-1000">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'bar' ? (
                  <BarChart data={spendingData.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 'bold' }}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#ffffff05' }}
                      contentStyle={{ 
                        backgroundColor: '#000000', 
                        border: '1px solid #eab308', 
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '15px'
                      }}
                      itemStyle={{ color: '#eab308', fontWeight: '900', fontSize: '15px' }}
                      formatter={(value, name, props) => [`₹${value} (${props.payload.percent}%)`, name]}
                    />
                    <Bar dataKey="amount" fill="#eab308" radius={[12, 12, 4, 4]} barSize={60} />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={spendingData.slice(0, 10)}
                      cx="50%"
                      cy="50%"
                      innerRadius={100}
                      outerRadius={150}
                      paddingAngle={8}
                      dataKey="amount"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {spendingData.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#000000', 
                        border: '1px solid #eab308', 
                        borderRadius: '20px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '15px'
                      }}
                      itemStyle={{ fontWeight: '900', fontSize: '15px' }}
                      formatter={(value, name, props) => [`₹${value} (${props.payload.percent}%)`, name]}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      wrapperStyle={{ paddingLeft: '40px', fontSize: '13px' }}
                      formatter={(value, entry) => (
                        <span className="text-gray-400 font-black uppercase tracking-tighter">
                          {value} <span className="text-gray-600 ml-2">({(entry.payload as any).percent}%)</span>
                        </span>
                      )}
                    />
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* Social Balances Section */}
      <section className="space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500">
              <Users size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tight">Social Harmony</h3>
              <p className="text-gray-500 text-sm">Managing your collective debts and credits.</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Net Position</p>
            <div className={`text-3xl font-black ${stats.totalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ₹{stats.totalBalance.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* You Owe Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-red-500/10 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition"></div>
            <div className="relative bg-gray-900/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-2xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-3 text-red-500">
                  <ArrowUpRight size={24} />
                  <h4 className="text-xl font-black uppercase tracking-tighter">You Owe</h4>
                </div>
                <div className="bg-red-500/10 text-red-500 px-4 py-1.5 rounded-full text-sm font-black">
                  ₹{oweTotal.toFixed(2)}
                </div>
              </div>

              <div className="space-y-5 min-h-[100px]">
                {detailedBalances.youOwe.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <TrendingDown size={20} />
                    </div>
                    <p className="text-sm font-bold">No debts recorded.</p>
                  </div>
                ) : (
                  detailedBalances.youOwe.map((item, i) => (
                    <div key={i} className="flex items-center justify-between group/item">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 font-black text-sm border border-red-500/10">
                          {item.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-black">{item.full_name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Must Pay Back</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white tracking-tighter">₹{item.amount.toFixed(2)}</p>
                        <ChevronRight size={14} className="ml-auto text-gray-700 group-hover/item:text-red-500 transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {detailedBalances.youOwe.length > 0 && (
                <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                  <span className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Total Outflow</span>
                  <span className="text-3xl font-black text-red-500 tracking-tighter">₹{oweTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Owed To You Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-green-500/10 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition"></div>
            <div className="relative bg-gray-900/40 border border-white/5 rounded-[2rem] p-10 backdrop-blur-2xl">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center space-x-3 text-green-500">
                  <ArrowDownLeft size={24} />
                  <h4 className="text-xl font-black uppercase tracking-tighter">Owed To You</h4>
                </div>
                <div className="bg-green-500/10 text-green-500 px-4 py-1.5 rounded-full text-sm font-black">
                  ₹{owedTotal.toFixed(2)}
                </div>
              </div>

              <div className="space-y-5 min-h-[100px]">
                {detailedBalances.owesYou.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-600">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <TrendingUp size={20} />
                    </div>
                    <p className="text-sm font-bold">No collections pending.</p>
                  </div>
                ) : (
                  detailedBalances.owesYou.map((item, i) => (
                    <div key={i} className="flex items-center justify-between group/item">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 font-black text-sm border border-green-500/10">
                          {item.full_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-black">{item.full_name}</p>
                          <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Ready to receive</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-black text-white tracking-tighter">₹{item.amount.toFixed(2)}</p>
                        <ChevronRight size={14} className="ml-auto text-gray-700 group-hover/item:text-green-500 transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {detailedBalances.owesYou.length > 0 && (
                <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                  <span className="text-gray-500 text-xs font-black uppercase tracking-[0.2em]">Total Inflow</span>
                  <span className="text-3xl font-black text-green-500 tracking-tighter">₹{owedTotal.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tertiary Info Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-black text-white tracking-tight">Active Hives</h3>
            <Link to="/groups" className="text-xs font-black text-yellow-500 uppercase tracking-widest hover:text-white transition-colors">
              Manage All Groups
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groups.slice(0, 4).map(group => (
              <Link 
                key={group.id} 
                to={`/groups/${group.id}`}
                className="group relative bg-white/5 border border-white/5 rounded-3xl p-6 hover:bg-white/[0.08] transition-all overflow-hidden"
              >
                <div className="flex items-center space-x-5">
                  <div className="w-14 h-14 bg-black border border-white/10 rounded-2xl flex items-center justify-center text-yellow-500 font-black text-xl group-hover:scale-110 group-hover:bg-yellow-500 group-hover:text-black transition-all duration-500">
                    {group.name[0]}
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white group-hover:text-yellow-500 transition-colors">{group.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Open Hive Feed</p>
                  </div>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight size={20} className="text-yellow-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white/5 border border-white/5 rounded-[2.5rem] p-10">
          <h3 className="text-xl font-black text-white mb-8 flex items-center space-x-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            <span>Latest Feed</span>
          </h3>
          <div className="space-y-6">
            {recentExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-black border border-white/5 rounded-xl flex items-center justify-center text-gray-500 group-hover:text-yellow-500 transition-colors">
                    <Receipt size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white leading-none">{exp.title}</p>
                    <p className="text-[9px] text-gray-600 mt-1 uppercase font-black">{exp.group?.name}</p>
                  </div>
                </div>
                <p className="text-sm font-black text-white">₹{exp.total_amount}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
