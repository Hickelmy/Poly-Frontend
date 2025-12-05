import React, { useState, useEffect } from 'react';
import { polysApi } from '@/api/polysClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, Search, UserCog, Shield, HelpCircle,
  MoreVertical, Edit, Trash2, UserPlus, Filter
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const roleLabels = {
  usuario: 'Usuário',
  administrador: 'Administrador',
  gestor: 'Gestor',
  suporte: 'Suporte'
};

const roleColors = {
  usuario: 'bg-slate-100 text-slate-700',
  administrador: 'bg-blue-100 text-blue-700',
  gestor: 'bg-purple-100 text-purple-700',
  suporte: 'bg-green-100 text-green-700'
};

export default function UserManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await polysApi.auth.me();
        if (userData.user_role !== 'gestor') {
          toast.error('Acesso negado');
          window.history.back();
          return;
        }
        setCurrentUser(userData);
      } catch (e) {
        polysApi.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  // Fetch all users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => polysApi.entities.User.list('-created_date', 500),
    enabled: !!currentUser,
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      await polysApi.entities.User.update(userId, { user_role: newRole });
      
      // Create audit log
      await polysApi.entities.AuditLog.create({
        user_id: currentUser.id,
        user_email: currentUser.email,
        action: 'update_user_role',
        entity: 'User',
        entity_id: userId,
        details: { new_role: newRole }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['allUsers']);
      toast.success('Cargo atualizado com sucesso');
      setEditUserOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Erro ao atualizar cargo');
    }
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.user_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Count by role
  const adminCount = users.filter(u => u.user_role === 'administrador').length;
  const supportCount = users.filter(u => u.user_role === 'suporte').length;
  const userCount = users.filter(u => u.user_role === 'usuario' || !u.user_role).length;

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Gestão de Usuários
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os cargos e permissões dos usuários
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-100">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-slate-500">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-sm text-slate-500">Administradores</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <HelpCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{supportCount}</p>
              <p className="text-sm text-slate-500">Suporte</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-100">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{userCount}</p>
              <p className="text-sm text-slate-500">Usuários</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cargos</SelectItem>
                <SelectItem value="usuario">Usuários</SelectItem>
                <SelectItem value="administrador">Administradores</SelectItem>
                <SelectItem value="suporte">Suporte</SelectItem>
                <SelectItem value="gestor">Gestores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>Usuários ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-teal-100 text-teal-700 text-sm">
                            {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.user_role] || roleColors.usuario}>
                        {roleLabels[user.user_role] || 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      {user.created_date && format(new Date(user.created_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedUser(user);
                              setEditUserOpen(true);
                            }}
                          >
                            <UserCog className="w-4 h-4 mr-2" />
                            Alterar Cargo
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Cargo do Usuário</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedUser.avatar_url} />
                  <AvatarFallback className="bg-teal-100 text-teal-700">
                    {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.full_name || 'Sem nome'}</p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cargo Atual</Label>
                <Badge className={roleColors[selectedUser.user_role] || roleColors.usuario}>
                  {roleLabels[selectedUser.user_role] || 'Usuário'}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label>Novo Cargo</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <Button
                      key={role}
                      variant={selectedUser.user_role === role ? 'default' : 'outline'}
                      className={selectedUser.user_role === role ? 'bg-teal-600' : ''}
                      onClick={() => {
                        if (role !== selectedUser.user_role) {
                          updateRoleMutation.mutate({ userId: selectedUser.id, newRole: role });
                        }
                      }}
                      disabled={updateRoleMutation.isPending}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                ⚠️ Alterações de cargo serão registradas no log de auditoria
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}