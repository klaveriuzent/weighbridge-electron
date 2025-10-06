import React from 'react';
import WeightTable from '../components/WeightTable.jsx';
import { Button } from 'antd';

export default function Dashboard() {
    return (
        <div>
            <Button type="primary" style={{ marginBottom: 16 }}>
                Tambah Timbangan
            </Button>
            <WeightTable />
        </div>
    );
}
