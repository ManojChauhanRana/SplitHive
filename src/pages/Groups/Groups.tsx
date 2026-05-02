import React, { useEffect, useState } from 'react';
import { GroupService } from '../../services/group';
import { Database } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Plus, Users as UsersIcon, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

type Group = Database['public']['Tables']['groups']['Row'];

export const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await GroupService.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreateLoading(true);
    try {
      await GroupService.createGroup(newGroupName);
      setNewGroupName('');
      setIsCreating(false);
      fetchGroups(); // Refresh list
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Your Groups</h1>
          <p className="text-gray-400 mt-1">Manage your shared expenses with ease.</p>
        </div>
        <Button onClick={() => setIsCreating(true)} className="flex items-center space-x-2">
          <Plus size={18} />
          <span>New Group</span>
        </Button>
      </div>

      {isCreating && (
        <div className="bg-gray-800/50 border border-gray-700 p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <Input
                label="Group Name"
                placeholder="e.g. Trip to Hawaii, Monthly Rent"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsCreating(false)}
                disabled={createLoading}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={createLoading}>
                Create Group
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-yellow-500" size={32} />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-gray-800/30 border border-dashed border-gray-700 rounded-3xl py-20 px-4 text-center">
          <div className="bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UsersIcon size={32} className="text-gray-500" />
          </div>
          <h3 className="text-xl font-semibold text-white">No groups yet</h3>
          <p className="text-gray-500 mt-2 max-w-sm mx-auto">
            Create a group to start adding expenses and splitting bills with your friends.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setIsCreating(true)}>
            Create your first group
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link 
              to={`/groups/${group.id}`}
              key={group.id}
              className="group bg-gray-800/50 border border-gray-700/50 p-6 rounded-2xl hover:border-yellow-500/50 hover:bg-gray-800 transition-all cursor-pointer shadow-xl text-left block"
            >
              <div className="flex items-start justify-between">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-3 rounded-xl shadow-lg">
                  <UsersIcon size={24} className="text-gray-900" />
                </div>
                <ChevronRight className="text-gray-600 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all" />
              </div>
              <div className="mt-6">
                <h3 className="text-xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                  {group.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Created {new Date(group.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-700/50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-900 bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                      U{i}
                    </div>
                  ))}
                </div>
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded">
                  All settled up
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
