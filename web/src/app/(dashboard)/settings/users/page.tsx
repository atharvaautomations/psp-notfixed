'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';

import { Header, PageContainer, Card, CardContent } from '@/components/global';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import {
  useUsers,
  useCreateUser,
  useSetUserActive,
  UserRole,
} from '@/hooks/useUsers';

function formatRole(role: string) {
  return role
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function UsersPage() {
  const { data: users = [], isLoading } = useUsers();

  const { mutateAsync: createUser, isPending: creating } = useCreateUser();

  const { mutate: setUserActive } = useSetUserActive();

  const [openCreate, setOpenCreate] = useState(false);

  const [username, setUsername] = useState('');

  const [name, setName] = useState('');

  const [password, setPassword] = useState('');

  const [role, setRole] = useState<UserRole | ''>('');

  const [error, setError] = useState('');

  async function handleCreateUser() {
    setError('');

    if (!username.trim() || !name.trim() || !password || !role) {
      setError('Please fill all fields');
      return;
    }

    try {
      await createUser({
        username: username.trim(),
        name: name.trim(),
        password,
        role,
      });

      setUsername('');
      setName('');
      setPassword('');
      setRole('');
      setOpenCreate(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create user');
    }
  }

  return (
    <PageContainer>
      <Header
        title="User Management"
        description="Create and manage MES user accounts"
        icon="👥"
      />

      <div className="flex justify-end mb-6">
        <Button onClick={() => setOpenCreate(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Name
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Username
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Role
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-gray-600">
                    Last Login
                  </th>

                  <th className="px-6 py-3 text-right font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {user.name}
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {user.username}
                      </td>

                      <td className="px-6 py-4">{formatRole(user.role)}</td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-600">
                        {user.lastLoginAt
                          ? new Date(user.lastLoginAt).toLocaleString()
                          : 'Never'}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {user.role !== 'SUPER_ADMIN' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setUserActive({
                                id: user.id,
                                isActive: !user.isActive,
                              })
                            }
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={openCreate}
        onOpenChange={(open) => {
          setOpenCreate(open);

          if (!open) {
            setError('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>

              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter user name"
              />
            </div>

            <div className="space-y-2">
              <Label>Username</Label>

              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>

              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>

              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="STORES">Stores</SelectItem>

                  <SelectItem value="RUBBER_TECHNOLOGIST">
                    Rubber Technologist
                  </SelectItem>

                  <SelectItem value="OPERATOR">Operator</SelectItem>

                  <SelectItem value="QUALITY_CONTROL">
                    Quality Control
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Cancel
            </Button>

            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
