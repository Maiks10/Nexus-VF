import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const mockData = [
    { name: 'Seg', sales: 4000, ads: 2400 },
    { name: 'Ter', sales: 3000, ads: 1398 },
    { name: 'Qua', sales: 2000, ads: 9800 },
    { name: 'Qui', sales: 2780, ads: 3908 },
    { name: 'Sex', sales: 1890, ads: 4800 },
    { name: 'Sáb', sales: 2390, ads: 3800 },
    { name: 'Dom', sales: 3490, ads: 4300 },
];

export function ROIChart() {
    return (
        <Card className="glass-effect border-white/10 mb-8">
            <CardHeader>
                <CardTitle className="text-white">ROI: Vendas vs Investimento (7 Dias)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={mockData}
                            margin={{
                                top: 5,
                                right: 30,
                                left: 20,
                                bottom: 5,
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="name" stroke="#888" />
                            <YAxis stroke="#888" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="sales" name="Vendas (R$)" stroke="#10b981" activeDot={{ r: 8 }} strokeWidth={2} />
                            <Line type="monotone" dataKey="ads" name="Ads (R$)" stroke="#ef4444" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
