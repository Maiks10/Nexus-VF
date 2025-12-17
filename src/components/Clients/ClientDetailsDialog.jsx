// src/components/Clients/ClientDetailsDialog.jsx
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlatformIcon } from './ClientsTable'; // Vamos exportar este componente depois

export function ClientDetailsDialog({ isOpen, onClose, client }) {
  if (!client) {
    return null;
  }

  // Tags vem do banco como array
  const tags = client.tags || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md glass-effect border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
              {client.name ? client.name.charAt(0).toUpperCase() : '?'}
            </div>
            {client.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400 pt-2">
            Detalhes do contato e histórico de etiquetas.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm">
            <strong className="text-gray-400">Email:</strong>
            <p className="text-white">{client.email || 'Não informado'}</p>
          </div>
          <div className="text-sm">
            <strong className="text-gray-400">Telefone:</strong>
            <p className="text-white">{client.phone || 'Não informado'}</p>
          </div>
          <div className="text-sm">
            <strong className="text-gray-400">Valor Acumulado:</strong>
            <p className="text-green-400 font-bold">R$ {client.value?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="text-sm">
            <strong className="text-gray-400">Cadastrado em:</strong>
            <p className="text-white">{new Date(client.created_at).toLocaleString('pt-BR')}</p>
          </div>
          <div className="text-sm">
            <strong className="text-gray-400">Origem:</strong>
            <div className="flex items-center gap-2 capitalize mt-1">
              <PlatformIcon platform={client.platform} />
              <span className="text-white">{client.platform || 'Manual'}</span>
            </div>
          </div>

          <div>
            <strong className="text-gray-400 text-sm">Etiquetas:</strong>
            <div className="flex flex-wrap gap-2 mt-2">
              {tags.length > 0 ? (
                tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">{tag}</Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">Nenhuma etiqueta aplicada.</p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}