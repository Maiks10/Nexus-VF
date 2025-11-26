import React, { useState } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export function TopBar() {
    const [selectedAccount, setSelectedAccount] = useState('Conta Principal (001)');
    const [notifications, setNotifications] = useState(3);

    const accounts = [
        'Conta Principal (001)',
        'Lançamento Agosto (002)',
        'Perpétuo (003)'
    ];

    return (
        <div className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between px-8 mb-8">
            <div className="flex items-center gap-4">
                <span className="text-gray-400 text-sm">Conta de Anúncios:</span>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10 min-w-[200px] justify-between">
                            {selectedAccount}
                            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-white/10 text-white">
                        {accounts.map((acc) => (
                            <DropdownMenuItem
                                key={acc}
                                className="hover:bg-white/10 cursor-pointer"
                                onClick={() => setSelectedAccount(acc)}
                            >
                                {acc}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" className="relative text-gray-300 hover:text-white hover:bg-white/10">
                    <Bell className="w-5 h-5" />
                    {notifications > 0 && (
                        <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs p-0 rounded-full">
                            {notifications}
                        </Badge>
                    )}
                </Button>
                <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        MK
                    </div>
                </div>
            </div>
        </div>
    );
}
