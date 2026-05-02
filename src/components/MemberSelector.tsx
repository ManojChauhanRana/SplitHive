import React from 'react';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';

interface Member {
  id: string;
  email: string;
  full_name?: string;
}

interface MemberSelectorProps {
  members: Member[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export const MemberSelector: React.FC<MemberSelectorProps> = ({ members, selectedIds, onChange }) => {
  const toggleMember = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(mid => mid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleAll = () => {
    if (selectedIds.length === members.length) {
      onChange([]);
    } else {
      onChange(members.map(m => m.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300 ml-1">
          Split with members
        </label>
        <button 
          type="button"
          onClick={toggleAll}
          className="text-xs text-yellow-500 hover:text-yellow-400 font-semibold"
        >
          {selectedIds.length === members.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {members.map((member) => {
          const isSelected = selectedIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => toggleMember(member.id)}
              className={clsx(
                "flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                isSelected 
                  ? "bg-yellow-500/10 border-yellow-500/50 text-white" 
                  : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  isSelected ? "bg-yellow-500 text-gray-900" : "bg-gray-700"
                )}>
                  {member.full_name?.[0].toUpperCase() || member.email[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{member.full_name || member.email}</p>
                  <p className="text-[10px] text-gray-500 truncate">{member.email}</p>
                </div>
              </div>
              <div className={clsx(
                "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                isSelected ? "bg-yellow-500 border-yellow-500" : "bg-transparent border-gray-600"
              )}>
                {isSelected && <Check size={12} className="text-gray-900" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
