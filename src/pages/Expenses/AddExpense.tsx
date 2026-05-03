import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { GroupService } from '../../services/group';
import { ExpenseService } from '../../services/expense';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MemberSelector } from '../../components/MemberSelector';
import { StorageService } from '../../lib/storage';
import { serializeExpenseDescription, type ExpenseLineItem } from '../../lib/expenseDescription';
import { ArrowLeft, IndianRupee, Plus, Image as ImageIcon, Trash2, X } from 'lucide-react';

export const AddExpense: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lineItems, setLineItems] = useState<ExpenseLineItem[]>([
    { id: crypto.randomUUID(), name: '', quantity: 1, amount: 0 },
  ]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  const fetchGroupDetails = async () => {
    try {
      // First fetch members to populated selector
      const memberData = await GroupService.getGroupMembers(groupId!);
      const formattedMembers = memberData
        .filter((m: any) => m.is_active)
        .map((m: any) => ({
          id: m.user_id,
          email: m.profiles.email,
          full_name: m.profiles.full_name || m.profiles.email
        }));
      setMembers(formattedMembers);
      setSelectedIds(formattedMembers.map((m: any) => m.id)); // Default to split with everyone
      setLoading(false);
    } catch (error) {
      console.error('Error fetching group details:', error);
      navigate('/groups');
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId) return;
    if (!title || lineItemsTotal <= 0 || selectedIds.length === 0) {
      alert('Please fill in all required fields and select at least one member.');
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = '';
      if (selectedFile) {
        imageUrl = await StorageService.uploadExpenseImage(selectedFile);
      }

      await ExpenseService.createExpense({
        groupId,
        paidBy: user.id,
        title,
        description: serializeExpenseDescription(description, lineItems.filter((item) => item.name.trim())),
        totalAmount: lineItemsTotal,
        quantity: 1,
        selectedMemberIds: selectedIds,
        imageUrl,
      });
      navigate(`/groups/${groupId}`);
    } catch (error: any) {
      console.error('Error adding expense:', error);
      alert(error.message || 'Failed to add expense');
    } finally {
      setSubmitting(false);
    }
  };

  const addLineItem = () => {
    setLineItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name: '', quantity: 1, amount: 0 },
    ]);
  };

  const updateLineItem = (id: string, field: keyof ExpenseLineItem, value: string) => {
    setLineItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'quantity' || field === 'amount'
                  ? Number(value || 0)
                  : value,
            }
          : item,
      ),
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((current) =>
      current.length === 1 ? current : current.filter((item) => item.id !== id),
    );
  };

  const trackedItemsCount = lineItems.filter((item) => item.name.trim()).length;
  const lineItemsTotal = lineItems.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.amount || 0),
    0,
  );
  const amount = lineItemsTotal.toFixed(2);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-20">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft size={18} className="mr-2" />
        Back
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Add Expense</h1>
        <div className="bg-yellow-500/10 border border-yellow-500/20 px-4 py-1 rounded-full text-xs font-semibold text-yellow-500">
          Equal Split
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-gray-800/30 border border-gray-700/50 p-8 rounded-3xl space-y-6">
          <Input
            label="Invoice Name"
            placeholder="e.g. Metro Wholesale Invoice, Grocery Bill, Office Supplies"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="relative">
              <Input
                label="Invoice Total"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                readOnly
                className="pl-10"
              />
              <IndianRupee size={16} className="absolute left-3 top-[38px] text-gray-500" />
            </div>
            <Input
              label="Invoice Notes (Optional)"
              placeholder="Add a vendor name, bill number, or extra notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 p-8 rounded-3xl space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white">Invoice Items</h2>
              <p className="text-sm text-gray-400 mt-1">
                Track as many products as you want here. The split still uses the invoice total above.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={addLineItem} className="shrink-0">
              <Plus size={16} className="mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-gray-700/60 bg-gray-900/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-300">Item {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                    disabled={lineItems.length === 1}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <Input
                  label="Item Name"
                  placeholder="e.g. Apples, A4 Sheets, USB Cables"
                  value={item.name}
                  onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                  />

                  <Input
                    label="Line Amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-sm text-gray-400">
              {trackedItemsCount} tracked item{trackedItemsCount === 1 ? '' : 's'}
            </span>
            <div className="text-sm text-right">
              <div className="text-gray-400">Items subtotal</div>
              <div className="text-lg font-bold text-white">₹{lineItemsTotal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 p-8 rounded-3xl">
          <MemberSelector 
            members={members}
            selectedIds={selectedIds}
            onChange={setSelectedIds}
          />
          
          {selectedIds.length > 0 && amount && (
            <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800 flex justify-between items-center">
              <span className="text-sm text-gray-400">Each person owes</span>
              <span className="text-lg font-bold text-green-400">
                ₹{(parseFloat(amount) / selectedIds.length).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        <div className="bg-gray-800/30 border border-gray-700/50 p-8 rounded-3xl">
          <label className="block text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Receipt (Optional)</label>
          
          {previewUrl ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-700 bg-gray-900 group">
              <img src={previewUrl} alt="Receipt preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button"
                  onClick={removeImage}
                  className="bg-red-500 text-white p-3 rounded-full hover:scale-110 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-700 rounded-3xl cursor-pointer hover:border-yellow-500/50 hover:bg-yellow-500/5 transition-all group">
              <ImageIcon size={32} className="text-gray-600 mb-2 group-hover:text-yellow-500 transition-colors" />
              <span className="text-sm font-medium text-gray-500 group-hover:text-gray-300">Click to upload receipt</span>
              <span className="text-[10px] text-gray-600 mt-1">JPG, PNG or PDF</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </label>
          )}
        </div>

        <div className="flex space-x-4 pt-4">
          <Button 
            type="button" 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="flex-[2] py-4 rounded-xl"
            isLoading={submitting}
          >
            Save Expense
          </Button>
        </div>
      </form>
    </div>
  );
};
