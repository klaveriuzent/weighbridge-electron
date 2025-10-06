import React from 'react';
import { Button } from 'antd';
import { SettingOutlined } from '@ant-design/icons';

export default function HeaderBar() {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'white' }}>
            <h3 style={{ color: 'white', margin: 0 }}>Weighbridge App</h3>
            <Button type="text" icon={<SettingOutlined />} style={{ color: 'white' }}>
                Pengaturan
            </Button>
        </div>
    );
}
