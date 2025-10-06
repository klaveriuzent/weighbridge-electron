import React from 'react';
import { Button, Table } from 'antd';

export default function App() {
    const data = [
        { key: 1, name: 'TBS 1', weight: 2850 },
        { key: 2, name: 'TBS 2', weight: 3100 },
    ];

    const columns = [
        { title: 'Nama', dataIndex: 'name' },
        { title: 'Berat (kg)', dataIndex: 'weight' },
    ];

    return (
        <div style={{ padding: 24 }}>
            <h2>Weighbridge App (React + Ant Design)</h2>
            <Button type="primary" style={{ marginBottom: 12 }}>
                Tambah Data
            </Button>
            <Table columns={columns} dataSource={data} pagination={false} />
        </div>
    );
}
