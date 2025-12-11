import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { polysApi } from '@/api/polysClient';
import { useSelectedZone } from '@/contexts/SelectedZoneContext';
import { 
  Heart, MessageCircle, Share2, Flag, MoreHorizontal, 
  Plus, Send, Trash2, Edit, Pin, Clock, MapPin,
  Newspaper, Search, Filter
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function News() {
  const queryClient = useQueryClient();
  const { selectedZone } = useSelectedZone();
  const [selectedNews, setSelectedNews] = useState(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [newComment, setNewComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Form state para criar notícia
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    imageUrl: '',
    isPublished: true,
    isPinned: false,
  });

  // Buscar usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: polysApi.users.me,
  });

  const isAdmin = currentUser?.role === 'ADMIN';
  const isManager = currentUser?.role === 'GESTOR' || currentUser?.role === 'MANAGER';
  const canCreate = isAdmin || isManager;

  // Buscar notícias
  const { data: news = [], isLoading } = useQuery({
    queryKey: ['news', selectedZone?.id],
    queryFn: () => polysApi.news.list({ zoneId: selectedZone?.id }),
  });

  // Buscar comentários
  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ['newsComments', selectedNews?.id],
    queryFn: () => polysApi.news.getComments(selectedNews.id),
    enabled: !!selectedNews?.id,
  });

  // Mutations
  const createNewsMutation = useMutation({
    mutationFn: polysApi.news.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['news']);
      setIsCreateDialogOpen(false);
      setFormData({ title: '', content: '', summary: '', imageUrl: '', isPublished: true, isPinned: false });
      toast.success('Notícia publicada com sucesso!');
    },
    onError: () => toast.error('Erro ao publicar notícia'),
  });

  const likeMutation = useMutation({
    mutationFn: (newsId) => polysApi.news.like(newsId),
    onSuccess: () => queryClient.invalidateQueries(['news']),
  });

  const unlikeMutation = useMutation({
    mutationFn: (newsId) => polysApi.news.unlike(newsId),
    onSuccess: () => queryClient.invalidateQueries(['news']),
  });

  const addCommentMutation = useMutation({
    mutationFn: ({ newsId, content }) => polysApi.news.addComment(newsId, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['newsComments', selectedNews?.id]);
      queryClient.invalidateQueries(['news']);
      setNewComment('');
      toast.success('Comentário adicionado!');
    },
  });

  const reportMutation = useMutation({
    mutationFn: ({ newsId, reason, description }) => 
      polysApi.news.report(newsId, reason, description),
    onSuccess: () => {
      setIsReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
      toast.success('Denúncia enviada com sucesso');
    },
  });

  const deleteNewsMutation = useMutation({
    mutationFn: (newsId) => polysApi.news.delete(newsId),
    onSuccess: () => {
      queryClient.invalidateQueries(['news']);
      setSelectedNews(null);
      toast.success('Notícia removida');
    },
  });

  // Handlers
  const handleLike = (item) => {
    if (item.isLikedByMe) {
      unlikeMutation.mutate(item.id);
    } else {
      likeMutation.mutate(item.id);
    }
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ newsId: selectedNews.id, content: newComment });
  };

  const handleCreateNews = (e) => {
    e.preventDefault();
    createNewsMutation.mutate({
      ...formData,
      zoneId: selectedZone?.id,
    });
  };

  const handleReport = () => {
    if (!reportReason) {
      toast.error('Selecione um motivo');
      return;
    }
    reportMutation.mutate({
      newsId: selectedNews.id,
      reason: reportReason,
      description: reportDescription,
    });
  };

  // Filtrar notícias
  const filteredNews = news.filter(item => 
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <Newspaper className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Informações</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Notícias e atualizações da comunidade
            </p>
          </div>
        </div>

        {canCreate && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                <Plus className="h-4 w-4" />
                Nova Notícia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Publicar Notícia</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateNews} className="space-y-4">
                <div>
                  <Label>Título</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Título da notícia..."
                    required
                  />
                </div>
                <div>
                  <Label>Resumo (opcional)</Label>
                  <Input
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    placeholder="Breve resumo..."
                  />
                </div>
                <div>
                  <Label>URL da Imagem (opcional)</Label>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escreva o conteúdo da notícia..."
                    rows={8}
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isPublished}
                        onCheckedChange={(v) => setFormData({ ...formData, isPublished: v })}
                      />
                      <Label>Publicar</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.isPinned}
                        onCheckedChange={(v) => setFormData({ ...formData, isPinned: v })}
                      />
                      <Label>Fixar no topo</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createNewsMutation.isPending}>
                    {createNewsMutation.isPending ? 'Publicando...' : 'Publicar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar notícias..."
            className="pl-10"
          />
        </div>
      </div>

      {/* News List */}
      {filteredNews.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Newspaper className="h-16 w-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
              Nenhuma notícia encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm 
                ? 'Tente buscar por outros termos' 
                : 'Quando houver notícias da sua área, elas aparecerão aqui.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredNews.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={item.author?.avatarUrl} />
                      <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                        {item.author?.name?.[0]?.toUpperCase() || 'A'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {item.author?.name || 'Administrador'}
                        </span>
                        {item.isPinned && (
                          <Pin className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(item.createdAt)}
                        {item.zoneName && (
                          <>
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs py-0">
                              <MapPin className="h-3 w-3 mr-1" />
                              {item.zoneName}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(canCreate || item.authorId === currentUser?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>

              {/* Image */}
              {item.imageUrl && (
                <div className="px-4">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}

              {/* Content */}
              <CardContent className="pt-3">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 line-clamp-3">
                  {item.summary || item.content}
                </p>
              </CardContent>

              {/* Actions */}
              <CardFooter className="border-t dark:border-slate-700 pt-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 ${item.isLikedByMe ? 'text-red-500' : ''}`}
                      onClick={() => handleLike(item)}
                    >
                      <Heart className={`h-4 w-4 ${item.isLikedByMe ? 'fill-current' : ''}`} />
                      {item.likesCount > 0 && item.likesCount}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      onClick={() => setSelectedNews(item)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {item.commentsCount > 0 && item.commentsCount}
                    </Button>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedNews(item);
                        setIsReportDialogOpen(true);
                      }}
                    >
                      <Flag className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* News Detail Dialog */}
      <Dialog open={!!selectedNews && !isReportDialogOpen} onOpenChange={(open) => !open && setSelectedNews(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          {selectedNews && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedNews.author?.avatarUrl} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                      {selectedNews.author?.name?.[0]?.toUpperCase() || 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-medium">{selectedNews.author?.name || 'Administrador'}</span>
                    <p className="text-xs text-slate-500">{formatDate(selectedNews.createdAt)}</p>
                  </div>
                </div>
                <DialogTitle className="text-xl">{selectedNews.title}</DialogTitle>
              </DialogHeader>

              <ScrollArea className="max-h-[50vh]">
                {selectedNews.imageUrl && (
                  <img
                    src={selectedNews.imageUrl}
                    alt={selectedNews.title}
                    className="w-full h-48 object-cover rounded-lg mb-4"
                  />
                )}
                <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedNews.content}
                </p>

                <Separator className="my-6" />

                {/* Comments */}
                <div>
                  <h3 className="font-semibold mb-4">
                    Comentários ({selectedNews.commentsCount})
                  </h3>

                  {loadingComments ? (
                    <p className="text-center text-slate-500 py-4">Carregando...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">
                      Nenhum comentário ainda. Seja o primeiro!
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.user?.avatarUrl} />
                            <AvatarFallback>
                              {comment.user?.name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">
                                {comment.user?.name || 'Usuário'}
                              </span>
                              <span className="text-xs text-slate-500">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Comment */}
                  <form onSubmit={handleSubmitComment} className="flex gap-2 mt-4">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={addCommentMutation.isPending}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Button
                    variant={selectedNews.isLikedByMe ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleLike(selectedNews)}
                    className={selectedNews.isLikedByMe ? 'bg-red-500 hover:bg-red-600' : ''}
                  >
                    <Heart className={`h-4 w-4 mr-2 ${selectedNews.isLikedByMe ? 'fill-current' : ''}`} />
                    {selectedNews.likesCount} Curtidas
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsReportDialogOpen(true)}
                  >
                    <Flag className="h-4 w-4 mr-2" />
                    Reportar
                  </Button>
                  {(isAdmin || selectedNews.authorId === currentUser?.id) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm('Tem certeza que deseja excluir esta notícia?')) {
                          deleteNewsMutation.mutate(selectedNews.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Notícia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da denúncia</Label>
              <Select value={reportReason} onValueChange={setReportReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um motivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conteúdo inadequado">Conteúdo inadequado</SelectItem>
                  <SelectItem value="Informação falsa">Informação falsa</SelectItem>
                  <SelectItem value="Spam">Spam</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Descreva o motivo da denúncia..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReport} disabled={reportMutation.isPending}>
              {reportMutation.isPending ? 'Enviando...' : 'Enviar Denúncia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

