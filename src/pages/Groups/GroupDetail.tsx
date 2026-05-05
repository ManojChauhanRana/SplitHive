import { ArrowLeft, Plus, Receipt, Calendar, TrendingUp, TrendingDown, CheckCircle2, Image as ImageIcon, X, ExternalLink, UserX, UserCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GroupService } from '../../services/group';
import { ExpenseService } from '../../services/expense';
import { BalanceService, UserBalance } from '../../services/balance';
import { SettlementService } from '../../services/settlement';
import { useAuth } from '../../contexts/AuthContext';
import { parseExpenseDescription } from '../../lib/expenseDescription';
import { GroupAnalytics } from './GroupAnalytics';

export const GroupDetail: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<any | null>(null);
  const [settleData, setSettleData] = useState({ payerId: '', receiverId: '', amount: 0 });
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [balances, setBalances] = useState<UserBalance[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expenses' | 'analytics'>('expenses');
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const { user } = useAuth();

  const showMessage = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 5000);
  };

  useEffect(() => {
    if (groupId) {
      fetchData();
    }
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allGroups = await GroupService.getGroups();
      const currentGroup = allGroups.find(g => g.id === groupId);
      setGroup(currentGroup);

      const expenseData = await ExpenseService.getGroupExpenses(groupId!);
      setExpenses(expenseData);

      const balanceData = await BalanceService.getGroupBalances(groupId!);
      setBalances(balanceData);

      const inviteData = await GroupService.getPendingInvites(groupId!);
      console.log("Invite data received in component:", inviteData);
      setPendingInvites(inviteData.filter((invite: any) => invite.status === 'pending'));

      const settlementData = await SettlementService.getGroupSettlements(groupId!);
      setSettlements(settlementData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSettleUp = async () => {
    if (!settleData.payerId || !settleData.receiverId || settleData.amount <= 0) return;
    setSettleLoading(true);
    setSettleError(null);
    try {
      await SettlementService.createSettlement({
        groupId: groupId!,
        payerId: settleData.payerId,
        receiverId: settleData.receiverId,
        amount: settleData.amount
      });
      setIsSettleModalOpen(false);
      setSettleData({ payerId: '', receiverId: '', amount: 0 });
      fetchData();
    } catch (error: any) {
      console.error('Error settling up:', error);
      setSettleError(error.message || 'Failed to record payment');
    } finally {
      setSettleLoading(false);
    }
  };

  const handleInvite = async () => {
    console.log("handleInvite called with email:", inviteEmail);
    if (!inviteName.trim()) {
      setInviteError("Please enter the member's name");
      return;
    }
    if (!inviteEmail.trim()) {
      setInviteError("Please enter an email address");
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      const result: any = await GroupService.addMemberByEmail(groupId!, inviteEmail, inviteName);
      console.log("Invitation result:", result);
      
      if (result.status === 'invited') {
        showMessage(`Invite sent! ${inviteName} will receive an email to join this Hive and set their password.`);
      } else if (result.status === 'already_member') {
        setInviteError("This user is already a member of this group.");
        setInviteLoading(false);
        return;
      } else if (result.status === 'already_invited') {
        setInviteError("A pending invite already exists for this email.");
        setInviteLoading(false);
        return;
      }

      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteName('');
      fetchData();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      setInviteError(error.message || 'Failed to invite member');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleMemberStatus = async (memberUserId: string, currentStatus: boolean) => {
    if (!groupId) return;
    
    // Prevent self-deactivation if they are the creator?
    // Actually, let's just let them do it for now, or add a check.
    if (memberUserId === user?.id && currentStatus) {
      if (!confirm("Are you sure you want to deactivate yourself? You won't be able to add expenses to this group until you're reactivated by another member.")) {
        return;
      }
    }

    try {
      await GroupService.updateMemberStatus(groupId, memberUserId, !currentStatus);
      fetchData();
    } catch (error) {
      console.error('Error toggling member status:', error);
      showMessage('Failed to update member status', 'error');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!group) return <div>Group not found</div>;

  const expensesWithMeta = expenses.map((expense) => ({
    ...expense,
    parsedDescription: parseExpenseDescription(expense.description),
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {actionMessage && (
        <div className={`p-4 rounded-2xl text-sm font-medium flex justify-between items-center animate-in fade-in slide-in-from-top-4 ${actionMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="p-1 hover:bg-black/20 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/groups')}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{group.name}</h1>
            <div className="flex items-center space-x-3 mt-1">
              <span className="text-xs text-gray-500 flex items-center">
                <Calendar size={12} className="mr-1" />
                Created {new Date(group.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setIsSettleModalOpen(true)}
            className="px-6 py-3 bg-gray-800 border border-gray-700 text-white font-bold rounded-2xl hover:bg-gray-700 transition-all flex items-center"
          >
            <CheckCircle2 size={18} className="mr-2 text-green-500" />
            Settle Up
          </button>
          <Link to={`/groups/${groupId}/add`}>
            <Button className="flex items-center space-x-2">
              <Plus size={18} />
              <span>Add Expense</span>
            </Button>
          </Link>
      </div>
    </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-8 py-4 text-sm font-black transition-all border-b-2 uppercase tracking-widest ${
            activeTab === 'expenses' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Expenses
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-8 py-4 text-sm font-black transition-all border-b-2 uppercase tracking-widest ${
            activeTab === 'analytics' 
              ? 'border-yellow-500 text-yellow-500' 
              : 'border-transparent text-gray-500 hover:text-gray-300'
          }`}
        >
          Report & Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        <GroupAnalytics expenses={expenses} members={balances} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold flex items-center text-gray-300">
            <Receipt size={20} className="mr-2" />
            Recent Expenses
          </h2>
          
          {expenses.length === 0 ? (
            <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-3xl py-12 text-center text-gray-500">
              No expenses recorded in this group yet.
            </div>
          ) : (
            <div className="space-y-3">
              {expensesWithMeta.map((expense) => (
                <div 
                  key={expense.id}
                  className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-2xl flex items-center justify-between hover:bg-gray-800 transition-all group cursor-pointer"
                  onClick={() => setSelectedExpense(expense)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl text-yellow-500">
                      <Receipt size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white flex items-center">
                        {expense.title}
                        {expense.image_url && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReceiptUrl(expense.image_url);
                            }}
                            className="ml-2 p-1 text-gray-500 hover:text-yellow-500 transition-colors"
                            title="View Receipt"
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Paid by {expense.paid_by_profile?.email === user?.email ? 'You' : (expense.paid_by_profile?.full_name || expense.paid_by_profile?.email)}
                      </p>
                      {(expense.parsedDescription.lineItems.length > 0 || expense.parsedDescription.notes) && (
                        <p className="text-[11px] text-gray-500 mt-1">
                          {expense.parsedDescription.lineItems.length > 0
                            ? `${expense.parsedDescription.lineItems.length} line item${expense.parsedDescription.lineItems.length === 1 ? '' : 's'}`
                            : expense.parsedDescription.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-white">₹{expense.total_amount.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(expense.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-4">
            <h2 className="text-xl font-bold flex items-center text-gray-300">
              <CheckCircle2 size={20} className="mr-2" />
              Recent Settlements
            </h2>
            
            {settlements.length === 0 ? (
              <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-3xl py-8 text-center text-gray-500">
                No settlements recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {settlements.map((s) => (
                  <div 
                    key={s.id}
                    className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="bg-gray-900 border border-gray-700 p-2.5 rounded-xl text-green-500">
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {s.payer?.id === user?.id ? 'You' : (s.payer?.full_name || s.payer?.email)} settled with {s.receiver?.id === user?.id ? 'You' : (s.receiver?.full_name || s.receiver?.email)}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          Recorded by {s.creator?.id === user?.id ? 'You' : (s.creator?.full_name || s.creator?.email)} • {new Date(s.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">₹{s.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Total Spent</span>
                <span className="text-white font-bold">
                  ₹{expenses.reduce((acc, curr) => acc + curr.total_amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Expenses</span>
                <span className="text-white font-bold">{expenses.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Balances</h3>
            <div className="space-y-4">
              {balances.map(b => (
                <div key={b.user_id} className={`flex items-center justify-between p-2 rounded-xl transition-all ${!b.is_active ? 'opacity-50 grayscale bg-gray-900/50' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-yellow-500/20 uppercase ${!b.is_active ? 'bg-gray-800 text-gray-500' : 'bg-gray-700 text-yellow-500'}`}>
                      {b.full_name[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-300 font-medium flex items-center">
                        {b.user_id === user?.id ? 'You' : b.full_name}
                        {!b.is_active && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-tighter">
                            Inactive
                          </span>
                        )}
                      </span>
                      {b.added_by_name && (
                        <p className="text-[10px] text-gray-500">
                          Added by {b.added_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className={`text-sm font-bold flex items-center ${b.net_balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {b.net_balance >= 0 ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
                      ₹{Math.abs(b.net_balance).toFixed(2)}
                    </div>
                    
                    <button
                      onClick={() => handleToggleMemberStatus(b.user_id, b.is_active)}
                      className={`p-1.5 rounded-lg transition-all ${b.is_active ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10' : 'text-gray-500 hover:text-green-400 hover:bg-green-400/10'}`}
                      title={b.is_active ? 'Deactivate Member' : 'Activate Member'}
                    >
                      {b.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-6 text-xs bg-transparent border-gray-700 hover:bg-gray-700/50"
              onClick={() => {
                console.log("Opening invite modal");
                setInviteError(null);
                setIsInviteModalOpen(true);
              }}
            >
              <Plus size={14} className="mr-1" />
              Invite Member
            </Button>
          </div>

          <div className="bg-gray-800/50 border border-gray-700/50 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Invite Status</h3>
            {pendingInvites.length === 0 ? (
              <p className="text-sm text-gray-500">No pending invites right now.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between rounded-2xl bg-gray-900/40 border border-gray-800 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{invite.email}</p>
                      <p className="text-[11px] text-gray-500">
                        Invited {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
      {isSettleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-6">Settle Up</h3>
            
            <div className="space-y-6">
              {settleError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium">
                  {settleError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Payer</label>
                <select 
                  value={settleData.payerId}
                  onChange={(e) => setSettleData({...settleData, payerId: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 transition-all outline-none"
                >
                  <option value="">Select Payer</option>
                  {balances.map(b => (
                    <option key={b.user_id} value={b.user_id}>
                      {b.full_name} {!b.is_active ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Receiver</label>
                <select 
                  value={settleData.receiverId}
                  onChange={(e) => setSettleData({...settleData, receiverId: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 transition-all outline-none"
                >
                  <option value="">Select Receiver</option>
                  {balances.map(b => (
                    <option key={b.user_id} value={b.user_id}>
                      {b.full_name} {!b.is_active ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Amount</label>
                <input 
                  type="number"
                  value={settleData.amount || ''}
                  onChange={(e) => setSettleData({...settleData, amount: parseFloat(e.target.value)})}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 transition-all outline-none"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <button 
                  onClick={() => setIsSettleModalOpen(false)}
                  className="flex-1 px-6 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSettleUp}
                  disabled={settleLoading}
                  className="flex-1 px-6 py-3 bg-green-500 text-black font-black rounded-xl hover:scale-105 transition-all shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:hover:scale-100"
                >
                  {settleLoading ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-auto bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl p-8">
            <button
              onClick={() => setSelectedExpense(null)}
              className="absolute top-4 right-4 p-2 bg-gray-800/80 text-white rounded-full hover:bg-red-500 transition-all"
            >
              <X size={18} />
            </button>

            <div className="pr-12">
              <h3 className="text-2xl font-black text-white">{selectedExpense.title}</h3>
              <p className="text-sm text-gray-500 mt-2">
                Paid by {selectedExpense.paid_by_profile?.email === user?.email ? 'You' : (selectedExpense.paid_by_profile?.full_name || selectedExpense.paid_by_profile?.email)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Recorded by {selectedExpense.created_by_profile?.email === user?.email ? 'You' : (selectedExpense.created_by_profile?.full_name || selectedExpense.created_by_profile?.email)}
              </p>
              <p className="text-lg font-bold text-yellow-400 mt-4">₹{selectedExpense.total_amount.toFixed(2)}</p>
            </div>

            {selectedExpense.image_url && (
              <button
                onClick={() => setSelectedReceiptUrl(selectedExpense.image_url)}
                className="mt-6 w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-950"
              >
                <img
                  src={selectedExpense.image_url}
                  alt="Receipt"
                  className="w-full max-h-72 object-cover"
                />
              </button>
            )}

            {(selectedExpense.parsedDescription.notes || selectedExpense.parsedDescription.lineItems.length > 0) && (
              <div className="mt-6 space-y-4">
                {selectedExpense.parsedDescription.notes && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Invoice Details</h4>
                    <p className="text-sm text-gray-300">{selectedExpense.parsedDescription.notes}</p>
                  </div>
                )}

                {selectedExpense.parsedDescription.lineItems.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Products</h4>
                    <div className="space-y-3">
                      {selectedExpense.parsedDescription.lineItems.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-800/40 px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{item.name}</p>
                            <p className="text-[11px] text-gray-500">Qty {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-white">₹{Number(item.amount).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <a 
                href={selectedReceiptUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-gray-800/80 text-white rounded-full hover:bg-gray-700 transition-all"
                title="Open in new tab"
              >
                <ExternalLink size={20} />
              </a>
              <button 
                onClick={() => setSelectedReceiptUrl(null)}
                className="p-2 bg-gray-800/80 text-white rounded-full hover:bg-red-500 transition-all font-bold"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="w-full h-full overflow-auto p-4 flex items-center justify-center min-h-[400px]">
              <img 
                src={selectedReceiptUrl} 
                alt="Receipt" 
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
            
            <div className="bg-gray-800/50 p-4 border-t border-gray-700 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-400">Receipt Image</span>
              <button 
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-xs font-bold text-yellow-500 hover:text-yellow-400 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-white mb-2">Invite Member</h3>
            <p className="text-gray-500 text-sm mb-6">Enter their name and email to add them to this hive.</p>
            
            <div className="space-y-6">
              {inviteError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-1">
                  {inviteError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text"
                  value={inviteName}
                  onChange={(e) => {
                    setInviteName(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  placeholder="John Doe"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 transition-all outline-none"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest">Email Address</label>
                <input 
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError(null);
                  }}
                  placeholder="friend@example.com"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 transition-all outline-none"
                />
              </div>

              <div className="flex space-x-4">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsInviteModalOpen(false);
                  }}
                  className="flex-1 px-6 py-3 bg-gray-800 text-gray-300 font-bold rounded-xl hover:bg-gray-700 transition-all cursor-pointer"
                  disabled={inviteLoading}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("INVITE BUTTON CLICKED - START");
                    handleInvite();
                  }}
                  disabled={inviteLoading}
                  className={`flex-1 px-6 py-3 font-black rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                    inviteLoading 
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:scale-105 active:scale-95 shadow-lg shadow-yellow-500/20'
                  }`}
                >
                  {inviteLoading ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : null}
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
