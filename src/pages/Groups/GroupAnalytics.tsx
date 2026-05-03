import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { Filter, PieChart as PieIcon, BarChart3, Users } from 'lucide-react';

interface GroupAnalyticsProps {
  expenses: any[];
  members: any[];
}

const COLORS = ['#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#84cc16'];

export const GroupAnalytics: React.FC<GroupAnalyticsProps> = ({ expenses, members: _members }) => {
  const [chartView, setChartView] = useState<'bar' | 'pie'>('bar');
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    return expenses.filter(exp => {
      const expDate = new Date(exp.created_at);
      if (filterType === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return expDate >= weekAgo;
      }
      if (filterType === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(now.getMonth() - 1);
        return expDate >= monthAgo;
      }
      if (filterType === 'custom' && startDate && endDate) {
        return expDate >= new Date(startDate) && expDate <= new Date(endDate);
      }
      return true;
    });
  }, [expenses, filterType, startDate, endDate]);

  const totalSpent = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + Number(exp.total_amount), 0);
  }, [filteredExpenses]);

  const memberSpendingData = useMemo(() => {
    const spending: Record<string, number> = {};
    filteredExpenses.forEach(exp => {
      const name = exp.paid_by_profile?.full_name || exp.paid_by_profile?.email || 'Unknown';
      spending[name] = (spending[name] || 0) + Number(exp.total_amount);
    });
    return Object.entries(spending).map(([name, amount]) => ({ 
      name, 
      amount,
      percent: totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : 0
    }));
  }, [filteredExpenses, totalSpent]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-gray-800/40 p-4 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center text-gray-400 mr-2">
          <Filter size={18} className="mr-2" />
          <span className="text-sm font-bold uppercase tracking-wider">Filter</span>
        </div>
        
        <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
          {(['all', 'week', 'month', 'custom'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-tighter ${
                filterType === type ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {filterType === 'custom' && (
          <div className="flex items-center space-x-2 animate-in slide-in-from-left-2 duration-300">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-500"
            />
            <span className="text-gray-500 text-xs">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-yellow-500"
            />
          </div>
        )}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-3xl backdrop-blur-sm">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Total Spending</p>
          <h3 className="text-3xl font-black text-white">₹{totalSpent.toFixed(2)}</h3>
          <p className="text-[10px] text-gray-600 mt-2 uppercase">Based on {filteredExpenses.length} records</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-3xl backdrop-blur-sm">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Avg. Per Record</p>
          <h3 className="text-3xl font-black text-yellow-500">
            ₹{filteredExpenses.length > 0 ? (totalSpent / filteredExpenses.length).toFixed(2) : '0.00'}
          </h3>
          <p className="text-[10px] text-gray-600 mt-2 uppercase">Record efficiency</p>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-3xl backdrop-blur-sm">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">Top Spender</p>
          <h3 className="text-xl font-black text-white truncate">
            {memberSpendingData.length > 0 ? memberSpendingData.sort((a, b) => b.amount - a.amount)[0].name : 'N/A'}
          </h3>
          <p className="text-[10px] text-gray-600 mt-2 uppercase">Contribution leader</p>
        </div>
      </div>

      <div className="bg-gray-800/40 border border-gray-700/50 p-8 rounded-3xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-lg font-bold flex items-center text-gray-200">
            <Users size={18} className="mr-2 text-yellow-500" />
            Spending by Member
          </h4>
          
          <div className="flex bg-gray-900 rounded-xl p-1 border border-gray-700">
            <button
              onClick={() => setChartView('bar')}
              className={`p-2 rounded-lg transition-all ${
                chartView === 'bar' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Bar Chart"
            >
              <BarChart3 size={16} />
            </button>
            <button
              onClick={() => setChartView('pie')}
              className={`p-2 rounded-lg transition-all ${
                chartView === 'pie' ? 'bg-yellow-500 text-black' : 'text-gray-500 hover:text-gray-300'
              }`}
              title="Pie Chart"
            >
              <PieIcon size={16} />
            </button>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartView === 'bar' ? (
              <BarChart data={memberSpendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#0a0a0a', 
                    border: '1px solid #eab308', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#eab308', fontWeight: '900', fontSize: '14px' }}
                  formatter={(value, name, props: any) => [`₹${value} (${props.payload.percent}%)`, name]}
                />
                <Bar dataKey="amount" fill="#eab308" radius={[10, 10, 0, 0]} barSize={50} />
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={memberSpendingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={5}
                  dataKey="amount"
                >
                  {memberSpendingData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0a0a', 
                    border: '1px solid #eab308', 
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#eab308', fontWeight: '900', fontSize: '14px' }}
                  formatter={(value, name, props) => [`₹${value} (${props.payload.percent}%)`, name]}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  wrapperStyle={{ paddingLeft: '30px', fontSize: '12px' }}
                  formatter={(value, entry) => (
                    <span className="text-gray-400 font-bold">
                      {value} <span className="text-gray-600 ml-1 text-[10px]">({(entry.payload as any).percent}%)</span>
                    </span>
                  )}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* "Pivot View" - Detailed Table */}
      <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-gray-700/50 bg-gray-900/20">
          <h4 className="text-lg font-bold flex items-center text-gray-200">
            <BarChart3 size={18} className="mr-2 text-yellow-500" />
            Spending Pivot View
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-900/50 text-gray-500 uppercase text-[10px] font-black tracking-widest">
                <th className="px-6 py-4">Title</th>
                <th className="px-6 py-4">Paid By</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-white font-bold group-hover:text-yellow-500 transition-colors">{exp.title}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {exp.paid_by_profile?.full_name || exp.paid_by_profile?.email}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(exp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right font-black text-white">
                    ₹{exp.total_amount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 italic">
                    No records found for the selected period.
                  </td>
                </tr>
              )}
            </tbody>
            {filteredExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-gray-900/30">
                  <td colSpan={3} className="px-6 py-4 text-right text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total</td>
                  <td className="px-6 py-4 text-right font-black text-yellow-500 text-lg">₹{totalSpent.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
